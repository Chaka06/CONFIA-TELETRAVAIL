-- ============================================================================
-- 0011 — Durcissement des privilèges
-- ============================================================================
-- Défense en profondeur : même si une policy RLS était mal écrite demain, le
-- rôle `authenticated` ne doit physiquement pas avoir le privilège SQL
-- d'INSERT/DELETE sur les tables financières. Toute écriture transite par les
-- fonctions RPC SECURITY DEFINER (déjà accordées individuellement plus haut),
-- exécutées avec les privilèges du propriétaire de table (postgres), qui
-- contourne à la fois RLS et ces GRANT/REVOKE.

grant usage on schema public to anon, authenticated;

-- Lecture seule pour les utilisateurs authentifiés (RLS restreint ensuite aux
-- lignes qui leur appartiennent, ou à l'administration).
grant select on
  public.profiles,
  public.wallets,
  public.platform_settings,
  public.tier_definitions,
  public.mission_cycles,
  public.cycle_tiers,
  public.deposits,
  public.withdrawal_rights,
  public.withdrawals,
  public.referral_commissions,
  public.transactions,
  public.notifications
to authenticated;

-- mission_assignments : privilège colonne par colonne, à l'exclusion
-- d'expected_answer. Défense en profondeur pour la correction automatique :
-- même un bug applicatif qui ferait un `select *` ne peut pas exposer la
-- réponse correcte à l'utilisateur avant sa soumission.
grant select (
  id, user_id, cycle_id, tier_number, slot_number, template_id, variant_seed,
  variant_content, content_hash, reward_amount, status, submission_data,
  assigned_at, submitted_at, validated_at, expires_at
) on public.mission_assignments to authenticated;

-- Seules deux tables acceptent une écriture directe côté client, et
-- uniquement sur les colonnes non sensibles (garanti par les triggers
-- profiles_guard_privileged_fields et notifications_guard_fields, 0009).
grant update on public.profiles to authenticated;
grant update on public.notifications to authenticated;

-- Le rôle anonyme n'a besoin d'aucun accès direct aux tables : l'inscription
-- et la connexion passent exclusivement par Supabase Auth (schéma auth),
-- qui déclenche ensuite les triggers serveur (0004). Seules les règles
-- métier publiques (paliers, paramètres) sont lisibles avant connexion, pour
-- que la page d'accueil les explique sans ambiguïté aux visiteurs.
revoke all on all tables in schema public from anon;
grant usage on schema public to anon;
grant select on public.tier_definitions, public.platform_settings to anon;

-- service_role bypasse RLS nativement sur Supabase ; on le rend explicite ici
-- pour que le comportement soit identique quel que soit l'environnement.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;
