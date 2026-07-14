import { NextResponse } from "next/server";

import {
  GENIUS_PAY_SIGNATURE_HEADER,
  GENIUS_PAY_TIMESTAMP_HEADER,
  geniusPayProvider,
} from "@/lib/payments/genius-pay";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { sendTransactionalEmail } from "@/lib/email/send";
import { contributionConfirmedEmail, contributionFailedEmail, payoutReadyEmail } from "@/lib/email/templates";
import { notifyBasketMemberJoined, notifyPayoutReady } from "@/lib/telegram";

export const maxDuration = 30;

/**
 * Webhook Genius Pay — seul point d'entrée qui peut confirmer une cotisation
 * de tontine. Sécurité : signature HMAC vérifiée (fenêtre anti-rejeu de 5
 * minutes) avant tout traitement ; idempotence garantie par les fonctions
 * RPC elles-mêmes (rejouer un événement ne déclenche jamais deux fois un gain).
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

  switch (event.type) {
    case "contribution.confirmed": {
      // fn_confirm_contribution fait tout de façon synchrone : marque la
      // cotisation payée, incrémente member_count, et si c'est le 20e paiement
      // détermine le gagnant, crée le gain, clôt les autres membres et
      // garantit une instance 'filling' neuve. Idempotent en cas de rejeu.
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

      // Rejeu déjà traité (aucune instance renvoyée) : ne rien renotifier.
      if (!result?.basket_instance_id) break;

      const { data: contribution } = await admin
        .from("tontine_contributions")
        .select("amount, membership_id, tontine_memberships(user_id)")
        .eq("id", event.contributionId)
        .single();

      const userId = contribution?.tontine_memberships?.user_id;
      if (userId) {
        const { data: profile } = await admin.from("profiles").select("email").eq("id", userId).single();
        if (profile) {
          await sendTransactionalEmail({
            userId,
            toEmail: profile.email,
            templateKey: "contribution_confirmed",
            template: contributionConfirmedEmail({ amount: contribution!.amount }),
          });
        }
      }

      // À chaque adhésion payée : on annonce le nouveau compte dans le groupe.
      await notifyBasketMemberJoined({
        basketLabel: result.basket_label ?? "Panier",
        memberCount: result.member_count ?? 0,
        capacity: result.capacity ?? 0,
      });

      // 20e paiement : le panier est complet et le gagnant est déterminé au
      // même instant. On prévient le gagnant (e-mail + Telegram).
      if (result.became_full && result.winner_email && result.beneficiary_token) {
        await sendTransactionalEmail({
          userId: result.winner_user_id ?? null,
          toEmail: result.winner_email,
          templateKey: "payout_ready",
          template: payoutReadyEmail({
            basketLabel: result.basket_label ?? "Panier",
            amount: result.payout_amount ?? 0,
            claimUrl: `${env.APP_BASE_URL}/gain/${result.beneficiary_token}`,
          }),
        });

        await notifyPayoutReady({
          basketLabel: result.basket_label ?? "Panier",
          firstName: result.winner_first_name ?? "",
          amount: result.payout_amount ?? 0,
        });
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
