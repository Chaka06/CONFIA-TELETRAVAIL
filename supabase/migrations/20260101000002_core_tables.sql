-- ============================================================================
-- 0002 — Tables métier
-- ============================================================================
-- Convention : tout montant est en FCFA, stocké en numeric(14,2) sans
-- décimales utilisées en pratique (FCFA n'a pas de sous-unité), la précision
-- est conservée pour absorber d'éventuels frais/prorata futurs sans migration.

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
  referral_code text not null unique check (referral_code ~ '^[A-Z0-9]{6,10}$'),
  referred_by uuid references public.profiles (id),
  role public.app_role not null default 'user',
  status public.account_status not null default 'active',
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_no_self_referral check (referred_by is null or referred_by <> id)
);

comment on table public.profiles is 'Identité et statut de chaque utilisateur ; 1:1 avec auth.users.';
comment on column public.profiles.referral_code is 'Code promo unique et permanent attribué à l''inscription, utilisé par les filleuls.';

create index profiles_referred_by_idx on public.profiles (referred_by);
create index profiles_referral_code_idx on public.profiles (referral_code);
create index profiles_role_idx on public.profiles (role);

-- ----------------------------------------------------------------------------
-- Portefeuille
-- ----------------------------------------------------------------------------
create table public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance numeric(14, 2) not null default 0 check (balance >= 0),
  lifetime_deposited numeric(14, 2) not null default 0 check (lifetime_deposited >= 0),
  lifetime_withdrawn numeric(14, 2) not null default 0 check (lifetime_withdrawn >= 0),
  lifetime_mission_earnings numeric(14, 2) not null default 0 check (lifetime_mission_earnings >= 0),
  lifetime_referral_earnings numeric(14, 2) not null default 0 check (lifetime_referral_earnings >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.wallets is 'Solde/actif courant. Modifié uniquement par les fonctions RPC transactionnelles, jamais directement.';

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

comment on table public.platform_settings is 'Paramètres métier modifiables sans déploiement (seuils, plafonds, montants).';

-- ----------------------------------------------------------------------------
-- Définition statique des 4 paliers
-- ----------------------------------------------------------------------------
create table public.tier_definitions (
  tier_number smallint primary key check (tier_number between 1 and 4),
  required_deposit_amount numeric(14, 2) not null check (required_deposit_amount > 0),
  mission_reward_amount numeric(14, 2) not null check (mission_reward_amount > 0),
  missions_per_tier smallint not null default 3 check (missions_per_tier > 0),
  label text not null
);

comment on table public.tier_definitions is 'Référentiel des 4 paliers obligatoires. Modifiable uniquement par un super_admin, jamais par le moteur applicatif.';

-- ----------------------------------------------------------------------------
-- Cycles de mission (une "mission complète" = 4 paliers)
-- ----------------------------------------------------------------------------
create table public.mission_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cycle_number smallint not null check (cycle_number > 0),
  status public.cycle_status not null default 'in_progress',
  current_tier smallint not null default 1 check (current_tier between 1 and 4),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, cycle_number)
);

comment on table public.mission_cycles is 'Un cycle = un parcours complet des 4 paliers. Un utilisateur peut enchaîner plusieurs cycles.';

create index mission_cycles_user_status_idx on public.mission_cycles (user_id, status);

-- ----------------------------------------------------------------------------
-- Progression palier par palier au sein d'un cycle
-- ----------------------------------------------------------------------------
create table public.cycle_tiers (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.mission_cycles (id) on delete cascade,
  tier_number smallint not null references public.tier_definitions (tier_number),
  status public.tier_status not null default 'locked',
  missions_completed_count smallint not null default 0 check (missions_completed_count >= 0),
  unlocked_at timestamptz,
  completed_at timestamptz,
  unique (cycle_id, tier_number)
);

comment on table public.cycle_tiers is 'État d''un palier donné pour un cycle donné : locked -> awaiting_deposit -> deposit_processing -> in_progress -> completed.';

create index cycle_tiers_cycle_idx on public.cycle_tiers (cycle_id);

-- ----------------------------------------------------------------------------
-- Dépôts (paiements entrants via l'agrégateur)
-- ----------------------------------------------------------------------------
create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cycle_tier_id uuid not null references public.cycle_tiers (id),
  amount numeric(14, 2) not null check (amount > 0),
  payment_provider text not null default 'genius_pay',
  provider_reference text,
  provider_payload jsonb not null default '{}'::jsonb,
  status public.payment_status not null default 'pending',
  initiated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  failed_reason text
);

comment on table public.deposits is 'Chaque dépôt finance EXCLUSIVEMENT le déblocage d''un palier précis. Doit toujours provenir d''un paiement externe réel, jamais du solde interne.';

-- Un seul dépôt confirmé par palier (les tentatives échouées/pending peuvent se multiplier).
create unique index deposits_one_confirmed_per_tier_idx
  on public.deposits (cycle_tier_id)
  where (status = 'confirmed');

-- Idempotence des webhooks de l'agrégateur.
create unique index deposits_provider_reference_idx
  on public.deposits (payment_provider, provider_reference)
  where (provider_reference is not null);

create index deposits_user_status_idx on public.deposits (user_id, status);

-- ----------------------------------------------------------------------------
-- Modèles de missions + missions assignées (variantes uniques par utilisateur)
-- ----------------------------------------------------------------------------
create table public.mission_templates (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  description text not null,
  -- Clé de dispatch vers la fonction PL/pgSQL fn_generate_<generator_key>()
  -- qui produit à la fois le contenu affiché et la réponse attendue.
  -- Chaque catégorie a une logique de génération/correction propre : la
  -- génération n'est donc pas pilotée par un schéma générique mais par du
  -- code dédié par catégorie (voir 0007).
  generator_key text not null,
  estimated_duration_seconds int not null default 180 check (estimated_duration_seconds between 60 and 600),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mission_templates is 'Catalogue des catégories de missions actives. Chaque ligne référence un générateur PL/pgSQL dédié (generator_key) qui produit un contenu réel et une réponse correcte connue du serveur.';

create index mission_templates_category_active_idx on public.mission_templates (category, is_active);

create table public.mission_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cycle_id uuid not null references public.mission_cycles (id) on delete cascade,
  tier_number smallint not null,
  slot_number smallint not null check (slot_number between 1 and 3),
  template_id uuid not null references public.mission_templates (id),
  variant_seed text not null,
  variant_content jsonb not null,
  content_hash text generated always as (md5(variant_content::text)) stored,
  -- Réponse correcte, calculée à la génération, jamais transmise au client
  -- (voir le retrait de privilège colonne par colonne en 0011). Sert à la
  -- correction automatique dans submit_mission_assignment.
  expected_answer jsonb not null,
  reward_amount numeric(14, 2) not null check (reward_amount > 0),
  status public.mission_assignment_status not null default 'assigned',
  submission_data jsonb,
  assigned_at timestamptz not null default now(),
  submitted_at timestamptz,
  validated_at timestamptz,
  expires_at timestamptz
);

comment on table public.mission_assignments is 'Instance concrète d''une mission attribuée à un utilisateur, corrigée automatiquement à la soumission. La contrainte unique sur content_hash garantit qu''aucune mission générée n''est un doublon exact.';

-- Un seul slot "actif" (non rejeté/expiré) par cycle+palier+emplacement : en cas
-- de rejet, une nouvelle mission peut être régénérée pour le même emplacement
-- sans jamais perdre la trace de l'historique des tentatives précédentes.
create unique index mission_assignments_active_slot_idx
  on public.mission_assignments (cycle_id, tier_number, slot_number)
  where (status not in ('rejected', 'expired'));

-- Garantit au niveau base de données qu'aucune mission générée n'est identique octet pour octet à une autre.
create unique index mission_assignments_content_hash_idx on public.mission_assignments (content_hash);

create index mission_assignments_user_status_idx on public.mission_assignments (user_id, status);
create index mission_assignments_cycle_idx on public.mission_assignments (cycle_id);

-- ----------------------------------------------------------------------------
-- Droits de retrait débloqués par cycle complété
-- ----------------------------------------------------------------------------
create table public.withdrawal_rights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_cycle_id uuid not null unique references public.mission_cycles (id),
  cap_amount numeric(14, 2) not null default 5000 check (cap_amount > 0),
  status text not null default 'available' check (status in ('available', 'used', 'void')),
  granted_at timestamptz not null default now(),
  used_at timestamptz
);

comment on table public.withdrawal_rights is 'Un droit = un cycle de mission complété = un retrait unique plafonné (par défaut 5000 FCFA).';

create index withdrawal_rights_user_status_idx on public.withdrawal_rights (user_id, status);

-- ----------------------------------------------------------------------------
-- Retraits
-- ----------------------------------------------------------------------------
create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  withdrawal_right_id uuid references public.withdrawal_rights (id),
  is_unrestricted boolean not null default false,
  destination_provider text not null default 'genius_pay',
  destination_details jsonb not null,
  status public.withdrawal_status not null default 'pending',
  provider_reference text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  rejected_reason text,
  processed_by uuid references public.profiles (id),
  constraint withdrawals_right_or_unrestricted check (
    (withdrawal_right_id is not null and is_unrestricted = false)
    or (withdrawal_right_id is null and is_unrestricted = true)
  )
);

comment on table public.withdrawals is 'Un retrait est soit adossé à un droit unique (< seuil de déblocage), soit "libre" une fois l''actif >= seuil de retrait illimité.';

-- Un droit de retrait ne peut financer qu'un seul retrait.
create unique index withdrawals_one_per_right_idx
  on public.withdrawals (withdrawal_right_id)
  where (withdrawal_right_id is not null);

create index withdrawals_user_status_idx on public.withdrawals (user_id, status);

-- ----------------------------------------------------------------------------
-- Commissions de parrainage
-- ----------------------------------------------------------------------------
create table public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referee_id uuid not null references public.profiles (id) on delete cascade,
  cycle_id uuid not null references public.mission_cycles (id),
  trigger_type public.referral_commission_trigger not null,
  amount numeric(14, 2) not null check (amount > 0),
  status text not null default 'credited' check (status in ('credited', 'reversed')),
  created_at timestamptz not null default now(),
  -- Une commission donnée (tier_2 ou tier_4) ne peut être versée qu'une seule fois
  -- par relation de parrainage, même si le filleul enchaîne plusieurs cycles.
  unique (referee_id, trigger_type)
);

comment on table public.referral_commissions is 'Traçabilité immuable des commissions. 2000 FCFA au palier 2 validé, 3000 FCFA au palier 4 validé, une seule fois par filleul.';

create index referral_commissions_referrer_idx on public.referral_commissions (referrer_id);

-- ----------------------------------------------------------------------------
-- Grand livre : historique immuable de tous les mouvements financiers
-- ----------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(14, 2) not null,
  balance_after numeric(14, 2) not null check (balance_after >= 0),
  reference_table text,
  reference_id uuid,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.transactions is 'Journal comptable append-only. Toute variation du solde doit y correspondre exactement une ligne.';

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

create trigger wallets_set_updated_at before update on public.wallets
  for each row execute function public.set_updated_at();

create trigger mission_templates_set_updated_at before update on public.mission_templates
  for each row execute function public.set_updated_at();
