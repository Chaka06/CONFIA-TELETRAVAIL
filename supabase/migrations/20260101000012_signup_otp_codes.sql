-- ============================================================================
-- 0012 — Codes de vérification d'e-mail à l'inscription (OTP applicatif)
-- ============================================================================
-- Les codes sont générés, stockés (hashés) et envoyés entièrement par l'app
-- Next.js via son propre SMTP (cf. src/lib/email) — jamais par le mailer
-- natif de Supabase Auth. Accès exclusivement via service_role.

create table public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email citext not null,
  code_hash text not null,
  purpose text not null default 'signup' check (purpose in ('signup')),
  attempts smallint not null default 0,
  max_attempts smallint not null default 5,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.email_verification_codes is 'Codes OTP à 6 chiffres envoyés par l''app elle-même (jamais par Supabase) pour valider une adresse e-mail à l''inscription.';

create index email_verification_codes_pending_idx
  on public.email_verification_codes (user_id, purpose, created_at desc)
  where consumed_at is null;

alter table public.email_verification_codes enable row level security;
-- Aucune policy : table lue/écrite exclusivement via le client service_role
-- (qui contourne RLS), jamais depuis le client authentifié ou anonyme.
revoke all on public.email_verification_codes from authenticated, anon;

-- Le GRANT global du 0011 (`grant all ... to service_role`) ne s'applique
-- qu'aux tables existant à ce moment-là, pas aux tables créées ensuite : il
-- faut le répéter explicitement ici, sinon service_role se heurte à un
-- "permission denied" malgré le bypass RLS.
grant all on public.email_verification_codes to service_role;
