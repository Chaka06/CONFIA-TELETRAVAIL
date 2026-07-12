/**
 * Libellés français et type d'affichage pour chaque paramètre stocké dans
 * `platform_settings`. La clé technique (ex: `withdrawal_right_cap_amount`)
 * reste l'identifiant en base — invisible pour l'administrateur, qui ne doit
 * voir que du français clair.
 */
export type SettingDisplayType = "amount" | "boolean" | "number" | "duration_hours";

export const SETTINGS_DISPLAY: Record<string, { label: string; type: SettingDisplayType }> = {
  min_account_age_years: { label: "Âge minimum à l'inscription (années)", type: "number" },
  mission_default_expiry_hours: {
    label: "Délai avant expiration d'une mission non soumise",
    type: "duration_hours",
  },
  referral_commission_applies_to_first_cycle_only: {
    label: "Commissions de parrainage limitées au premier cycle du filleul",
    type: "boolean",
  },
  referral_commission_tier_2_amount: {
    label: "Commission de parrainage — palier 2 validé",
    type: "amount",
  },
  referral_commission_tier_4_amount: {
    label: "Commission de parrainage — palier 4 validé",
    type: "amount",
  },
  unrestricted_withdrawal_threshold: {
    label: "Seuil d'actif pour le retrait illimité",
    type: "amount",
  },
  withdrawal_right_cap_amount: {
    label: "Plafond d'un retrait unique débloqué",
    type: "amount",
  },
  withdrawals_require_unrestricted_threshold: {
    label: "Retraits limités au seuil illimité (droits de cycle désactivés — en attendant l'API de payout GeniusPay)",
    type: "boolean",
  },
};

export function getSettingDisplay(key: string) {
  return SETTINGS_DISPLAY[key] ?? { label: key, type: "number" as SettingDisplayType };
}
