import { NextResponse } from "next/server";

import {
  GENIUS_PAY_SIGNATURE_HEADER,
  GENIUS_PAY_TIMESTAMP_HEADER,
  geniusPayProvider,
} from "@/lib/payments/genius-pay";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  depositConfirmedEmail,
  depositFailedEmail,
  withdrawalApprovedEmail,
  withdrawalRejectedEmail,
} from "@/lib/email/templates";

/**
 * Webhook Genius Pay — seul point d'entrée qui peut faire passer un dépôt à
 * "confirmed" (donc créditer un portefeuille) ou finaliser un retrait.
 * Sécurité : signature HMAC vérifiée (avec fenêtre anti-rejeu de 5 minutes)
 * avant tout traitement, `service_role` utilisé uniquement après cette
 * vérification, idempotence garantie par les fonctions RPC elles-mêmes
 * (rejouer un événement ne double-crédite jamais un portefeuille).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get(GENIUS_PAY_SIGNATURE_HEADER);
  const timestampHeader = request.headers.get(GENIUS_PAY_TIMESTAMP_HEADER);

  if (!geniusPayProvider.verifyWebhookSignature({ rawBody, signatureHeader, timestampHeader })) {
    console.warn("genius_pay_webhook_invalid_signature");
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event;
  try {
    event = geniusPayProvider.parseWebhookEvent(rawBody);
  } catch (err) {
    console.error("genius_pay_webhook_parse_failed", err);
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const env = getServerEnv();
  const dashboardUrl = `${env.APP_BASE_URL}/tableau-de-bord`;

  switch (event.type) {
    case "deposit.confirmed": {
      const { data: deposit } = await admin
        .from("deposits")
        .select("amount, user_id, cycle_tiers(tier_number)")
        .eq("id", event.depositId)
        .single();

      const { error } = await admin.rpc("confirm_deposit", {
        p_deposit_id: event.depositId,
        p_provider_reference: event.providerReference,
        p_provider_payload: { event_id: event.providerEventId },
      });
      if (error) {
        console.error("confirm_deposit_rpc_failed", error);
        return NextResponse.json({ error: "processing_failed" }, { status: 500 });
      }

      if (deposit) {
        const { data: profile } = await admin
          .from("profiles")
          .select("email")
          .eq("id", deposit.user_id)
          .single();

        if (profile) {
          await sendTransactionalEmail({
            userId: deposit.user_id,
            toEmail: profile.email,
            templateKey: "deposit_confirmed",
            template: depositConfirmedEmail({
              amount: deposit.amount,
              tierNumber: deposit.cycle_tiers?.tier_number ?? 0,
              dashboardUrl,
            }),
          });
        }
      }
      break;
    }
    case "deposit.failed": {
      const { data: deposit } = await admin
        .from("deposits")
        .select("amount, user_id")
        .eq("id", event.depositId)
        .single();

      const { error } = await admin.rpc("fail_deposit", {
        p_deposit_id: event.depositId,
        p_reason: event.reason,
      });
      if (error) {
        console.error("fail_deposit_rpc_failed", error);
        return NextResponse.json({ error: "processing_failed" }, { status: 500 });
      }

      if (deposit) {
        const { data: profile } = await admin
          .from("profiles")
          .select("email")
          .eq("id", deposit.user_id)
          .single();

        if (profile) {
          await sendTransactionalEmail({
            userId: deposit.user_id,
            toEmail: profile.email,
            templateKey: "deposit_failed",
            template: depositFailedEmail({
              amount: deposit.amount,
              reason: event.reason,
              retryUrl: `${dashboardUrl}/paliers`,
            }),
          });
        }
      }
      break;
    }
    case "payout.completed": {
      const { data: withdrawal } = await admin
        .from("withdrawals")
        .select("amount, user_id, status")
        .eq("id", event.withdrawalId)
        .single();

      const { error } = await admin.rpc("finalize_withdrawal_payout", {
        p_withdrawal_id: event.withdrawalId,
        p_approved: true,
        p_provider_reference: event.providerReference,
      });
      // Un webhook rejoué arrive une fois le retrait déjà "completed" : la
      // RPC lève alors withdrawal_not_processing, ce qui est attendu (idempotence).
      if (error && !error.message.includes("withdrawal_not_processing")) {
        console.error("finalize_withdrawal_payout_rpc_failed", error);
        return NextResponse.json({ error: "processing_failed" }, { status: 500 });
      }

      if (withdrawal && withdrawal.status === "processing") {
        const { data: profile } = await admin
          .from("profiles")
          .select("email")
          .eq("id", withdrawal.user_id)
          .single();

        if (profile) {
          await sendTransactionalEmail({
            userId: withdrawal.user_id,
            toEmail: profile.email,
            templateKey: "withdrawal_approved",
            template: withdrawalApprovedEmail({ amount: withdrawal.amount }),
          });
        }
      }
      break;
    }
    case "payout.failed": {
      const { data: withdrawal } = await admin
        .from("withdrawals")
        .select("amount, user_id, status")
        .eq("id", event.withdrawalId)
        .single();

      const { error } = await admin.rpc("finalize_withdrawal_payout", {
        p_withdrawal_id: event.withdrawalId,
        p_approved: false,
        p_reason: event.reason,
      });
      if (error && !error.message.includes("withdrawal_not_processing")) {
        console.error("finalize_withdrawal_payout_rpc_failed", error);
        return NextResponse.json({ error: "processing_failed" }, { status: 500 });
      }

      if (withdrawal && withdrawal.status === "processing") {
        const { data: profile } = await admin
          .from("profiles")
          .select("email")
          .eq("id", withdrawal.user_id)
          .single();

        if (profile) {
          await sendTransactionalEmail({
            userId: withdrawal.user_id,
            toEmail: profile.email,
            templateKey: "withdrawal_rejected",
            template: withdrawalRejectedEmail({
              amount: withdrawal.amount,
              reason: event.reason,
              dashboardUrl,
            }),
          });
        }
      }
      break;
    }
    case "ignored":
      // payment.initiated, payment.refunded, cashout.requested,
      // cashout.approved, webhook.test — accusé de réception seulement.
      break;
  }

  return NextResponse.json({ received: true });
}
