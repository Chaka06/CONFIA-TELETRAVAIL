-- ============================================================================
-- 0012 — Nouveau modèle : paiement unique, gain instantané au panier plein
-- ============================================================================
-- Changement d'architecture majeur, validé par l'utilisateur.
--
-- Ancien modèle (0005/0008/0011) : 4 formules à capacité 10 et 5 cotisations
-- par round ; le round démarrait au 10e paiement (échéances 2..5 étalées),
-- le gain était déclenché par date via le cron, une place se libérait ensuite
-- et un "round 2" (bugué, jamais incrémenté) redémarrait.
--
-- Nouveau modèle :
--   - 4 formules, mêmes cotisations (1000/3000/5000/10000 FCFA), mais
--     capacity = 20 et contributions_per_round = 1 (un seul paiement, à
--     l'adhésion). payout_amount reste généré => 20 000 / 60 000 / 100 000 /
--     200 000 FCFA.
--   - Rejoindre = payer immédiatement (occurrence n°1 unique). member_count
--     n'est incrémenté qu'à la confirmation réelle du paiement (anti-survente
--     conservé) ; les réservations impayées <24h comptent dans le calcul de
--     capacité mais jamais comme place occupée.
--   - Dès que le 20e paiement est confirmé, fn_confirm_contribution fait TOUT
--     de façon synchrone : détermine le gagnant (join_order minimal parmi les
--     membres actifs), crée la ligne de gain, passe tous les AUTRES membres
--     actifs en 'cycle_completed', bascule l'instance en 'active' (pleine,
--     gain créé, en attente de confirmation admin), et garantit qu'une
--     instance 'filling' neuve existe pour la formule. Aucune dépendance au
--     cron pour déclencher un gain.
--   - admin_confirm_payout clôt définitivement l'instance ('completed') :
--     pas de round 2, pas de réutilisation des membres restants.
--   - fn_daily_tontine_sweep ne fait plus QUE l'expiration après 24h des
--     réservations (occurrence n°1) jamais payées.
--   - fn_start_round est supprimée (plus aucune raison d'être).
--
-- Décisions de conception (là où le brief laissait le choix) :
--   * membership_status : ajout de 'cycle_completed' pour les non-gagnants
--     d'une instance close (ils doivent rejoindre une NOUVELLE instance pour
--     retenter). Le gagnant reste 'active' jusqu'à confirmation admin, puis
--     passe à 'paid_out_left' (statut existant conservé).
--   * basket_instance_status : ajout de 'completed' (gain confirmé par
--     l'admin). 'active' = pleine + gain créé + en attente admin. 'filling'
--     inchangé. 'paused' n'est PLUS jamais produit (plus de retrait d'un
--     membre d'une instance pleine) — la valeur reste dans l'enum car
--     PostgreSQL ne permet pas de retirer proprement une valeur d'enum sans
--     recréer le type (risqué en prod) ; elle est simplement inutilisée.

-- ----------------------------------------------------------------------------
-- Nouveaux états métier
-- ----------------------------------------------------------------------------
alter type public.membership_status add value if not exists 'cycle_completed';
alter type public.basket_instance_status add value if not exists 'completed';

-- ----------------------------------------------------------------------------
-- Suppression du moteur "round" devenu obsolète
-- ----------------------------------------------------------------------------
drop function if exists public.fn_start_round(uuid);

-- ----------------------------------------------------------------------------
-- Formules : capacité 20, un seul paiement par membre. payout_amount et
-- round_length_days étant des colonnes générées, ils se recalculent seuls.
-- On aligne aussi les valeurs par défaut de la table sur le nouveau modèle.
-- ----------------------------------------------------------------------------
alter table public.tontine_basket_types alter column capacity set default 20;
alter table public.tontine_basket_types alter column contributions_per_round set default 1;

-- ----------------------------------------------------------------------------
-- Rejoindre un panier — inchangé sur le fond (anti-survente + blocage compte
-- non actif conservés), la seule instance recherchée est désormais une
-- instance 'filling' (plus de 'paused' possible dans le nouveau modèle).
-- ----------------------------------------------------------------------------
create or replace function public.join_basket(p_basket_type_id uuid)
returns table (contribution_id uuid, amount numeric, basket_instance_id uuid, membership_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_account_status public.account_status;
  v_basket_type public.tontine_basket_types%rowtype;
  v_instance public.tontine_basket_instances%rowtype;
  v_pending_reservations int;
  v_next_join_order int;
  v_membership_id uuid;
  v_contribution_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Un compte suspendu ou banni ne peut plus rejoindre de panier.
  select status into v_account_status from public.profiles where id = v_uid;
  if v_account_status is distinct from 'active' then
    raise exception 'account_not_active';
  end if;

  select * into v_basket_type from public.tontine_basket_types where id = p_basket_type_id and is_active;
  if not found then
    raise exception 'basket_type_not_found';
  end if;

  if exists (
    select 1 from public.tontine_memberships m
    join public.tontine_basket_instances i on i.id = m.basket_instance_id
    where m.user_id = v_uid and m.status = 'active' and i.basket_type_id = p_basket_type_id
  ) then
    raise exception 'already_member_of_this_basket_type';
  end if;

  -- On rejoint l'instance 'filling' existante tant que (membres payés +
  -- réservations d'entrée valides <24h) < capacité. `member_count` seul ne
  -- suffit pas : il ne reflète que les membres ayant réellement payé.
  for v_instance in
    select i.* from public.tontine_basket_instances i
    where i.basket_type_id = p_basket_type_id
      and i.status = 'filling'
    order by i.created_at asc
    for update
  loop
    select count(*) into v_pending_reservations
    from public.tontine_memberships m
    join public.tontine_contributions c on c.membership_id = m.id
    where m.basket_instance_id = v_instance.id
      and m.status = 'active'
      and c.occurrence_number = 1
      and c.status = 'pending'
      and c.created_at > now() - interval '24 hours';

    if v_instance.member_count + v_pending_reservations < v_basket_type.capacity then
      exit;
    end if;
    v_instance := null;
  end loop;

  if v_instance.id is null then
    insert into public.tontine_basket_instances (basket_type_id, status)
    values (p_basket_type_id, 'filling')
    returning * into v_instance;
  end if;

  select coalesce(max(m.join_order), 0) + 1 into v_next_join_order
  from public.tontine_memberships m
  where m.basket_instance_id = v_instance.id;

  insert into public.tontine_memberships (basket_instance_id, user_id, join_order, status)
  values (v_instance.id, v_uid, v_next_join_order, 'active')
  returning id into v_membership_id;

  insert into public.tontine_contributions (
    membership_id, round_number, occurrence_number, due_date, amount, status
  ) values (
    v_membership_id, v_instance.round_number, 1, current_date, v_basket_type.contribution_amount, 'pending'
  )
  returning id into v_contribution_id;

  -- `member_count` n'est incrémenté qu'à la confirmation du paiement
  -- (fn_confirm_contribution), jamais ici.
  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    v_uid, 'basket_joined', 'Vous avez rejoint un panier',
    format('Vous avez rejoint le %s. Effectuez votre dépôt pour valider votre place.', v_basket_type.label),
    jsonb_build_object('basket_instance_id', v_instance.id, 'membership_id', v_membership_id)
  );

  return query select v_contribution_id, v_basket_type.contribution_amount, v_instance.id, v_membership_id;
end;
$$;

revoke all on function public.join_basket from public, anon;
grant execute on function public.join_basket to authenticated;

-- ----------------------------------------------------------------------------
-- Confirmation d'un paiement (webhook GeniusPay). Signature identique, mais
-- le type de retour change : on DROP l'ancienne avant de recréer.
--
-- Comportement : marque la cotisation payée (avec vérification du montant),
-- incrémente member_count. Si c'est le paiement qui complète le panier
-- (member_count == capacity), fait TOUT de façon synchrone :
--   - bascule l'instance en 'active' (pleine, gain en attente admin),
--   - détermine le gagnant (join_order minimal parmi les membres actifs),
--   - crée la ligne de gain,
--   - passe tous les AUTRES membres actifs en 'cycle_completed',
--   - garantit une instance 'filling' neuve pour la formule,
--   - notifie le gagnant (notification interne 'payout_ready').
-- Renvoie tout ce dont le webhook a besoin pour ses e-mails / Telegram.
-- ----------------------------------------------------------------------------
drop function if exists public.fn_confirm_contribution(uuid, text, numeric);

create function public.fn_confirm_contribution(
  p_contribution_id uuid, p_provider_reference text, p_paid_amount numeric
)
returns table (
  basket_instance_id uuid,
  basket_label text,
  member_count int,
  capacity int,
  became_full boolean,
  winner_user_id uuid,
  winner_email citext,
  winner_first_name text,
  payout_id uuid,
  payout_amount numeric,
  beneficiary_token text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
-- Les colonnes de sortie (member_count, capacity, basket_instance_id...)
-- portent le même nom que des colonnes de table utilisées dans le corps :
-- on demande à PL/pgSQL de résoudre toute référence ambiguë vers la COLONNE.
-- Les valeurs de sortie ne sont posées que par le RETURN QUERY final (via des
-- variables v_*), donc ce choix est sans effet de bord.
#variable_conflict use_column
declare
  v_occurrence_number smallint;
  v_expected_amount numeric;
  v_instance_id uuid;
  v_basket_type_id uuid;
  v_basket_label text;
  v_capacity smallint;
  v_member_count smallint;
  v_payout_amount numeric;
  v_winner_membership_id uuid;
  v_winner_user_id uuid;
  v_winner_email citext;
  v_winner_first_name text;
  v_payout_id uuid;
  v_beneficiary_token text;
  v_became_full boolean := false;
begin
  select amount into v_expected_amount
  from public.tontine_contributions
  where id = p_contribution_id and status = 'pending';

  -- Rejeu / déjà traité : rien à faire, réponse neutre idempotente.
  if v_expected_amount is null then
    return query select null::uuid, null::text, null::int, null::int, false,
      null::uuid, null::citext, null::text, null::uuid, null::numeric, null::text;
    return;
  end if;

  -- Défense en profondeur : le montant reçu doit correspondre exactement à
  -- l'échéance attendue.
  if p_paid_amount is distinct from v_expected_amount then
    raise exception 'amount_mismatch: expected % got %', v_expected_amount, p_paid_amount;
  end if;

  update public.tontine_contributions
  set status = 'paid', paid_at = now(), provider_reference = p_provider_reference
  where id = p_contribution_id and status = 'pending'
  returning occurrence_number into v_occurrence_number;

  if not found then
    return query select null::uuid, null::text, null::int, null::int, false,
      null::uuid, null::citext, null::text, null::uuid, null::numeric, null::text;
    return;
  end if;

  select i.id, i.basket_type_id, bt.label, bt.capacity, bt.payout_amount
  into v_instance_id, v_basket_type_id, v_basket_label, v_capacity, v_payout_amount
  from public.tontine_contributions c
  join public.tontine_memberships m on m.id = c.membership_id
  join public.tontine_basket_instances i on i.id = m.basket_instance_id
  join public.tontine_basket_types bt on bt.id = i.basket_type_id
  where c.id = p_contribution_id;

  -- Verrou de l'instance : sérialise deux confirmations simultanées afin
  -- qu'un seul paiement soit reconnu comme "celui qui complète le panier".
  update public.tontine_basket_instances
  set member_count = member_count + 1
  where id = v_instance_id
  returning member_count into v_member_count;

  if v_member_count = v_capacity then
    v_became_full := true;

    -- Instance pleine, gain créé, en attente de confirmation admin.
    update public.tontine_basket_instances
    set status = 'active', filled_at = coalesce(filled_at, now())
    where id = v_instance_id;

    -- Gagnant : premier arrivé (join_order minimal) parmi les membres actifs.
    select m.id, m.user_id, p.email, p.first_name
    into v_winner_membership_id, v_winner_user_id, v_winner_email, v_winner_first_name
    from public.tontine_memberships m
    join public.profiles p on p.id = m.user_id
    where m.basket_instance_id = v_instance_id and m.status = 'active'
    order by m.join_order asc
    limit 1;

    -- Ligne de gain (idempotence via la contrainte unique instance+round).
    insert into public.tontine_payouts (basket_instance_id, round_number, membership_id, amount)
    select v_instance_id, i.round_number, v_winner_membership_id, v_payout_amount
    from public.tontine_basket_instances i where i.id = v_instance_id
    on conflict (basket_instance_id, round_number) do nothing
    returning id, beneficiary_token into v_payout_id, v_beneficiary_token;

    if v_payout_id is null then
      -- La ligne existait déjà (double confirmation) : on la relit.
      select id, beneficiary_token into v_payout_id, v_beneficiary_token
      from public.tontine_payouts
      where basket_instance_id = v_instance_id;
    end if;

    -- Tous les AUTRES membres actifs terminent leur cycle sans gain : ils
    -- devront rejoindre une nouvelle instance pour retenter leur chance.
    update public.tontine_memberships
    set status = 'cycle_completed'
    where basket_instance_id = v_instance_id
      and status = 'active'
      and id is distinct from v_winner_membership_id;

    -- Notification interne au gagnant.
    insert into public.notifications (user_id, type, title, body, metadata)
    values (
      v_winner_user_id, 'payout_ready', format('Vous avez gagné le %s !', v_basket_label),
      format('Votre gain de %s FCFA est prêt. Indiquez vos coordonnées de paiement.', v_payout_amount),
      jsonb_build_object('payout_id', v_payout_id)
    );

    -- Une instance 'filling' neuve reste toujours disponible pour les
    -- prochains arrivants.
    if not exists (
      select 1 from public.tontine_basket_instances
      where basket_type_id = v_basket_type_id and status = 'filling'
    ) then
      insert into public.tontine_basket_instances (basket_type_id, status)
      values (v_basket_type_id, 'filling');
    end if;
  end if;

  return query select
    v_instance_id, v_basket_label, v_member_count::int, v_capacity::int, v_became_full,
    v_winner_user_id, v_winner_email, v_winner_first_name,
    v_payout_id, case when v_became_full then v_payout_amount else null::numeric end,
    v_beneficiary_token;
end;
$$;

revoke all on function public.fn_confirm_contribution from public, anon, authenticated;
grant execute on function public.fn_confirm_contribution to service_role;

-- ----------------------------------------------------------------------------
-- Balayage quotidien — désormais réduit à l'expiration des réservations
-- (occurrence n°1) jamais payées après 24h. Plus de rappels, plus de retrait
-- pour cotisation manquée, plus de déclenchement de gain par date.
-- ----------------------------------------------------------------------------
create or replace function public.fn_daily_tontine_sweep()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_expired int := 0;
  v_row record;
begin
  for v_row in
    select c.id as contribution_id, m.id as membership_id
    from public.tontine_contributions c
    join public.tontine_memberships m on m.id = c.membership_id
    where c.status = 'pending' and c.occurrence_number = 1 and m.status = 'active'
      and c.created_at <= now() - interval '24 hours'
  loop
    update public.tontine_contributions set status = 'missed' where id = v_row.contribution_id;
    update public.tontine_memberships set status = 'removed_missed_payment', removed_at = now() where id = v_row.membership_id;
    v_expired := v_expired + 1;
  end loop;

  return jsonb_build_object('expired', v_expired);
end;
$$;

revoke all on function public.fn_daily_tontine_sweep from public, anon, authenticated;
grant execute on function public.fn_daily_tontine_sweep to service_role;

-- ----------------------------------------------------------------------------
-- Confirmation admin du versement — clôt définitivement l'instance
-- ('completed'). Le gagnant quitte ('paid_out_left'). Aucune place n'est
-- rouverte dans CETTE instance : pour retenter, il faut une nouvelle instance.
-- ----------------------------------------------------------------------------
create or replace function public.admin_confirm_payout(p_payout_id uuid, p_processed_by uuid)
returns table (basket_instance_id uuid, user_id uuid, email citext, first_name text, basket_label text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_payout public.tontine_payouts%rowtype;
begin
  select * into v_payout from public.tontine_payouts where id = p_payout_id and status = 'beneficiary_info_submitted' for update;
  if not found then
    raise exception 'payout_not_ready';
  end if;

  update public.tontine_payouts
  set status = 'paid', confirmed_by = p_processed_by, confirmed_at = now()
  where id = p_payout_id;

  update public.tontine_memberships
  set status = 'paid_out_left', paid_out_at = now()
  where id = v_payout.membership_id;

  -- L'instance est définitivement close (pas de round 2, pas de réutilisation
  -- des membres restants).
  update public.tontine_basket_instances
  set status = 'completed'
  where id = v_payout.basket_instance_id;

  insert into public.transactions (user_id, type, amount, reference_table, reference_id, description)
  select m.user_id, 'payout', v_payout.amount, 'tontine_payouts', v_payout.id,
    format('Gain versé — %s', bt.label)
  from public.tontine_memberships m
  join public.tontine_basket_instances i on i.id = m.basket_instance_id
  join public.tontine_basket_types bt on bt.id = i.basket_type_id
  where m.id = v_payout.membership_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after_data)
  values (p_processed_by, 'confirm_payout', 'tontine_payouts', p_payout_id, jsonb_build_object('amount', v_payout.amount));

  return query
    select i.id, p.id, p.email, p.first_name, bt.label
    from public.tontine_memberships m
    join public.profiles p on p.id = m.user_id
    join public.tontine_basket_instances i on i.id = m.basket_instance_id
    join public.tontine_basket_types bt on bt.id = i.basket_type_id
    where m.id = v_payout.membership_id;
end;
$$;

revoke all on function public.admin_confirm_payout from public, anon, authenticated;
grant execute on function public.admin_confirm_payout to service_role;

-- ============================================================================
-- Remise à zéro des données transactionnelles de tontine (local ET prod).
-- On ne touche PAS aux comptes (profiles/auth.users) ni aux autres tables
-- (notifications, audit_logs, email_logs, transactions...). Décidé et validé
-- par l'utilisateur.
-- ============================================================================
truncate table
  public.tontine_payouts,
  public.tontine_contributions,
  public.tontine_memberships,
  public.tontine_basket_instances
  cascade;

-- Aligne les 4 formules seedées sur le nouveau modèle (capacity 20, un seul
-- paiement). payout_amount / round_length_days se recalculent (colonnes
-- générées) => 20 000 / 60 000 / 100 000 / 200 000 FCFA.
update public.tontine_basket_types
set capacity = 20, contributions_per_round = 1
where is_active;

-- Une instance 'filling' neuve et vide pour chaque formule active : /paniers
-- affiche immédiatement 4 paniers à 0/20, rejoignables.
insert into public.tontine_basket_instances (basket_type_id, status, member_count)
select id, 'filling', 0 from public.tontine_basket_types where is_active;
