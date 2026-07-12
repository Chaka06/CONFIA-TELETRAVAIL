-- ============================================================================
-- 0001 — Extensions & types énumérés
-- ============================================================================
-- Plateforme de tontine en ligne : socle de types partagés par tout le
-- schéma. Chaque enum reflète un état métier explicite afin d'interdire au
-- niveau base de données les transitions incohérentes.

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- emails insensibles à la casse, uniques

-- Rôles applicatifs. Le contrôle d'accès (RLS + vérifications serveur)
-- s'appuie exclusivement sur cette colonne, jamais sur une donnée cliente.
create type public.app_role as enum ('user', 'admin', 'super_admin');

-- Statut du compte utilisateur.
create type public.account_status as enum ('active', 'suspended', 'banned');

-- Statut générique d'un paiement externe (cotisation) auprès de l'agrégateur.
create type public.payment_status as enum ('pending', 'confirmed', 'failed', 'cancelled', 'expired');

-- Cycle de vie d'une instance de portefeuille (panier concret, avec ses membres).
--   filling   : moins de 10 membres, ouvert aux inscriptions.
--   active    : 10 membres, cotisations en cours pour le round en cours.
--   paused    : un membre a été retiré (défaut de paiement), en attente qu'une
--               nouvelle personne comble la place avant de reprendre.
create type public.basket_instance_status as enum ('filling', 'active', 'paused');

-- Statut d'un membre au sein d'une instance de portefeuille.
create type public.membership_status as enum ('active', 'removed_missed_payment', 'paid_out_left');

-- Statut d'une cotisation due à une échéance donnée.
create type public.contribution_status as enum ('pending', 'paid', 'missed');

-- Statut du versement du gain au gagnant d'un round.
--   pending                : le round vient de se terminer, en attente que le
--                            bénéficiaire indique comment il veut être payé.
--   beneficiary_info_submitted : le bénéficiaire a indiqué son numéro et son
--                            moyen de paiement, en attente de traitement admin.
--   paid                   : l'administrateur a confirmé l'envoi des fonds.
create type public.payout_status as enum ('pending', 'beneficiary_info_submitted', 'paid');

-- Nature d'un mouvement dans le grand livre (ledger) des transactions.
create type public.transaction_type as enum ('contribution', 'payout', 'adjustment');

-- Canal d'envoi des notifications internes.
create type public.notification_type as enum (
  'basket_joined',
  'basket_full',
  'contribution_due',
  'contribution_confirmed',
  'member_removed',
  'spot_opened',
  'payout_ready',
  'payout_confirmed',
  'account_alert',
  'system'
);
