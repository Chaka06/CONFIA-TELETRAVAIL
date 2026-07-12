-- ============================================================================
-- 0013 — Retraits temporairement limités au seuil illimité uniquement
-- ============================================================================
-- GeniusPay n'expose pas encore d'API de payout (fonctionnalité en liste
-- d'attente côté prestataire, aucune date fiable) : impossible d'envoyer de
-- l'argent automatiquement pour l'instant. En attendant, on désactive la
-- branche "droit de retrait de cycle" (5 000 FCFA) et on n'autorise les
-- retraits qu'une fois l'actif >= unrestricted_withdrawal_threshold.
--
-- Implémenté comme un paramètre (booléen, modifiable par un super_admin
-- depuis /pouri/parametres) plutôt qu'en dur, pour pouvoir réactiver les
-- retraits par droit de cycle en un clic dès que GeniusPay (ou un autre
-- prestataire) proposera un vrai payout API — sans redéploiement.

insert into public.platform_settings (key, value, description)
values (
  'withdrawals_require_unrestricted_threshold',
  'true',
  'Si activé, seuls les retraits au-delà du seuil illimité sont autorisés (les droits de retrait de cycle, 5 000 FCFA, restent accordés mais ne peuvent pas être utilisés tant que ce paramètre est actif).'
);

create or replace function public.request_withdrawal(p_amount numeric, p_destination_details jsonb)
returns public.withdrawals
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_balance numeric(14, 2);
  v_threshold numeric(14, 2);
  v_threshold_only boolean;
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

  select coalesce((value #>> '{}')::boolean, false) into v_threshold_only
  from public.platform_settings where key = 'withdrawals_require_unrestricted_threshold';

  if v_balance >= v_threshold then
    v_is_unrestricted := true;

    if p_amount > v_balance then
      raise exception 'amount_exceeds_available_balance';
    end if;
  else
    if v_threshold_only then
      raise exception 'withdrawals_disabled_below_threshold';
    end if;

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
