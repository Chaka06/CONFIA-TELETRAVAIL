-- ============================================================================
-- 0006 — Dépôts : initiation et confirmation
-- ============================================================================
-- Règle absolue du cahier des charges : un dépôt de palier doit TOUJOURS
-- provenir d'un nouveau paiement externe. Ce module ne fournit aucune voie
-- permettant de financer un dépôt depuis le solde interne : `initiate_deposit`
-- ne fait que créer une intention de paiement, et seule `confirm_deposit`
-- (appelée par le webhook de l'agrégateur, jamais par le client) crédite le
-- portefeuille.

-- ----------------------------------------------------------------------------
-- Initiation : appelée par l'utilisateur authentifié avant redirection vers
-- Genius Pay. Ne touche jamais au solde.
-- ----------------------------------------------------------------------------
create function public.initiate_deposit(p_cycle_tier_id uuid)
returns public.deposits
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_tier public.cycle_tiers%rowtype;
  v_required numeric(14, 2);
  v_deposit public.deposits;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select ct.* into v_tier
  from public.cycle_tiers ct
  join public.mission_cycles mc on mc.id = ct.cycle_id
  where ct.id = p_cycle_tier_id and mc.user_id = v_uid
  for update;

  if not found then
    raise exception 'tier_not_found_or_not_owned';
  end if;

  if v_tier.status <> 'awaiting_deposit' then
    raise exception 'tier_not_awaiting_deposit (current status: %)', v_tier.status;
  end if;

  select required_deposit_amount into v_required
  from public.tier_definitions
  where tier_number = v_tier.tier_number;

  update public.cycle_tiers
  set status = 'deposit_processing'
  where id = v_tier.id;

  insert into public.deposits (user_id, cycle_tier_id, amount, status)
  values (v_uid, v_tier.id, v_required, 'pending')
  returning * into v_deposit;

  return v_deposit;
end;
$$;

revoke all on function public.initiate_deposit from public, anon;
grant execute on function public.initiate_deposit to authenticated;

-- ----------------------------------------------------------------------------
-- Confirmation : appelée EXCLUSIVEMENT par le serveur (route API du webhook
-- Genius Pay) après vérification de la signature du paiement. Jamais par le
-- client, jamais avec le solde du portefeuille comme source.
-- ----------------------------------------------------------------------------
create function public.confirm_deposit(
  p_deposit_id uuid,
  p_provider_reference text,
  p_provider_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_deposit public.deposits%rowtype;
begin
  select * into v_deposit from public.deposits where id = p_deposit_id for update;

  if not found then
    raise exception 'deposit_not_found';
  end if;

  if v_deposit.status = 'confirmed' then
    -- Idempotence : un webhook rejoué ne doit pas créditer deux fois.
    return;
  end if;

  if v_deposit.status <> 'pending' then
    raise exception 'deposit_not_pending (current status: %)', v_deposit.status;
  end if;

  update public.deposits
  set status = 'confirmed',
      confirmed_at = now(),
      provider_reference = p_provider_reference,
      provider_payload = p_provider_payload
  where id = v_deposit.id;

  update public.cycle_tiers
  set status = 'in_progress'
  where id = v_deposit.cycle_tier_id;

  -- Génère immédiatement les 3 missions du palier (voir 0007) dans la même
  -- transaction : un dépôt confirmé garantit toujours des missions disponibles.
  perform public.fn_generate_tier_missions(v_deposit.cycle_tier_id);

  perform public.fn_apply_wallet_delta(
    v_deposit.user_id,
    v_deposit.amount,
    'deposit',
    'deposits',
    v_deposit.id,
    format('Dépôt confirmé (%s) via %s', public.fmt_fcfa(v_deposit.amount), v_deposit.payment_provider),
    jsonb_build_object('cycle_tier_id', v_deposit.cycle_tier_id)
  );

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    v_deposit.user_id,
    'deposit_confirmed',
    'Dépôt confirmé',
    format('Votre dépôt de %s a été confirmé. Vos missions sont désormais disponibles.', public.fmt_fcfa(v_deposit.amount)),
    jsonb_build_object('deposit_id', v_deposit.id)
  );
end;
$$;

revoke all on function public.confirm_deposit from public, anon, authenticated;
grant execute on function public.confirm_deposit to service_role;

-- ----------------------------------------------------------------------------
-- Échec : appelée par le serveur si l'agrégateur notifie un échec/annulation.
-- ----------------------------------------------------------------------------
create function public.fail_deposit(p_deposit_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_deposit public.deposits%rowtype;
begin
  select * into v_deposit from public.deposits where id = p_deposit_id for update;

  if not found then
    raise exception 'deposit_not_found';
  end if;

  if v_deposit.status <> 'pending' then
    return;
  end if;

  update public.deposits
  set status = 'failed', failed_reason = p_reason
  where id = v_deposit.id;

  -- Le palier redevient éligible à un nouveau dépôt.
  update public.cycle_tiers
  set status = 'awaiting_deposit'
  where id = v_deposit.cycle_tier_id and status = 'deposit_processing';

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    v_deposit.user_id,
    'deposit_failed',
    'Dépôt refusé',
    format('Votre dépôt de %s n''a pas abouti (%s). Vous pouvez réessayer.', public.fmt_fcfa(v_deposit.amount), coalesce(p_reason, 'raison inconnue')),
    jsonb_build_object('deposit_id', v_deposit.id)
  );
end;
$$;

revoke all on function public.fail_deposit from public, anon, authenticated;
grant execute on function public.fail_deposit to service_role;
