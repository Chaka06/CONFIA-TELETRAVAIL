-- ============================================================================
-- 0003 — Données de référence (paliers + paramètres financiers)
-- ============================================================================
-- Ces valeurs pilotent tout le moteur de progression. Elles sont modifiables
-- uniquement par un super_admin via l'administration (jamais codées en dur
-- côté application) afin que toute évolution commerciale ne nécessite aucun
-- déploiement de code.

insert into public.tier_definitions (tier_number, required_deposit_amount, mission_reward_amount, missions_per_tier, label)
values
  (1, 2000, 1000, 3, 'Palier 1'),
  (2, 2000, 1500, 3, 'Palier 2'),
  (3, 3000, 2000, 3, 'Palier 3'),
  (4, 5000, 5000, 3, 'Palier 4');

insert into public.platform_settings (key, value, description)
values
  ('withdrawal_right_cap_amount', '5000', 'Plafond FCFA d''un retrait unique débloqué par un cycle de mission complété.'),
  ('unrestricted_withdrawal_threshold', '200000', 'Actif total (FCFA) à partir duquel la restriction "un retrait par cycle" est levée.'),
  ('referral_commission_tier_2_amount', '2000', 'Commission FCFA versée au parrain quand le filleul valide le palier 2.'),
  ('referral_commission_tier_4_amount', '3000', 'Commission FCFA versée au parrain quand le filleul valide le palier 4.'),
  ('referral_commission_applies_to_first_cycle_only', 'true', 'Si vrai, les commissions ne sont déclenchées que par le premier cycle de mission du filleul, afin d''éviter tout abus par répétition de cycles.'),
  ('mission_default_expiry_hours', '48', 'Délai par défaut avant expiration d''une mission assignée non soumise.'),
  ('min_account_age_years', '18', 'Âge minimum requis à l''inscription.');
