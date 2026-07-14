-- ============================================================================
-- 0011 — Le statut du compte (suspended/banned) est désormais réellement
-- appliqué au moment de rejoindre un panier
-- ============================================================================
-- Trouvé lors de l'audit, confirmé empiriquement (aucune fonction SQL ni
-- aucune route ne lisait `profiles.status`) : la colonne `account_status`
-- ('active' | 'suspended' | 'banned'), pilotable depuis
-- /pouri/utilisateurs (adminSetUserStatus), n'était vérifiée nulle part.
-- Concrètement, suspendre ou bannir un compte n'avait STRICTEMENT AUCUN
-- effet : le membre continuait à pouvoir se connecter, rejoindre des paniers
-- et payer des cotisations exactement comme avant. La sanction administrative
-- était purement décorative.
--
-- Correctif défense en profondeur, au plus près de la donnée : `join_basket`
-- (seul point d'entrée pour rejoindre un panier, SECURITY DEFINER) refuse
-- désormais tout appelant dont le compte n'est pas 'active'. Le blocage du
-- paiement d'une échéance existante et le blocage à la connexion sont traités
-- côté TypeScript (initiateContributionPayment + formulaire de connexion),
-- sans introduire de redirection en boucle (le proxy raisonne de façon
-- optimiste sur la seule présence du cookie).
--
-- Aucune autre ligne de `join_basket` n'est modifiée par rapport à 0008.

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

  -- Priorité : combler une place libérée (panier en pause) avant d'ouvrir un
  -- panier neuf, sinon rejoindre un panier en cours de remplissage. Un
  -- panier peut accepter une réservation tant que (membres payés + dépôts
  -- d'entrée encore valides et non expirés) n'atteint pas sa capacité —
  -- `member_count` seul ne suffit pas à décider : il ne reflète que les
  -- membres ayant réellement payé.
  for v_instance in
    select i.* from public.tontine_basket_instances i
    where i.basket_type_id = p_basket_type_id
      and i.status in ('paused', 'filling')
    order by (i.status = 'paused') desc, i.created_at asc
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
  -- (fn_confirm_contribution), jamais ici : une réservation impayée ne doit
  -- jamais compter comme une place occupée pour de vrai.

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    v_uid, 'basket_joined', 'Vous avez rejoint un panier',
    format('Vous êtes membre n°%s du %s. Effectuez votre dépôt pour valider votre place.', v_next_join_order, v_basket_type.label),
    jsonb_build_object('basket_instance_id', v_instance.id, 'membership_id', v_membership_id)
  );

  return query select v_contribution_id, v_basket_type.contribution_amount, v_instance.id, v_membership_id;
end;
$$;

revoke all on function public.join_basket from public, anon;
grant execute on function public.join_basket to authenticated;
