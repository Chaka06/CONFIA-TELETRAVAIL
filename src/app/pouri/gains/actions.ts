"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { sendTransactionalEmail } from "@/lib/email/send";
import { payoutConfirmedEmail } from "@/lib/email/templates";
import { notifyPayoutConfirmed } from "@/lib/telegram";
import { getServerEnv } from "@/lib/env";

/**
 * Marque une réclamation de gain comme payée. Le trigger
 * trg_process_payout_claim_paid fait le reste côté base : passe l'adhésion
 * en paid_out, incrémente le cycle du panier, et (mode rush) clôture les
 * autres membres actifs.
 */
export async function adminConfirmPayout(payoutClaimId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const env = getServerEnv();

  const { data: claim, error: fetchError } = await admin
    .from("payout_claims")
    .select("id, membership_id, panier_memberships(user_id, panier_id)")
    .eq("id", payoutClaimId)
    .single();

  if (fetchError || !claim) {
    throw new Error("payout_claim_not_found");
  }

  const membership = claim.panier_memberships;
  const { data: panier } = membership?.panier_id
    ? await admin.from("paniers_public").select("formule_amount, gain_net_amount").eq("id", membership.panier_id).single()
    : { data: null };

  const { error } = await admin
    .from("payout_claims")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", payoutClaimId)
    .eq("status", "submitted");

  if (error) {
    throw new Error("confirm_payout_failed");
  }

  if (membership?.user_id) {
    const [{ data: authUser }, { data: profile }] = await Promise.all([
      admin.auth.admin.getUserById(membership.user_id),
      admin.from("profiles").select("first_name").eq("id", membership.user_id).single(),
    ]);

    const amount = panier?.gain_net_amount ?? 0;
    const basketLabel = panier ? `Panier ${formatFcfa(panier.formule_amount ?? 0)}` : "Panier";

    if (authUser?.user?.email) {
      await sendTransactionalEmail({
        userId: membership.user_id,
        toEmail: authUser.user.email,
        templateKey: "payout_confirmed",
        template: payoutConfirmedEmail({ amount }),
      });
    }

    await notifyPayoutConfirmed({
      basketLabel,
      firstName: profile?.first_name ?? "Un membre",
      amount,
      joinUrl: `${env.APP_BASE_URL}/paniers`,
    });
  }

  revalidatePath("/pouri/gains");
}
