-- ============================================================================
-- 0017 — Complète le correctif de la migration 0016 : la policy RLS seule
-- ne suffisait pas
-- ============================================================================
-- La migration 0016 a créé basket_instances_select_all (`for select using
-- (true)`) mais a oublié le GRANT SELECT de base sur le rôle `anon` — sans
-- lui, Postgres refuse la requête (42501 permission denied) avant même
-- d'évaluer la policy RLS. Trouvé en audit complet : /paniers affichait donc
-- toujours "0/20 membres" aux visiteurs anonymes en production, malgré la
-- migration 0016 déjà déployée — le bug qu'elle devait corriger n'avait
-- jamais été réellement corrigé.
--
-- Comparaison : tontine_basket_types (même page publique) a bien les deux
-- (policy migration 0007 + `grant select ... to anon` ligne 178 de la même
-- migration) — c'est ce second morceau qui manquait ici.

grant select on public.tontine_basket_instances to anon;
