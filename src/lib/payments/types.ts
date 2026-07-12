/**
 * Abstraction du fournisseur de paiement. Le reste de l'application ne
 * dépend jamais directement de Genius Pay : elle dépend de cette interface.
 *
 * Modèle tontine : seules les cotisations (entrantes) passent par
 * l'agrégateur. Les gains (sortants) sont versés manuellement par
 * l'administrateur — GeniusPay n'expose pas encore d'API de payout — donc
 * aucune abstraction de paiement sortant n'est nécessaire ici.
 */

export type PaymentSessionParams = {
  /** Identifiant de la cotisation (public.tontine_contributions.id) — transmis en metadata. */
  contributionId: string;
  amount: number;
  currency: "XOF";
  customer: {
    fullName: string;
    email: string;
    phoneNumber: string;
  };
  description: string;
  /** URL de retour après paiement réussi. */
  successUrl: string;
  /** URL de retour après paiement échoué/annulé. */
  errorUrl: string;
};

export type PaymentSession = {
  /** URL de la page de checkout hébergée Genius Pay vers laquelle rediriger l'utilisateur. */
  redirectUrl: string;
  /** Référence Genius Pay (format MTX-XXXXXXXXXX), conservée pour l'audit et le support. */
  providerReference: string;
};

export type PaymentWebhookEvent =
  | { type: "contribution.confirmed"; contributionId: string; providerReference: string; providerEventId: string }
  | { type: "contribution.failed"; contributionId: string; providerReference: string; reason: string; providerEventId: string }
  /** Événement reçu mais sans action métier à ce stade (ex: payment.initiated, payment.refunded). */
  | { type: "ignored"; rawEvent: string; providerEventId: string };

export interface PaymentProvider {
  /** Crée une session de paiement pour financer une cotisation (page de checkout hébergée). */
  createContributionSession(params: PaymentSessionParams): Promise<PaymentSession>;

  /**
   * Vérifie l'authenticité et la fraîcheur d'un webhook entrant (signature
   * HMAC-SHA256 sur `timestamp + "." + corps brut`, avec protection anti-rejeu).
   */
  verifyWebhookSignature(params: {
    rawBody: string;
    signatureHeader: string | null;
    timestampHeader: string | null;
  }): boolean;

  /** Interprète le corps d'un webhook déjà vérifié en événement métier typé. */
  parseWebhookEvent(rawBody: string): PaymentWebhookEvent;
}
