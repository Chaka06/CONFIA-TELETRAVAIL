-- ============================================================================
-- 0008 — Correctifs de sécurité de l'audit "il faut fouiller toutes les failles"
-- ============================================================================
-- 0005 a été édité sur place en local (pas encore répliqué sur le cloud, qui
-- l'avait déjà appliqué avant l'audit) : cette migration porte donc le même
-- correctif sous forme de delta explicite, pour que le cloud rattrape l'état
-- local vérifié par les tests d'intégration.
--
-- Correctifs :
--  1. member_count n'est plus jamais incrémenté à join_basket (réservation),
--     uniquement à fn_confirm_contribution (paiement réellement confirmé) —
--     empêche un round de démarrer sans que tout le monde ait payé.
--  2. join_basket compte les réservations d'entrée encore valides (<24h,
--     impayées) dans le calcul de capacité, pour ne jamais survendre un panier.
--  3. fn_daily_tontine_sweep expire désormais les dépôts d'entrée jamais payés
--     après 24h (occurrence n°1), qui restaient auparavant bloqués indéfiniment.
--  4. fn_confirm_contribution vérifie que le montant reçu correspond
--     exactement à l'échéance attendue (p_paid_amount, nouveau paramètre) —
--     signature changée, donc l'ancienne version à 2 arguments est supprimée
--     explicitement avant recréation.

drop function if exists public.fn_confirm_contribution(uuid, text);

create or replace function public.join_basket(p_basket_type_id uuid)
returns table (contribution_id uuid, amount numeric, basket_instance_id uuid, membership_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
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

create or replace function public.fn_cancel_failed_join(p_contribution_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_membership_id uuid;
begin
  select m.id into v_membership_id
  from public.tontine_contributions c
  join public.tontine_memberships m on m.id = c.membership_id
  where c.id = p_contribution_id and c.occurrence_number = 1 and c.status = 'pending';

  if not found then
    return;
  end if;

  update public.tontine_contributions set status = 'missed' where id = p_contribution_id;
  update public.tontine_memberships set status = 'removed_missed_payment', removed_at = now() where id = v_membership_id;
end;
$$;

revoke all on function public.fn_cancel_failed_join from public, anon, authenticated;
grant execute on function public.fn_cancel_failed_join to service_role;

create or replace function public.fn_start_round(p_instance_id uuid)
returns table (user_id uuid, email citext, first_name text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_instance public.tontine_basket_instances%rowtype;
  v_basket_type public.tontine_basket_types%rowtype;
  v_round_started_on date;
  v_membership record;
  v_occ smallint;
begin
  select * into v_instance from public.tontine_basket_instances where id = p_instance_id for update;
  select * into v_basket_type from public.tontine_basket_types where id = v_instance.basket_type_id;

  -- Idempotence : si le round a déjà démarré (ex : webhook rejoué), ne rien refaire.
  if v_instance.status = 'active' and v_instance.round_started_on is not null then
    return query
      select p.id, p.email, p.first_name
      from public.tontine_memberships m
      join public.profiles p on p.id = m.user_id
      where m.basket_instance_id = p_instance_id and m.status = 'active';
    return;
  end if;

  v_round_started_on := current_date + 1;

  update public.tontine_basket_instances
  set status = 'active', round_started_on = v_round_started_on, filled_at = coalesce(filled_at, now())
  where id = p_instance_id;

  for v_membership in
    select m.id, m.user_id from public.tontine_memberships m
    where m.basket_instance_id = p_instance_id and m.status = 'active'
  loop
    for v_occ in 2..v_basket_type.contributions_per_round loop
      insert into public.tontine_contributions (membership_id, round_number, occurrence_number, due_date, amount, status)
      values (
        v_membership.id, v_instance.round_number, v_occ,
        v_round_started_on + ((v_occ - 2) * v_basket_type.interval_days),
        v_basket_type.contribution_amount, 'pending'
      )
      on conflict (membership_id, round_number, occurrence_number) do nothing;
    end loop;

    insert into public.notifications (user_id, type, title, body, metadata)
    values (
      v_membership.user_id, 'basket_full', format('%s complet', v_basket_type.label),
      format('Le panier est complet. Vos prochains dépôts commencent le %s.', to_char(v_round_started_on, 'DD/MM/YYYY')),
      jsonb_build_object('basket_instance_id', p_instance_id)
    );
  end loop;

  -- Un panier neuf reste toujours disponible pour les prochains arrivants.
  if not exists (
    select 1 from public.tontine_basket_instances
    where basket_type_id = v_instance.basket_type_id and status = 'filling'
  ) then
    insert into public.tontine_basket_instances (basket_type_id, status)
    values (v_instance.basket_type_id, 'filling');
  end if;

  return query
    select p.id, p.email, p.first_name
    from public.tontine_memberships m
    join public.profiles p on p.id = m.user_id
    where m.basket_instance_id = p_instance_id and m.status = 'active';
end;
$$;

revoke all on function public.fn_start_round from public, anon, authenticated;
grant execute on function public.fn_start_round to service_role;

create or replace function public.fn_confirm_contribution(p_contribution_id uuid, p_provider_reference text, p_paid_amount numeric)
returns table (should_start_round boolean, basket_instance_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_occurrence_number smallint;
  v_expected_amount numeric;
  v_instance_id uuid;
  v_capacity smallint;
  v_member_count smallint;
begin
  select amount into v_expected_amount from public.tontine_contributions where id = p_contribution_id and status = 'pending';

  if v_expected_amount is null then
    return query select false, null::uuid;
    return;
  end if;

  -- Défense en profondeur : le montant réellement reçu (rapporté par le
  -- webhook, signature déjà vérifiée) doit correspondre exactement à
  -- l'échéance attendue. Un écart est signalé plutôt que silencieusement
  -- validé — même si l'agrégateur ne devrait jamais permettre un montant
  -- différent de celui demandé à la création de la session.
  if p_paid_amount is distinct from v_expected_amount then
    raise exception 'amount_mismatch: expected % got %', v_expected_amount, p_paid_amount;
  end if;

  update public.tontine_contributions
  set status = 'paid', paid_at = now(), provider_reference = p_provider_reference
  where id = p_contribution_id and status = 'pending'
  returning occurrence_number into v_occurrence_number;

  if not found then
    return query select false, null::uuid;
    return;
  end if;

  select i.id into v_instance_id
  from public.tontine_contributions c
  join public.tontine_memberships m on m.id = c.membership_id
  join public.tontine_basket_instances i on i.id = m.basket_instance_id
  where c.id = p_contribution_id;

  if v_occurrence_number = 1 then
    -- Verrouille l'instance pour que deux confirmations simultanées ne
    -- déclenchent jamais deux fois le démarrage du round (dernier arrivant
    -- payé = un seul gagnant de la course).
    update public.tontine_basket_instances
    set member_count = member_count + 1
    where id = v_instance_id
    returning member_count into v_member_count;
  else
    select i.member_count into v_member_count
    from public.tontine_basket_instances i
    where i.id = v_instance_id;
  end if;

  select bt.capacity into v_capacity
  from public.tontine_basket_instances i
  join public.tontine_basket_types bt on bt.id = i.basket_type_id
  where i.id = v_instance_id;

  return query select (v_occurrence_number = 1 and v_member_count = v_capacity), v_instance_id;
end;
$$;

revoke all on function public.fn_confirm_contribution from public, anon, authenticated;
grant execute on function public.fn_confirm_contribution to service_role;

create or replace function public.fn_daily_tontine_sweep()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_reminders jsonb := '[]'::jsonb;
  v_removed jsonb := '[]'::jsonb;
  v_payouts jsonb := '[]'::jsonb;
  v_row record;
  v_payout_id uuid;
  v_winner_membership_id uuid;
begin
  -- 0. Expire les réservations (occurrence n°1) jamais payées après 24h —
  -- ne décrémente jamais member_count : elles n'y étaient jamais comptées.
  for v_row in
    select c.id as contribution_id, m.id as membership_id
    from public.tontine_contributions c
    join public.tontine_memberships m on m.id = c.membership_id
    where c.status = 'pending' and c.occurrence_number = 1 and m.status = 'active'
      and c.created_at <= now() - interval '24 hours'
  loop
    update public.tontine_contributions set status = 'missed' where id = v_row.contribution_id;
    update public.tontine_memberships set status = 'removed_missed_payment', removed_at = now() where id = v_row.membership_id;
  end loop;

  -- 1. Rappels pour les cotisations dues aujourd'hui.
  for v_row in
    select c.id as contribution_id, p.email, p.first_name, c.amount, bt.label as basket_label, c.due_date
    from public.tontine_contributions c
    join public.tontine_memberships m on m.id = c.membership_id
    join public.profiles p on p.id = m.user_id
    join public.tontine_basket_instances i on i.id = m.basket_instance_id
    join public.tontine_basket_types bt on bt.id = i.basket_type_id
    where c.status = 'pending' and c.due_date = current_date and c.reminder_sent_at is null
  loop
    update public.tontine_contributions set reminder_sent_at = now() where id = v_row.contribution_id;
    v_reminders := v_reminders || jsonb_build_object(
      'contribution_id', v_row.contribution_id, 'email', v_row.email, 'first_name', v_row.first_name,
      'amount', v_row.amount, 'basket_label', v_row.basket_label
    );
  end loop;

  -- 2. Retrait des membres n'ayant pas payé l'échéance de la veille.
  for v_row in
    select c.id as contribution_id, m.id as membership_id, m.basket_instance_id, p.email, p.first_name, bt.label as basket_label
    from public.tontine_contributions c
    join public.tontine_memberships m on m.id = c.membership_id
    join public.profiles p on p.id = m.user_id
    join public.tontine_basket_instances i on i.id = m.basket_instance_id
    join public.tontine_basket_types bt on bt.id = i.basket_type_id
    where c.status = 'pending' and c.due_date = current_date - 1 and c.occurrence_number > 1
  loop
    update public.tontine_contributions set status = 'missed' where id = v_row.contribution_id;
    update public.tontine_memberships set status = 'removed_missed_payment', removed_at = now() where id = v_row.membership_id;
    update public.tontine_basket_instances
    set member_count = greatest(0, member_count - 1), status = 'paused'
    where id = v_row.basket_instance_id;

    insert into public.notifications (user_id, type, title, body, metadata)
    select p.id, 'member_removed', format('Retiré du %s', v_row.basket_label),
      'Vous avez été retiré du panier pour non-paiement d''une échéance.',
      jsonb_build_object('basket_instance_id', v_row.basket_instance_id)
    from public.profiles p where p.email = v_row.email;

    v_removed := v_removed || jsonb_build_object(
      'basket_instance_id', v_row.basket_instance_id, 'email', v_row.email, 'first_name', v_row.first_name,
      'basket_label', v_row.basket_label
    );
  end loop;

  -- 3. Déclenchement des gains dont la dernière échéance arrive aujourd'hui.
  for v_row in
    select distinct i.id as basket_instance_id, i.round_number, bt.label as basket_label, bt.payout_amount
    from public.tontine_contributions c
    join public.tontine_memberships m on m.id = c.membership_id
    join public.tontine_basket_instances i on i.id = m.basket_instance_id
    join public.tontine_basket_types bt on bt.id = i.basket_type_id
    where c.due_date = current_date and c.occurrence_number = bt.contributions_per_round
      and not exists (
        select 1 from public.tontine_payouts po
        where po.basket_instance_id = i.id and po.round_number = i.round_number
      )
  loop
    select id into v_winner_membership_id
    from public.tontine_memberships
    where basket_instance_id = v_row.basket_instance_id and status = 'active'
    order by join_order asc
    limit 1;

    if v_winner_membership_id is not null then
      insert into public.tontine_payouts (basket_instance_id, round_number, membership_id, amount)
      values (v_row.basket_instance_id, v_row.round_number, v_winner_membership_id, v_row.payout_amount)
      returning id into v_payout_id;

      insert into public.notifications (user_id, type, title, body, metadata)
      select p.id, 'payout_ready', format('Vous avez gagné le %s !', v_row.basket_label),
        format('Votre gain de %s FCFA est prêt. Indiquez vos coordonnées de paiement.', v_row.payout_amount),
        jsonb_build_object('payout_id', v_payout_id)
      from public.tontine_memberships m join public.profiles p on p.id = m.user_id
      where m.id = v_winner_membership_id;

      v_payouts := v_payouts || jsonb_build_object(
        'payout_id', v_payout_id, 'basket_instance_id', v_row.basket_instance_id, 'basket_label', v_row.basket_label,
        'amount', v_row.payout_amount, 'membership_id', v_winner_membership_id
      );
    end if;
  end loop;

  return jsonb_build_object('reminders', v_reminders, 'removed', v_removed, 'payouts', v_payouts);
end;
$$;

revoke all on function public.fn_daily_tontine_sweep from public, anon, authenticated;
grant execute on function public.fn_daily_tontine_sweep to service_role;
