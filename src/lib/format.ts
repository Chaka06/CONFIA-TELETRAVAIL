export function formatFcfa(amount: number): string {
  // Séparateur de milliers en espace normale (et non l'espace fine
  // insécable renvoyée par Intl "fr-FR"), pour un rendu net et lisible
  // dans toutes les tailles de police et à la copie/collage.
  const withThousandsSeparator = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${withThousandsSeparator} FCFA`;
}
