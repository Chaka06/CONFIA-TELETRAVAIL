-- ============================================================================
-- 0010 — Corrige profiles_guard_privileged_fields : il bloquait aussi les
-- écritures système légitimes
-- ============================================================================
-- Trouvé lors de l'audit, confirmé par un test isolé (RAISE WARNING +
-- table de debug) : le trigger de garde ajouté en 0007 pour empêcher un
-- utilisateur de s'auto-attribuer role/status/email_verified_at via une
-- écriture directe sur son propre profil (RLS `profiles_update_own`) se
-- basait uniquement sur `is_admin()`, qui lit `auth.uid()` — or ce GUC est
-- vide dans TOUS les contextes système :
--
--  1. Le trigger `handle_email_confirmation` (déclenché après confirmation
--     d'e-mail sur auth.users) tente d'écrire profiles.email_verified_at —
--     bloqué à chaque fois, donc AUCUN compte n'a jamais réellement été
--     marqué confirmé depuis ce durcissement, quelle que soit la méthode de
--     confirmation. Conséquence concrète et grave : `requestSignupOtp`
--     traite alors TOUT profil existant comme "jamais confirmé" et
--     supprime le compte pour repartir propre — un simple appel non
--     authentifié à l'inscription avec l'e-mail d'un compte actif
--     suffisait à supprimer ce compte réel.
--  2. Les actions admin (adminSetUserRole/adminSetUserStatus, via le
--     client service_role) écrivent aussi profiles.role/status — bloquées
--     silencieusement de la même façon (aucune erreur renvoyée, la valeur
--     ne change juste jamais) : la gestion des rôles/statuts utilisateurs
--     dans /pouri/utilisateurs était intégralement non fonctionnelle.
--
-- Correctif : reconnaît deux contextes légitimes en plus de is_admin() —
--  - `current_setting('role') = 'service_role'` : la requête vient du
--    client service_role (admin.from(...).update(...), déjà hors RLS par
--    conception, donc digne de confiance pour ce garde-fou aussi) ;
--  - `current_user = 'postgres'` : on est dans une fonction SECURITY
--    DEFINER possédée par postgres (handle_email_confirmation) — un client
--    ne peut jamais se connecter directement en tant que postgres via
--    PostgREST, donc ce cas ne peut survenir que depuis un déclencheur
--    système interne, jamais depuis une écriture cliente directe.

create or replace function public.profiles_guard_privileged_fields()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin()
     and current_setting('role', true) is distinct from 'service_role'
     and current_user is distinct from 'postgres'
  then
    new.role := old.role;
    new.status := old.status;
    new.email_verified_at := old.email_verified_at;
  end if;
  return new;
end;
$$;
