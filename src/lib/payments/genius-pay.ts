import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/env";
import type {
  PaymentProvider,
  PaymentSession,
  PaymentSessionParams,
  PaymentWebhookEvent,
  PayoutParams,
  PayoutResult,
} from "./types";

/**
 * Adaptateur Genius Pay — conforme à la documentation officielle
 * (https://geniuspay.ci/docs, API Marchand v1.0).
 *
 * Points clés de cette API réelle (à ne pas modifier sans revérifier la doc) :
 *  - Authentification par deux en-têtes `X-API-Key` (publique) et
 *    `X-API-Secret` (secrète), jamais un `Authorization: Bearer`.
 *  - La création d'un paiement SANS `payment_method` renvoie une
 *    `checkout_url` hébergée (le client choisit Wave/Orange/MTN/carte...),
 *    ce qui est le mode retenu ici pour ne pas imposer un opérateur.
 *  - Genius Pay attribue lui-même la référence de transaction
 *    (`MTX-XXXXXXXXXX`) : on ne peut pas lui envoyer la nôtre. La
 *    corrélation avec nos enregistrements (`deposits.id` / `withdrawals.id`)
 *    se fait exclusivement via le champ `metadata`, renvoyé tel quel dans
 *    la réponse de création ET dans le webhook.
 *  - Signature de webhook : HMAC-SHA256(`timestamp` + "." + corps brut,
 *    secret), avec une fenêtre anti-rejeu de 5 minutes — PAS une simple
 *    signature du corps seul.
 *
 * ⚠️ Le endpoint exact de création de payout (retrait) n'était pas présent
 * dans la documentation fournie (seuls les événements webhook `cashout.*`
 * l'étaient) : `createPayout` ci-dessous suit la même convention que les
 * paiements par cohérence, mais DOIT être vérifié contre la page "Payouts"
 * de la documentation avant la mise en production.
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

type GeniusPayPayoutData = {
  id: number;
  reference: string;
  status: "pending" | "processing" | "completed" | "failed";
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

  async createDepositSession(params: PaymentSessionParams): Promise<PaymentSession> {
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
      // Seule voie de corrélation fiable avec notre dépôt : Genius Pay
      // renvoie ce champ inchangé dans la réponse et dans le webhook.
      metadata: { deposit_id: params.depositId },
    });

    const redirectUrl = data.checkout_url ?? data.payment_url;
    if (!redirectUrl) {
      throw new Error("Genius Pay n'a renvoyé aucune URL de paiement.");
    }

    return { redirectUrl, providerReference: data.reference };
  }

  async createPayout(params: PayoutParams): Promise<PayoutResult> {
    // ⚠️ Endpoint non confirmé par la documentation fournie — à vérifier
    // (chemin, forme du corps) avant toute utilisation en production.
    const data = await this.call<GeniusPayPayoutData>("/payouts", {
      amount: params.amount,
      currency: params.currency,
      recipient: {
        phone: params.destination.phoneNumber,
        name: params.destination.fullName,
      },
      metadata: { withdrawal_id: params.withdrawalId },
    });

    return { providerReference: data.reference, status: data.status };
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
        const depositId = metadata.deposit_id as string | undefined;
        if (!depositId) throw new Error("Webhook payment.success sans metadata.deposit_id");
        return {
          type: "deposit.confirmed",
          depositId,
          providerReference: payload.data.reference,
          providerEventId: payload.id,
        };
      }
      case "payment.failed":
      case "payment.cancelled":
      case "payment.expired": {
        const depositId = metadata.deposit_id as string | undefined;
        if (!depositId) throw new Error(`Webhook ${payload.event} sans metadata.deposit_id`);
        return {
          type: "deposit.failed",
          depositId,
          providerReference: payload.data.reference,
          reason: payload.data.failure_reason ?? payload.event,
          providerEventId: payload.id,
        };
      }
      case "cashout.completed": {
        const withdrawalId = metadata.withdrawal_id as string | undefined;
        if (!withdrawalId) throw new Error("Webhook cashout.completed sans metadata.withdrawal_id");
        return {
          type: "payout.completed",
          withdrawalId,
          providerReference: payload.data.reference,
          providerEventId: payload.id,
        };
      }
      case "cashout.failed": {
        const withdrawalId = metadata.withdrawal_id as string | undefined;
        if (!withdrawalId) throw new Error("Webhook cashout.failed sans metadata.withdrawal_id");
        return {
          type: "payout.failed",
          withdrawalId,
          providerReference: payload.data.reference,
          reason: payload.data.failure_reason ?? "cashout.failed",
          providerEventId: payload.id,
        };
      }
      default:
        // payment.initiated, payment.refunded, cashout.requested,
        // cashout.approved, webhook.test : accusé de réception, aucune
        // action métier nécessaire à ce stade du cycle de vie.
        return { type: "ignored", rawEvent: payload.event, providerEventId: payload.id };
    }
  }
}

export { GENIUS_PAY_SIGNATURE_HEADER, GENIUS_PAY_TIMESTAMP_HEADER };
export const geniusPayProvider = new GeniusPayProvider();
