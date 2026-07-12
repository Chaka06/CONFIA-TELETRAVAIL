import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service-role-key";
process.env.GENIUS_PAY_WEBHOOK_SECRET ??= "test-webhook-secret";

const { geniusPayProvider } = await import("@/lib/payments/genius-pay");

function sign(timestamp: string, body: string, secret: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");
}

function currentTimestamp() {
  return String(Math.floor(Date.now() / 1000));
}

describe("geniusPayProvider.verifyWebhookSignature", () => {
  it("accepte une signature HMAC-SHA256 valide sur timestamp + corps", () => {
    const body = JSON.stringify({ event: "payment.success" });
    const timestamp = currentTimestamp();
    const signature = sign(timestamp, body, "test-webhook-secret");
    expect(
      geniusPayProvider.verifyWebhookSignature({
        rawBody: body,
        signatureHeader: signature,
        timestampHeader: timestamp,
      })
    ).toBe(true);
  });

  it("rejette une signature calculée avec le mauvais secret", () => {
    const body = JSON.stringify({ event: "payment.success" });
    const timestamp = currentTimestamp();
    const signature = sign(timestamp, body, "mauvais-secret");
    expect(
      geniusPayProvider.verifyWebhookSignature({
        rawBody: body,
        signatureHeader: signature,
        timestampHeader: timestamp,
      })
    ).toBe(false);
  });

  it("rejette un corps de requête altéré même avec une signature d'origine valide", () => {
    const timestamp = currentTimestamp();
    const originalBody = JSON.stringify({ event: "payment.success", amount: 2000 });
    const signature = sign(timestamp, originalBody, "test-webhook-secret");
    const tamperedBody = JSON.stringify({ event: "payment.success", amount: 999999 });
    expect(
      geniusPayProvider.verifyWebhookSignature({
        rawBody: tamperedBody,
        signatureHeader: signature,
        timestampHeader: timestamp,
      })
    ).toBe(false);
  });

  it("rejette une signature ou un timestamp absent", () => {
    const body = JSON.stringify({ event: "payment.success" });
    expect(
      geniusPayProvider.verifyWebhookSignature({ rawBody: body, signatureHeader: null, timestampHeader: "123" })
    ).toBe(false);
    expect(
      geniusPayProvider.verifyWebhookSignature({ rawBody: body, signatureHeader: "abc", timestampHeader: null })
    ).toBe(false);
  });

  it("rejette un webhook rejoué au-delà de la fenêtre anti-rejeu de 5 minutes", () => {
    const body = JSON.stringify({ event: "payment.success" });
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 600);
    const signature = sign(oldTimestamp, body, "test-webhook-secret");
    expect(
      geniusPayProvider.verifyWebhookSignature({
        rawBody: body,
        signatureHeader: signature,
        timestampHeader: oldTimestamp,
      })
    ).toBe(false);
  });
});

describe("geniusPayProvider.parseWebhookEvent", () => {
  it("interprète un paiement réussi et récupère le contribution_id depuis les metadata", () => {
    const payload = {
      id: "evt_1",
      event: "payment.success",
      timestamp: Math.floor(Date.now() / 1000),
      data: {
        object: "transaction",
        id: 456,
        reference: "MTX-A1B2C3D4E5",
        amount: 1000,
        status: "completed",
        metadata: { contribution_id: "contribution-uuid" },
      },
      environment: "sandbox",
    };
    const result = geniusPayProvider.parseWebhookEvent(JSON.stringify(payload));
    expect(result).toEqual({
      type: "contribution.confirmed",
      contributionId: "contribution-uuid",
      providerReference: "MTX-A1B2C3D4E5",
      providerEventId: "evt_1",
    });
  });

  it("interprète un paiement échoué avec sa raison", () => {
    const payload = {
      id: "evt_2",
      event: "payment.failed",
      timestamp: Math.floor(Date.now() / 1000),
      data: {
        object: "transaction",
        id: 457,
        reference: "MTX-B2C3D4E5F6",
        amount: 1000,
        status: "failed",
        failure_reason: "Solde insuffisant",
        metadata: { contribution_id: "contribution-uuid-2" },
      },
      environment: "sandbox",
    };
    const result = geniusPayProvider.parseWebhookEvent(JSON.stringify(payload));
    expect(result).toEqual({
      type: "contribution.failed",
      contributionId: "contribution-uuid-2",
      providerReference: "MTX-B2C3D4E5F6",
      reason: "Solde insuffisant",
      providerEventId: "evt_2",
    });
  });

  it("classe les événements sans action métier comme 'ignored' (ex: payment.initiated, cashout.*)", () => {
    const payload = {
      id: "evt_3",
      event: "payment.initiated",
      timestamp: Math.floor(Date.now() / 1000),
      data: { object: "transaction", id: 458, reference: "MTX-C3D4E5F6G7", amount: 1000, status: "pending" },
      environment: "sandbox",
    };
    const result = geniusPayProvider.parseWebhookEvent(JSON.stringify(payload));
    expect(result).toEqual({ type: "ignored", rawEvent: "payment.initiated", providerEventId: "evt_3" });
  });

  it("lève une erreur explicite si metadata.contribution_id est absent sur un paiement réussi", () => {
    const payload = {
      id: "evt_4",
      event: "payment.success",
      timestamp: Math.floor(Date.now() / 1000),
      data: { object: "transaction", id: 459, reference: "MTX-D4E5F6G7H8", amount: 1000, status: "completed" },
      environment: "sandbox",
    };
    expect(() => geniusPayProvider.parseWebhookEvent(JSON.stringify(payload))).toThrow();
  });
});
