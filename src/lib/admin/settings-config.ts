/**
 * Libellés français et type d'affichage pour chaque paramètre stocké dans
 * `platform_settings`. La clé technique reste l'identifiant en base —
 * invisible pour l'administrateur, qui ne doit voir que du français clair.
 */
export type SettingDisplayType = "amount" | "boolean" | "number" | "duration_hours";

export const SETTINGS_DISPLAY: Record<string, { label: string; type: SettingDisplayType }> = {};

export function getSettingDisplay(key: string) {
  return SETTINGS_DISPLAY[key] ?? { label: key, type: "number" as SettingDisplayType };
}
