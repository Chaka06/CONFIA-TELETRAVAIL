import { NextResponse } from "next/server";

import {
  GENIUS_PAY_SIGNATURE_HEADER,
  GENIUS_PAY_TIMESTAMP_HEADER,
  geniusPayProvider,
} from "@/lib/payments/genius-pay";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/send";
import { contributionConfirmedEmail, contributionFailedEmail, basketFullEmail } from "@/lib/email/templates";
import { notifyBasketFull } from "@/lib/telegram";

export const maxDuration = 30;

/**
 * Webhook Genius Pay — seul point d'entrée qui peut confirmer une cotisation
 * de tontine. Sécurité : signature HMAC vérifiée (fenêtre anti-rejeu de 5
 * minutes) avant tout traitement ; idempotence garantie par les fonctions
 * RPC elles-mêmes (rejouer un événement ne redémarre jamais un round deux fois).
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

  switch (event.type) {
    case "contribution.confirmed": {
      const { data: result, error } = await admin
        .rpc("fn_confirm_contribution", {
          p_contribution_id: event.contributionId,
          p_provider_reference: event.providerReference,
          p_paid_amount: event.amount,
        })
        .single();

      if (error) {
        // amount_mismatch : le montant reçu ne correspond pas à l'échéance
        // attendue — signalé bruyamment plutôt que validé silencieusement.
        console.error("fn_confirm_contribution_failed", error);
        return NextResponse.json({ error: "processing_failed" }, { status: 500 });
      }

      const { data: contribution } = await admin
        .from("tontine_contributions")
        .select("amount, occurrence_number, membership_id, tontine_memberships(user_id, basket_instance_id)")
        .eq("id", event.contributionId)
        .single();

      const userId = contribution?.tontine_memberships?.user_id;
      if (userId) {
        const { data: profile } = await admin.from("profiles").select("email, first_name").eq("id", userId).single();
        if (profile) {
          await sendTransactionalEmail({
            userId,
            toEmail: profile.email,
            templateKey: "contribution_confirmed",
            template: contributionConfirmedEmail({ amount: contribution!.amount }),
          });
        }
      }

      if (result?.should_start_round && result.basket_instance_id) {
        const { data: members, error: startError } = await admin.rpc("fn_start_round", {
          p_instance_id: result.basket_instance_id,
        });

        if (startError) {
          console.error("fn_start_round_failed", startError);
        } else if (members) {
          const { data: instanceInfo } = await admin
            .from("tontine_basket_instances")
            .select("round_started_on, tontine_basket_types(label)")
            .eq("id", result.basket_instance_id)
            .single();

          for (const member of members) {
            await sendTransactionalEmail({
              userId: member.user_id,
              toEmail: member.email,
              templateKey: "basket_full",
              template: basketFullEmail({
                basketLabel: instanceInfo?.tontine_basket_types?.label ?? "Panier",
                roundStartedOn: instanceInfo?.round_started_on ?? "",
              }),
            });
          }

          await notifyBasketFull({
            basketLabel: instanceInfo?.tontine_basket_types?.label ?? "Panier",
            memberCount: members.length,
          });
        }
      }
      break;
    }
    case "contribution.failed": {
      const { data: contribution } = await admin
        .from("tontine_contributions")
        .select("amount, occurrence_number, membership_id, tontine_memberships(user_id)")
        .eq("id", event.contributionId)
        .single();

      // Une échéance d'entrée (n°1) échouée annule l'adhésion : elle n'a
      // encore rien coûté à personne d'autre. Une échéance ultérieure
      // échouée reste "pending" — le membre peut réessayer avant le
      // balayage quotidien qui le retirera s'il n'a toujours pas payé.
      if (contribution?.occurrence_number === 1) {
        await admin.rpc("fn_cancel_failed_join", { p_contribution_id: event.contributionId });
      }

      const userId = contribution?.tontine_memberships?.user_id;
      if (userId) {
        const { data: profile } = await admin.from("profiles").select("email").eq("id", userId).single();
        if (profile) {
          await sendTransactionalEmail({
            userId,
            toEmail: profile.email,
            templateKey: "contribution_failed",
            template: contributionFailedEmail({ amount: contribution!.amount, reason: event.reason }),
          });
        }
      }
      break;
    }
    case "ignored":
      break;
  }

  return NextResponse.json({ received: true });
}
