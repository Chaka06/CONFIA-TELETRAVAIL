-- ============================================================================
-- 0005 — Grand livre : fonction unique de mutation du solde
-- ============================================================================
-- Toute variation de solde DOIT transiter par cette fonction. Elle verrouille
-- la ligne wallet (FOR UPDATE), applique le delta, refuse tout solde négatif,
-- et écrit la ligne de ledger correspondante dans la même transaction. Aucune
-- autre fonction du schéma ne doit exécuter de `update wallets` directement.

-- ----------------------------------------------------------------------------
-- Formatage monétaire cohérent avec l'affichage côté application (espace
-- comme séparateur de milliers, sans décimales) pour les textes générés en
-- base (notifications). Les montants sont toujours entiers en pratique
-- (FCFA n'a pas de sous-unité).
-- ----------------------------------------------------------------------------
create function public.fmt_fcfa(p_amount numeric)
returns text
language sql
immutable
as $$
  -- Espace comme séparateur de milliers, indépendant de la locale du serveur
  -- (évite une virgule si lc_numeric n'est pas français), pour un rendu
  -- identique à src/lib/format.ts côté application.
  select regexp_replace(round(p_amount)::text, '\B(?=(\d{3})+(?!\d))', ' ', 'g') || ' FCFA';
$$;

create function public.fn_apply_wallet_delta(
  p_user_id uuid,
  p_delta numeric,
  p_type public.transaction_type,
  p_reference_table text,
  p_reference_id uuid,
  p_description text,
  p_metadata jsonb default '{}'::jsonb
)
returns numeric
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_new_balance numeric(14, 2);
begin
  update public.wallets
  set balance = balance + p_delta,
      lifetime_deposited = lifetime_deposited + (case when p_type = 'deposit' and p_delta > 0 then p_delta else 0 end),
      lifetime_withdrawn = lifetime_withdrawn + (case when p_type = 'withdrawal' and p_delta < 0 then -p_delta else 0 end),
      lifetime_mission_earnings = lifetime_mission_earnings + (case when p_type = 'mission_reward' then p_delta else 0 end),
      lifetime_referral_earnings = lifetime_referral_earnings + (case when p_type = 'referral_commission' then p_delta else 0 end)
  where user_id = p_user_id
  returning balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'wallet_not_found for user %', p_user_id;
  end if;

  if v_new_balance < 0 then
    raise exception 'insufficient_balance for user % (delta %)', p_user_id, p_delta;
  end if;

  insert into public.transactions (
    user_id, type, amount, balance_after, reference_table, reference_id, description, metadata
  ) values (
    p_user_id, p_type, p_delta, v_new_balance, p_reference_table, p_reference_id, p_description, p_metadata
  );

  return v_new_balance;
end;
$$;

revoke all on function public.fn_apply_wallet_delta from public, anon, authenticated;
grant execute on function public.fn_apply_wallet_delta to service_role;

-- Le ledger est immuable : aucune modification ni suppression a posteriori,
-- y compris par le rôle propriétaire applicatif (seules les migrations le peuvent).
revoke update, delete on public.transactions from anon, authenticated, service_role;
