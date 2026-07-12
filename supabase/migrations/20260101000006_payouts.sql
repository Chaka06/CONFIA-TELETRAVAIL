-- ============================================================================
-- 0006 — Versement des gains
-- ============================================================================
-- Le gagnant reçoit un lien public (par e-mail) contenant un jeton unique
-- (beneficiary_token). Aucune connexion requise : il renseigne son numéro et
-- son moyen de paiement, l'administrateur voit ça dans le dashboard, effectue
-- le virement lui-même (hors plateforme, GeniusPay n'a pas encore d'API de
-- payout), puis confirme manuellement.

-- ----------------------------------------------------------------------------
-- Le bénéficiaire renseigne ses coordonnées de paiement via son lien.
-- ----------------------------------------------------------------------------
create function public.submit_payout_beneficiary_info(
  p_token text, p_phone text, p_payment_method text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_payment_method not in ('orange_money', 'wave', 'mtn_money', 'moov_money') then
    raise exception 'invalid_payment_method';
  end if;

  if p_phone is null or btrim(p_phone) !~ '^\+?[0-9]{8,15}$' then
    raise exception 'invalid_phone_number';
  end if;

  update public.tontine_payouts
  set beneficiary_phone = btrim(p_phone),
      beneficiary_payment_method = p_payment_method,
      beneficiary_submitted_at = now(),
      status = 'beneficiary_info_submitted'
  where beneficiary_token = p_token and status = 'pending';

  if not found then
    raise exception 'payout_not_found_or_already_submitted';
  end if;
end;
$$;

revoke all on function public.submit_payout_beneficiary_info from public, authenticated;
grant execute on function public.submit_payout_beneficiary_info to anon;

-- ----------------------------------------------------------------------------
-- L'administrateur confirme l'envoi effectif des fonds (fait manuellement,
-- hors plateforme). Libère la place du gagnant dans le portefeuille.
-- ----------------------------------------------------------------------------
create function public.admin_confirm_payout(p_payout_id uuid, p_processed_by uuid)
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

  update public.tontine_basket_instances
  set member_count = greatest(0, member_count - 1), status = 'paused'
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
