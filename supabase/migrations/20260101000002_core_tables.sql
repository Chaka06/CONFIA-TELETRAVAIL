-- ============================================================================
-- 0002 — Tables métier
-- ============================================================================
-- Convention : tout montant est en FCFA, stocké en numeric(14,2).

-- ----------------------------------------------------------------------------
-- Profils utilisateurs (étend auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 100),
  email citext not null unique,
  date_of_birth date not null check (date_of_birth <= (current_date - interval '18 years')),
  city text not null check (char_length(btrim(city)) between 1 and 120),
  phone_number text not null check (phone_number ~ '^\+?[0-9]{8,15}$'),
  role public.app_role not null default 'user',
  status public.account_status not null default 'active',
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Identité et statut de chaque utilisateur ; 1:1 avec auth.users.';

create index profiles_role_idx on public.profiles (role);

-- ----------------------------------------------------------------------------
-- Paramètres financiers pilotables par l'administration
-- ----------------------------------------------------------------------------
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

comment on table public.platform_settings is 'Paramètres métier modifiables sans déploiement.';

-- ----------------------------------------------------------------------------
-- Types de portefeuille (les 4 formules fixes de tontine)
-- ----------------------------------------------------------------------------
create table public.tontine_basket_types (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  contribution_amount numeric(14, 2) not null check (contribution_amount > 0),
  interval_days smallint not null check (interval_days > 0),
  capacity smallint not null default 10 check (capacity > 0 and capacity % 2 = 0),
  contributions_per_round smallint not null default 5 check (contributions_per_round > 0),
  round_length_days smallint generated always as (interval_days * contributions_per_round) stored,
  payout_amount numeric(14, 2) generated always as (contribution_amount * contributions_per_round * capacity) stored,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.tontine_basket_types is 'Formule fixe d''un portefeuille : montant, fréquence, capacité. round_length_days et payout_amount sont dérivés automatiquement (ex: 1000 FCFA/2j -> 10 jours de round, 50 000 FCFA de gain).';

-- ----------------------------------------------------------------------------
-- Instances concrètes de portefeuille (un panier réel avec ses membres)
-- ----------------------------------------------------------------------------
create table public.tontine_basket_instances (
  id uuid primary key default gen_random_uuid(),
  basket_type_id uuid not null references public.tontine_basket_types (id),
  status public.basket_instance_status not null default 'filling',
  member_count smallint not null default 0 check (member_count >= 0),
  round_number int not null default 1 check (round_number > 0),
  round_started_on date,
  created_at timestamptz not null default now(),
  filled_at timestamptz
);

comment on table public.tontine_basket_instances is 'Un panier concret. round_number s''incrémente à chaque fois qu''un cycle de cotisation redémarre (après remplacement d''un membre retiré ou payé).';

create index tontine_basket_instances_type_status_idx on public.tontine_basket_instances (basket_type_id, status);

-- ----------------------------------------------------------------------------
-- Membres d'une instance de portefeuille, avec leur ordre d'arrivée
-- ----------------------------------------------------------------------------
create table public.tontine_memberships (
  id uuid primary key default gen_random_uuid(),
  basket_instance_id uuid not null references public.tontine_basket_instances (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  join_order int not null,
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  paid_out_at timestamptz,
  removed_at timestamptz
);

comment on table public.tontine_memberships is 'join_order détermine la file d''attente de paiement (premier arrivé, premier payé). Un remplaçant obtient toujours un join_order plus grand (repart en fin de file).';

-- Un seul membership actif par utilisateur et par instance.
create unique index tontine_memberships_active_unique_idx
  on public.tontine_memberships (basket_instance_id, user_id)
  where (status = 'active');

create index tontine_memberships_instance_idx on public.tontine_memberships (basket_instance_id, join_order);
create index tontine_memberships_user_idx on public.tontine_memberships (user_id, status);

-- ----------------------------------------------------------------------------
-- Cotisations dues (une ligne par échéance et par membre)
-- ----------------------------------------------------------------------------
create table public.tontine_contributions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.tontine_memberships (id) on delete cascade,
  round_number int not null,
  occurrence_number smallint not null,
  due_date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  status public.contribution_status not null default 'pending',
  payment_provider text not null default 'genius_pay',
  provider_reference text,
  provider_payload jsonb not null default '{}'::jsonb,
  reminder_sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (membership_id, round_number, occurrence_number)
);

comment on table public.tontine_contributions is 'Échéancier de cotisation d''un membre pour un round donné. Générée intégralement dès que le round démarre.';

create unique index tontine_contributions_provider_reference_idx
  on public.tontine_contributions (payment_provider, provider_reference)
  where (provider_reference is not null);

create index tontine_contributions_due_status_idx on public.tontine_contributions (due_date, status);
create index tontine_contributions_membership_idx on public.tontine_contributions (membership_id);

-- ----------------------------------------------------------------------------
-- Versements aux gagnants de chaque round
-- ----------------------------------------------------------------------------
create table public.tontine_payouts (
  id uuid primary key default gen_random_uuid(),
  basket_instance_id uuid not null references public.tontine_basket_instances (id) on delete cascade,
  round_number int not null,
  membership_id uuid not null references public.tontine_memberships (id),
  amount numeric(14, 2) not null check (amount > 0),
  status public.payout_status not null default 'pending',
  beneficiary_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  beneficiary_phone text,
  beneficiary_payment_method text check (beneficiary_payment_method in ('orange_money', 'wave', 'mtn_money', 'moov_money')),
  beneficiary_submitted_at timestamptz,
  provider_reference text,
  confirmed_by uuid references public.profiles (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (basket_instance_id, round_number)
);

comment on table public.tontine_payouts is 'Un versement par round terminé. beneficiary_token permet au gagnant de renseigner ses coordonnées de paiement via un lien public, sans connexion.';

create index tontine_payouts_status_idx on public.tontine_payouts (status);

-- ----------------------------------------------------------------------------
-- Grand livre : historique informatif de tous les mouvements financiers
-- ----------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(14, 2) not null,
  reference_table text,
  reference_id uuid,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.transactions is 'Journal append-only à but de traçabilité/affichage (pas de solde interne : les cotisations/gains transitent directement via l''agrégateur de paiement).';

create index transactions_user_created_idx on public.transactions (user_id, created_at desc);
create index transactions_reference_idx on public.transactions (reference_table, reference_id);

-- ----------------------------------------------------------------------------
-- Notifications applicatives
-- ----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications (user_id, read_at);

-- ----------------------------------------------------------------------------
-- Journal d'audit (actions sensibles, notamment administratives)
-- ----------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- Journal des e-mails transactionnels
-- ----------------------------------------------------------------------------
create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  template text not null,
  to_email citext not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_logs_user_idx on public.email_logs (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Codes OTP d'inscription (envoyés par l'app elle-même, jamais par Supabase)
-- ----------------------------------------------------------------------------
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

create index email_verification_codes_pending_idx
  on public.email_verification_codes (user_id, purpose, created_at desc)
  where consumed_at is null;

-- ----------------------------------------------------------------------------
-- updated_at automatique
-- ----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
