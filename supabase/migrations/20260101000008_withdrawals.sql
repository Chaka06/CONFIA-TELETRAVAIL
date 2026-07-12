-- ============================================================================
-- 0008 — Retraits
-- ============================================================================
-- Règle : un retrait consomme soit un droit unique (plafonné, issu d'un cycle
-- complété), soit s'effectue librement une fois l'actif >= seuil illimité.
-- Le montant est débité immédiatement à la demande (réservation des fonds)
-- pour interdire toute demande concurrente au-delà du solde réel ; en cas de
-- rejet administratif, les fonds sont recrédités et le droit restitué.

create function public.request_withdrawal(p_amount numeric, p_destination_details jsonb)
returns public.withdrawals
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_balance numeric(14, 2);
  v_threshold numeric(14, 2);
  v_right public.withdrawal_rights%rowtype;
  v_withdrawal public.withdrawals%rowtype;
  v_is_unrestricted boolean := false;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  select balance into v_balance from public.wallets where user_id = v_uid for update;
  if v_balance is null then
    raise exception 'wallet_not_found';
  end if;

  select (value #>> '{}')::numeric into v_threshold
  from public.platform_settings where key = 'unrestricted_withdrawal_threshold';

  if v_balance >= v_threshold then
    v_is_unrestricted := true;

    if p_amount > v_balance then
      raise exception 'amount_exceeds_available_balance';
    end if;
  else
    select * into v_right
    from public.withdrawal_rights
    where user_id = v_uid and status = 'available'
    order by granted_at asc
    limit 1
    for update;

    if not found then
      raise exception 'no_withdrawal_right_available';
    end if;

    if p_amount > v_right.cap_amount then
      raise exception 'amount_exceeds_right_cap (cap: %)', v_right.cap_amount;
    end if;

    if p_amount > v_balance then
      raise exception 'amount_exceeds_available_balance';
    end if;

    update public.withdrawal_rights set status = 'used', used_at = now() where id = v_right.id;
  end if;

  insert into public.withdrawals (
    user_id, amount, withdrawal_right_id, is_unrestricted, destination_details, status
  ) values (
    v_uid, p_amount, case when v_is_unrestricted then null else v_right.id end, v_is_unrestricted, p_destination_details, 'pending'
  )
  returning * into v_withdrawal;

  perform public.fn_apply_wallet_delta(
    v_uid, -p_amount, 'withdrawal', 'withdrawals', v_withdrawal.id,
    format('Demande de retrait de %s (en attente de traitement)', public.fmt_fcfa(p_amount))
  );

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    v_uid, 'system', 'Demande de retrait enregistrée',
    format('Votre demande de retrait de %s est en cours de traitement.', public.fmt_fcfa(p_amount)),
    jsonb_build_object('withdrawal_id', v_withdrawal.id)
  );

  return v_withdrawal;
end;
$$;

revoke all on function public.request_withdrawal from public, anon;
grant execute on function public.request_withdrawal to authenticated;

-- ----------------------------------------------------------------------------
-- Approbation administrative : déclenche le virement réel côté serveur (appel
-- Genius Pay, cf. src/app/admin/retraits/actions.ts) AVANT cette fonction, qui
-- se contente d'enregistrer la référence renvoyée automatiquement par
-- l'agrégateur et de faire passer le retrait en traitement. Aucune référence
-- n'est jamais saisie manuellement par l'administrateur.
-- ----------------------------------------------------------------------------
create function public.admin_approve_withdrawal(
  p_withdrawal_id uuid,
  p_provider_reference text,
  p_processed_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_withdrawal public.withdrawals%rowtype;
begin
  select * into v_withdrawal from public.withdrawals where id = p_withdrawal_id for update;
  if not found then
    raise exception 'withdrawal_not_found';
  end if;

  if v_withdrawal.status <> 'pending' then
    raise exception 'withdrawal_not_pending (current: %)', v_withdrawal.status;
  end if;

  update public.withdrawals
  set status = 'processing', processed_at = now(), provider_reference = p_provider_reference, processed_by = p_processed_by
  where id = v_withdrawal.id;

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    v_withdrawal.user_id, 'system', 'Retrait en cours de traitement',
    format('Votre retrait de %s a été transmis à notre partenaire de paiement.', public.fmt_fcfa(v_withdrawal.amount)),
    jsonb_build_object('withdrawal_id', v_withdrawal.id)
  );
end;
$$;

revoke all on function public.admin_approve_withdrawal from public, anon, authenticated;
grant execute on function public.admin_approve_withdrawal to service_role;

-- ----------------------------------------------------------------------------
-- Refus administratif AVANT tout envoi de fonds (aucun appel Genius Pay
-- n'a été effectué). Restitution immédiate du solde et du droit de retrait.
-- ----------------------------------------------------------------------------
create function public.admin_reject_withdrawal(
  p_withdrawal_id uuid,
  p_reason text,
  p_processed_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_withdrawal public.withdrawals%rowtype;
begin
  select * into v_withdrawal from public.withdrawals where id = p_withdrawal_id for update;
  if not found then
    raise exception 'withdrawal_not_found';
  end if;

  if v_withdrawal.status <> 'pending' then
    raise exception 'withdrawal_not_pending (current: %)', v_withdrawal.status;
  end if;

  update public.withdrawals
  set status = 'rejected', processed_at = now(), rejected_reason = p_reason, processed_by = p_processed_by
  where id = v_withdrawal.id;

  perform public.fn_apply_wallet_delta(
    v_withdrawal.user_id, v_withdrawal.amount, 'adjustment', 'withdrawals', v_withdrawal.id,
    format('Remboursement suite au rejet du retrait (%s)', coalesce(p_reason, 'raison non précisée'))
  );

  if v_withdrawal.withdrawal_right_id is not null then
    update public.withdrawal_rights
    set status = 'available', used_at = null
    where id = v_withdrawal.withdrawal_right_id;
  end if;

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    v_withdrawal.user_id, 'withdrawal_rejected', 'Retrait refusé',
    format('Votre retrait de %s a été refusé (%s). Les fonds ont été recrédités.', public.fmt_fcfa(v_withdrawal.amount), coalesce(p_reason, 'raison non précisée')),
    jsonb_build_object('withdrawal_id', v_withdrawal.id)
  );
end;
$$;

revoke all on function public.admin_reject_withdrawal from public, anon, authenticated;
grant execute on function public.admin_reject_withdrawal to service_role;

-- ----------------------------------------------------------------------------
-- Finalisation — appelée exclusivement par le webhook Genius Pay
-- (cashout.completed / cashout.failed) une fois le virement réellement traité
-- par l'agrégateur. Un retrait "processing" dont le paiement échoue après
-- coup est remboursé exactement comme un refus administratif.
-- ----------------------------------------------------------------------------
create function public.finalize_withdrawal_payout(
  p_withdrawal_id uuid,
  p_approved boolean,
  p_provider_reference text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_withdrawal public.withdrawals%rowtype;
begin
  select * into v_withdrawal from public.withdrawals where id = p_withdrawal_id for update;
  if not found then
    raise exception 'withdrawal_not_found';
  end if;

  if v_withdrawal.status <> 'processing' then
    raise exception 'withdrawal_not_processing (current: %)', v_withdrawal.status;
  end if;

  if p_approved then
    update public.withdrawals
    set status = 'completed', provider_reference = coalesce(p_provider_reference, v_withdrawal.provider_reference)
    where id = v_withdrawal.id;

    insert into public.notifications (user_id, type, title, body, metadata)
    values (
      v_withdrawal.user_id, 'withdrawal_approved', 'Retrait effectué',
      format('Votre retrait de %s a été envoyé.', public.fmt_fcfa(v_withdrawal.amount)),
      jsonb_build_object('withdrawal_id', v_withdrawal.id)
    );
  else
    update public.withdrawals
    set status = 'rejected', rejected_reason = p_reason
    where id = v_withdrawal.id;

    perform public.fn_apply_wallet_delta(
      v_withdrawal.user_id, v_withdrawal.amount, 'adjustment', 'withdrawals', v_withdrawal.id,
      format('Remboursement suite à l''échec du virement (%s)', coalesce(p_reason, 'raison non précisée'))
    );

    if v_withdrawal.withdrawal_right_id is not null then
      update public.withdrawal_rights
      set status = 'available', used_at = null
      where id = v_withdrawal.withdrawal_right_id;
    end if;

    insert into public.notifications (user_id, type, title, body, metadata)
    values (
      v_withdrawal.user_id, 'withdrawal_rejected', 'Retrait refusé',
      format('Votre retrait de %s a échoué (%s). Les fonds ont été recrédités.', public.fmt_fcfa(v_withdrawal.amount), coalesce(p_reason, 'raison non précisée')),
      jsonb_build_object('withdrawal_id', v_withdrawal.id)
    );
  end if;
end;
$$;

revoke all on function public.finalize_withdrawal_payout from public, anon, authenticated;
grant execute on function public.finalize_withdrawal_payout to service_role;
