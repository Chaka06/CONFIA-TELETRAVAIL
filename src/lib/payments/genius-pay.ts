import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/env";
import type {
  PaymentProvider,
  PaymentSession,
  PaymentSessionParams,
  PaymentWebhookEvent,
} from "./types";

/**
 * Adaptateur Genius Pay — conforme à la documentation officielle
 * (https://geniuspay.ci/docs, API Marchand v1.0).
 *
 * Points clés de cette API réelle (à ne pas modifier sans revérifier la doc) :
 *  - Authentification par deux en-têtes `X-API-Key` (publique) et
 *    `X-API-Secret` (secrète), jamais un `Authorization: Bearer`.
 *  - La création d'un paiement SANS `payment_method` renvoie une
 *    `checkout_url` hébergée (le client choisit Wave/Orange/MTN/carte...).
 *  - Genius Pay attribue lui-même la référence de transaction
 *    (`MTX-XXXXXXXXXX`) : la corrélation avec nos enregistrements
 *    (`tontine_contributions.id`) se fait exclusivement via le champ
 *    `metadata`, renvoyé tel quel dans la réponse de création ET dans le webhook.
 *  - Signature de webhook : HMAC-SHA256(`timestamp` + "." + corps brut,
 *    secret), avec une fenêtre anti-rejeu de 5 minutes.
 *
 * GeniusPay n'a pas (encore) d'API de payout : les gains de la tontine sont
 * versés manuellement par l'administrateur, jamais via cet adaptateur.
 */

const GENIUS_PAY_SIGNATURE_HEADER = "x-webhook-signature";
const GENIUS_PAY_TIMESTAMP_HEADER = "x-webhook-timestamp";
const REPLAY_WINDOW_SECONDS = 300;

type GeniusPayApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type GeniusPayPaymentData = {
  id: number;
  reference: string;
  checkout_url?: string;
  payment_url: string;
  status: string;
  metadata?: Record<string, unknown>;
};

type GeniusPayWebhookTransaction = {
  object: string;
  id: number;
  reference: string;
  amount: number;
  status: string;
  metadata?: Record<string, unknown>;
  failure_reason?: string;
};

type GeniusPayWebhookPayload = {
  id: string;
  event:
    | "payment.initiated"
    | "payment.success"
    | "payment.failed"
    | "payment.cancelled"
    | "payment.refunded"
    | "payment.expired"
    | "cashout.requested"
    | "cashout.approved"
    | "cashout.completed"
    | "cashout.failed"
    | "webhook.test";
  timestamp: number;
  data: GeniusPayWebhookTransaction;
  environment: "sandbox" | "live";
};

class GeniusPayProvider implements PaymentProvider {
  private get env() {
    return getServerEnv();
  }

  private async call<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const env = this.env;
    const response = await fetch(`${env.GENIUS_PAY_API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": env.GENIUS_PAY_PUBLIC_KEY,
        "X-API-Secret": env.GENIUS_PAY_SECRET_KEY,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const json = (await response.json().catch(() => null)) as GeniusPayApiEnvelope<T> | null;

    if (!response.ok || !json || json.success === false) {
      const errorMessage = json && "error" in json ? json.error.message : `HTTP ${response.status}`;
      throw new Error(`Genius Pay a refusé la requête sur ${path} : ${errorMessage}`);
    }

    return json.data;
  }

  async createContributionSession(params: PaymentSessionParams): Promise<PaymentSession> {
    const data = await this.call<GeniusPayPaymentData>("/payments", {
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      customer: {
        name: params.customer.fullName,
        email: params.customer.email,
        phone: params.customer.phoneNumber,
      },
      success_url: params.successUrl,
      error_url: params.errorUrl,
      metadata: { contribution_id: params.contributionId },
    });

    const redirectUrl = data.checkout_url ?? data.payment_url;
    if (!redirectUrl) {
      throw new Error("Genius Pay n'a renvoyé aucune URL de paiement.");
    }

    return { redirectUrl, providerReference: data.reference };
  }

  verifyWebhookSignature(params: {
    rawBody: string;
    signatureHeader: string | null;
    timestampHeader: string | null;
  }): boolean {
    const { rawBody, signatureHeader, timestampHeader } = params;
    if (!signatureHeader || !timestampHeader) return false;

    const timestamp = Number(timestampHeader);
    if (!Number.isFinite(timestamp)) return false;

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestamp) > REPLAY_WINDOW_SECONDS) return false;

    const signedData = `${timestampHeader}.${rawBody}`;
    const expected = createHmac("sha256", this.env.GENIUS_PAY_WEBHOOK_SECRET).update(signedData, "utf8").digest("hex");

    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(signatureHeader, "hex");
    if (expectedBuffer.length !== receivedBuffer.length) return false;

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  parseWebhookEvent(rawBody: string): PaymentWebhookEvent {
    const payload = JSON.parse(rawBody) as GeniusPayWebhookPayload;
    const metadata = payload.data.metadata ?? {};

    switch (payload.event) {
      case "payment.success": {
        const contributionId = metadata.contribution_id as string | undefined;
        if (!contributionId) throw new Error("Webhook payment.success sans metadata.contribution_id");
        return {
          type: "contribution.confirmed",
          contributionId,
          providerReference: payload.data.reference,
          providerEventId: payload.id,
        };
      }
      case "payment.failed":
      case "payment.cancelled":
      case "payment.expired": {
        const contributionId = metadata.contribution_id as string | undefined;
        if (!contributionId) throw new Error(`Webhook ${payload.event} sans metadata.contribution_id`);
        return {
          type: "contribution.failed",
          contributionId,
          providerReference: payload.data.reference,
          reason: payload.data.failure_reason ?? payload.event,
          providerEventId: payload.id,
        };
      }
      default:
        // payment.initiated, payment.refunded, cashout.*, webhook.test :
        // accusé de réception, aucune action métier (aucun payout GeniusPay
        // n'est jamais déclenché par cette app, donc aucun cashout.* ne
        // devrait normalement arriver).
        return { type: "ignored", rawEvent: payload.event, providerEventId: payload.id };
    }
  }
}

export { GENIUS_PAY_SIGNATURE_HEADER, GENIUS_PAY_TIMESTAMP_HEADER };
export const geniusPayProvider = new GeniusPayProvider();
