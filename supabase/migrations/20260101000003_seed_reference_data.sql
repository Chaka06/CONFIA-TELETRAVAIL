-- ============================================================================
-- 0003 — Données de référence : les 4 formules de portefeuille
-- ============================================================================

insert into public.tontine_basket_types (label, contribution_amount, interval_days, capacity, contributions_per_round)
values
  ('Panier 1 000 FCFA', 1000, 2, 10, 5),
  ('Panier 3 000 FCFA', 3000, 3, 10, 5),
  ('Panier 5 000 FCFA', 5000, 5, 10, 5),
  ('Panier 10 000 FCFA', 10000, 10, 10, 5);
