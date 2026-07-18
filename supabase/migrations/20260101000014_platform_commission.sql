-- ============================================================================
-- 0015 — Commission plateforme de 5% sur le gain de chaque panier
-- ============================================================================
-- Décision produit explicite de l'utilisateur : la plateforme conserve 5% du
-- montant total collecté sur chaque panier — le gagnant reçoit 95%, pas
-- 100%. Aucun panier réel n'était en cours au moment de cette migration
-- (les 4 instances étaient vides, member_count = 0) : aucun utilisateur
-- n'a payé sur la base de l'ancien montant à 100%, donc aucun problème
-- d'équité à gérer pour des paniers déjà en cours de remplissage.
--
-- payout_amount étant une colonne générée, elle ne peut pas lire une table
-- externe (platform_settings) : le taux de commission vit donc directement
-- sur tontine_basket_types, avec la possibilité de différer par formule à
-- l'avenir si besoin. Une colonne générée ne peut pas être modifiée en
-- place (pas de ALTER COLUMN ... SET EXPRESSION pour les colonnes stored) :
-- on la supprime et on la recrée avec la nouvelle formule.

alter table public.tontine_basket_types
  add column commission_rate numeric(5, 4) not null default 0.05
    check (commission_rate >= 0 and commission_rate < 1);

alter table public.tontine_basket_types drop column payout_amount;
alter table public.tontine_basket_types
  add column payout_amount numeric(14, 2)
    generated always as (contribution_amount * contributions_per_round * capacity * (1 - commission_rate)) stored;

comment on column public.tontine_basket_types.commission_rate is 'Part du montant total du panier conservée par la plateforme (0.05 = 5%). Configurable par formule.';
comment on table public.tontine_basket_types is 'Formule fixe d''un portefeuille : montant, fréquence, capacité. round_length_days et payout_amount (net de la commission plateforme) sont dérivés automatiquement.';
