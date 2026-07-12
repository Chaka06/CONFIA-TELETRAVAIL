import "server-only";

import type { PaymentProvider } from "./types";
import { geniusPayProvider } from "./genius-pay";

export type { PaymentProvider } from "./types";
export * from "./types";

/**
 * Point d'entrée unique du module paiement. Si un second agrégateur devait
 * être supporté (bascule, redondance), c'est ici — et uniquement ici — que
 * le choix serait arbitré (ex: via `platform_settings`).
 */
export function getPaymentProvider(): PaymentProvider {
  return geniusPayProvider;
}
