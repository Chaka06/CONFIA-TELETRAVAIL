-- ============================================================================
-- 0005 — Moteur de la tontine
-- ============================================================================
-- Modèle retenu :
--  - Rejoindre un panier = payer immédiatement l'occurrence n°1 (le "dépôt
--    d'entrée"), montant = celui de la formule du panier.
--  - Dès que le panier atteint sa capacité (10), le round démarre : les
--    occurrences n°2 à n°5 sont générées pour tous les membres actifs,
--    espacées de `interval_days`, à partir du lendemain.
--  - Quand l'échéance de la dernière occurrence arrive, le premier membre
--    par ordre d'arrivée (join_order) remporte l'intégralité du round et
--    quitte le portefeuille : une place se libère.
--  - Un nouveau membre qui comble cette place relance un nouveau round
--    (round_number + 1) avec un nouvel échéancier complet pour tout le monde.
--  - Toute cotisation (occurrence 2 à 5) non payée le jour de son échéance
--    entraîne le retrait immédiat du membre concerné.
--  - Envoi des e-mails/Telegram : entièrement géré côté TypeScript ; ces
--    fonctions ne font que les changements d'état + insertion de
--    notifications internes, et renvoient les données nécessaires à l'appelant.

-- ----------------------------------------------------------------------------
-- Rejoindre un panier
-- ----------------------------------------------------------------------------
create function public.join_basket(p_basket_type_id uuid)
returns table (contribution_id uuid, amount numeric, basket_instance_id uuid, membership_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_basket_type public.tontine_basket_types%rowtype;
  v_instance public.tontine_basket_instances%rowtype;
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
  -- panier neuf, sinon rejoindre un panier en cours de remplissage.
  select * into v_instance
  from public.tontine_basket_instances
  where basket_type_id = p_basket_type_id
    and status in ('paused', 'filling')
    and member_count < v_basket_type.capacity
  order by (status = 'paused') desc, created_at asc
  limit 1
  for update;

  if not found then
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

  update public.tontine_basket_instances
  set member_count = member_count + 1
  where id = v_instance.id;

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

-- ----------------------------------------------------------------------------
-- Annule une adhésion dont le dépôt d'entrée a échoué (occurrence n°1 ratée).
-- ----------------------------------------------------------------------------
create function public.fn_cancel_failed_join(p_contribution_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_membership public.tontine_memberships%rowtype;
begin
  select m.* into v_membership
  from public.tontine_contributions c
  join public.tontine_memberships m on m.id = c.membership_id
  where c.id = p_contribution_id and c.occurrence_number = 1 and c.status = 'pending';

  if not found then
    return;
  end if;

  update public.tontine_contributions set status = 'missed' where id = p_contribution_id;
  update public.tontine_memberships set status = 'removed_missed_payment', removed_at = now() where id = v_membership.id;
  update public.tontine_basket_instances set member_count = greatest(0, member_count - 1) where id = v_membership.basket_instance_id;
end;
$$;

revoke all on function public.fn_cancel_failed_join from public, anon, authenticated;
grant execute on function public.fn_cancel_failed_join to service_role;

-- ----------------------------------------------------------------------------
-- Démarre (ou relance) le round d'un panier une fois la capacité atteinte.
-- Renvoie la liste des membres à notifier ("panier complet").
-- ----------------------------------------------------------------------------
create function public.fn_start_round(p_instance_id uuid)
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

-- ----------------------------------------------------------------------------
-- Confirme le paiement d'une cotisation (webhook GeniusPay). Démarre le
-- round si c'est la dépose qui vient de compléter le panier.
-- ----------------------------------------------------------------------------
create function public.fn_confirm_contribution(p_contribution_id uuid, p_provider_reference text)
returns table (should_start_round boolean, basket_instance_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_instance_id uuid;
  v_capacity smallint;
  v_member_count smallint;
begin
  update public.tontine_contributions
  set status = 'paid', paid_at = now(), provider_reference = p_provider_reference
  where id = p_contribution_id and status = 'pending';

  if not found then
    return query select false, null::uuid;
    return;
  end if;

  select i.id, bt.capacity, i.member_count into v_instance_id, v_capacity, v_member_count
  from public.tontine_contributions c
  join public.tontine_memberships m on m.id = c.membership_id
  join public.tontine_basket_instances i on i.id = m.basket_instance_id
  join public.tontine_basket_types bt on bt.id = i.basket_type_id
  where c.id = p_contribution_id;

  return query select (v_member_count = v_capacity), v_instance_id;
end;
$$;

revoke all on function public.fn_confirm_contribution from public, anon, authenticated;
grant execute on function public.fn_confirm_contribution to service_role;

-- ----------------------------------------------------------------------------
-- Balayage quotidien : rappels du jour, retraits pour impayé de la veille,
-- déclenchement des gains du jour. Appelé une fois par jour par un cron.
-- ----------------------------------------------------------------------------
create function public.fn_daily_tontine_sweep()
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
