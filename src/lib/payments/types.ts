/**
 * Abstraction du fournisseur de paiement. Le reste de l'application (routes
 * API de dépôt/retrait) ne dépend jamais directement de Genius Pay : elle
 * dépend de cette interface. Changer d'agrégateur ne nécessite donc qu'une
 * nouvelle implémentation de `PaymentProvider`, sans toucher au moteur des
 * paliers ni à la logique métier.
 */

export type PaymentSessionParams = {
  /** Identifiant du dépôt (public.deposits.id) — transmis en metadata, jamais comme référence. */
  depositId: string;
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

export type PayoutParams = {
  /** Identifiant du retrait (public.withdrawals.id) — transmis en metadata. */
  withdrawalId: string;
  amount: number;
  currency: "XOF";
  destination: {
    phoneNumber: string;
    fullName: string;
  };
};

export type PayoutResult = {
  providerReference: string;
  status: "pending" | "processing" | "completed" | "failed";
};

export type PaymentWebhookEvent =
  | { type: "deposit.confirmed"; depositId: string; providerReference: string; providerEventId: string }
  | { type: "deposit.failed"; depositId: string; providerReference: string; reason: string; providerEventId: string }
  | { type: "payout.completed"; withdrawalId: string; providerReference: string; providerEventId: string }
  | { type: "payout.failed"; withdrawalId: string; providerReference: string; reason: string; providerEventId: string }
  /** Événement reçu mais sans action métier à ce stade (ex: payment.initiated, cashout.requested). */
  | { type: "ignored"; rawEvent: string; providerEventId: string };

export interface PaymentProvider {
  /** Crée une session de paiement pour financer un dépôt de palier (page de checkout hébergée). */
  createDepositSession(params: PaymentSessionParams): Promise<PaymentSession>;

  /** Déclenche un virement/paiement mobile money vers l'utilisateur (retrait). */
  createPayout(params: PayoutParams): Promise<PayoutResult>;

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
