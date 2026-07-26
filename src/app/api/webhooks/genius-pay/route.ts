import { NextResponse } from "next/server";

import {
  GENIUS_PAY_SIGNATURE_HEADER,
  GENIUS_PAY_TIMESTAMP_HEADER,
  geniusPayProvider,
} from "@/lib/payments/genius-pay";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { sendTransactionalEmail } from "@/lib/email/send";
import { contributionConfirmedEmail, contributionFailedEmail } from "@/lib/email/templates";
import { notifyBasketMemberJoined } from "@/lib/telegram";

export const maxDuration = 30;

/**
 * Webhook Genius Pay — seul point d'entrée qui peut confirmer une adhésion à
 * un panier. Sécurité : signature HMAC vérifiée (fenêtre anti-rejeu de 5
 * minutes) avant tout traitement.
 *
 * Modèle "paiement unique" : confirmer un paiement passe panier_memberships
 * en status='active' ; le trigger trg_sync_panier_membership_status
 * recalcule alors member_count et programme la date de tirage (draw_at) si
 * le panier vient d'être complété. Le tirage du gagnant lui-même est fait
 * séparément par run_scheduled_panier_draws (cron), jamais ici — remplir un
 * panier et désigner un gagnant ne sont plus le même instant dans ce modèle.
 *
 * Idempotence : la confirmation ne s'applique que si le statut est encore
 * 'pending_payment' (WHERE explicite), donc rejouer un événement déjà traité
 * ne fait rien la deuxième fois.
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
    case "membership.confirmed": {
      const { data: updated, error } = await admin
        .from("panier_memberships")
        .update({ status: "active", amount_paid: event.amount })
        .eq("id", event.membershipId)
        .eq("geniuspay_reference", event.providerReference)
        .eq("status", "pending_payment")
        .select("id, user_id, panier_id")
        .maybeSingle();

      if (error) {
        console.error("membership_confirm_failed", error);
        return NextResponse.json({ error: "processing_failed" }, { status: 500 });
      }

      // Rejeu déjà traité (référence ne matche plus aucune ligne pending) :
      // ne rien renotifier.
      if (!updated) break;

      const [{ data: authUser }, { data: panier }] = await Promise.all([
        admin.auth.admin.getUserById(updated.user_id),
        admin.from("paniers").select("formule_amount, member_count, capacity").eq("id", updated.panier_id).single(),
      ]);

      if (authUser?.user?.email) {
        await sendTransactionalEmail({
          userId: updated.user_id,
          toEmail: authUser.user.email,
          templateKey: "contribution_confirmed",
          template: contributionConfirmedEmail({ amount: event.amount }),
        });
      }

      if (panier) {
        await notifyBasketMemberJoined({
          basketLabel: `Panier ${formatFcfa(panier.formule_amount)}`,
          memberCount: panier.member_count,
          capacity: panier.capacity,
        });
      }

      break;
    }
    case "membership.failed": {
      const { data: membership } = await admin
        .from("panier_memberships")
        .select("id, user_id")
        .eq("id", event.membershipId)
        .eq("geniuspay_reference", event.providerReference)
        .eq("status", "pending_payment")
        .maybeSingle();

      if (!membership) break;

      // Échec de paiement sur une adhésion jamais confirmée : on libère la
      // place réservée immédiatement plutôt que de laisser une réservation
      // morte occuper un slot de capacité.
      await admin.from("panier_memberships").delete().eq("id", membership.id);

      const { data: authUser } = await admin.auth.admin.getUserById(membership.user_id);
      if (authUser?.user?.email) {
        await sendTransactionalEmail({
          userId: membership.user_id,
          toEmail: authUser.user.email,
          templateKey: "contribution_failed",
          template: contributionFailedEmail({ amount: event.amount, reason: event.reason }),
        });
      }

      break;
    }
    case "ignored":
      break;
  }

  return NextResponse.json({ received: true });
}
