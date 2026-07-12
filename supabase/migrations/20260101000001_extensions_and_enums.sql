-- ============================================================================
-- 0001 — Extensions & types énumérés
-- ============================================================================
-- Plateforme de télétravail rémunéré : socle de types partagés par tout le
-- schéma. Chaque enum reflète un état métier explicite afin d'interdire au
-- niveau base de données les transitions incohérentes (ex: un retrait ne
-- peut pas passer de "rejected" à "completed").

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- emails insensibles à la casse, uniques

-- Rôles applicatifs. Le contrôle d'accès (RLS + vérifications serveur)
-- s'appuie exclusivement sur cette colonne, jamais sur une donnée cliente.
create type public.app_role as enum ('user', 'admin', 'super_admin');

-- Statut du compte utilisateur.
create type public.account_status as enum ('active', 'suspended', 'banned');

-- Statut générique d'un paiement externe (dépôt) auprès de l'agrégateur.
create type public.payment_status as enum ('pending', 'confirmed', 'failed', 'cancelled', 'expired');

-- Statut d'un retrait.
create type public.withdrawal_status as enum ('pending', 'processing', 'completed', 'rejected', 'cancelled');

-- Statut de progression d'un palier au sein d'un cycle de mission.
create type public.tier_status as enum ('locked', 'awaiting_deposit', 'deposit_processing', 'in_progress', 'completed');

-- Statut global d'un cycle de mission complet (4 paliers).
create type public.cycle_status as enum ('in_progress', 'completed', 'abandoned');

-- Statut d'une mission assignée à un utilisateur.
create type public.mission_assignment_status as enum ('assigned', 'submitted', 'validated', 'rejected', 'expired');

-- Nature d'un mouvement dans le grand livre (ledger) des transactions.
create type public.transaction_type as enum (
  'deposit',
  'withdrawal',
  'mission_reward',
  'referral_commission',
  'adjustment'
);

-- Origine du déclenchement d'une commission de parrainage.
create type public.referral_commission_trigger as enum ('tier_2_validated', 'tier_4_validated');

-- Canal d'envoi des notifications internes.
create type public.notification_type as enum (
  'deposit_confirmed',
  'deposit_failed',
  'withdrawal_approved',
  'withdrawal_rejected',
  'mission_validated',
  'mission_rejected',
  'tier_unlocked',
  'cycle_completed',
  'referral_commission_credited',
  'account_alert',
  'system'
);
