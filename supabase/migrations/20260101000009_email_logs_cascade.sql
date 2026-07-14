-- ============================================================================
-- 0009 — email_logs doit se supprimer en cascade avec le profil
-- ============================================================================
-- Trouvé lors de l'audit : email_logs.user_id référençait profiles(id) sans
-- "on delete cascade" (contrairement à email_verification_codes, qui l'a
-- correctement). Conséquence réelle et systématique : requestSignupOtp()
-- tente de supprimer un compte d'inscription jamais confirmé pour repartir
-- proprement quand la même adresse retente une inscription — cette
-- suppression échouait TOUJOURS dès qu'un e-mail avait été envoyé au compte
-- (donc dès la toute première tentative, puisque le code OTP est envoyé par
-- e-mail), à cause de cette contrainte de clé étrangère. L'utilisateur se
-- retrouvait alors bloqué avec "un compte existe déjà avec cette adresse
-- e-mail" sans aucun moyen de s'inscrire, même n'ayant jamais activé de
-- compte.

alter table public.email_logs
  drop constraint email_logs_user_id_fkey,
  add constraint email_logs_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade;
