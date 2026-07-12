"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/send";
import { withdrawalRejectedEmail } from "@/lib/email/templates";
import { getServerEnv } from "@/lib/env";
import { getPaymentProvider } from "@/lib/payments";
import type { Json } from "@/types/database";

type DestinationDetails = { phone_number?: string; full_name?: string };

/**
 * Approuve un retrait : déclenche le virement réel auprès de Genius Pay et
 * enregistre automatiquement la référence qu'il renvoie. L'administrateur ne
 * saisit jamais de référence à la main — le statut final ("completed") n'est
 * confirmé que plus tard par le webhook cashout.completed.
 */
export async function adminApproveWithdrawal(withdrawalId: string) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();

  const { data: withdrawal } = await admin
    .from("withdrawals")
    .select("id, amount, user_id, status, destination_details")
    .eq("id", withdrawalId)
    .single();

  if (!withdrawal || withdrawal.status !== "pending") {
    throw new Error("Ce retrait n'est plus en attente de traitement.");
  }

  const destination = (withdrawal.destination_details as Json as DestinationDetails) ?? {};
  if (!destination.phone_number || !destination.full_name) {
    throw new Error("Destinataire du retrait incomplet.");
  }

  const payout = await getPaymentProvider().createPayout({
    withdrawalId: withdrawal.id,
    amount: withdrawal.amount,
    currency: "XOF",
    destination: {
      phoneNumber: destination.phone_number,
      fullName: destination.full_name,
    },
  });

  const { error } = await admin.rpc("admin_approve_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_provider_reference: payout.providerReference,
    p_processed_by: profile.id,
  });

  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: profile.id,
    action: "withdrawal.approve",
    entityType: "withdrawals",
    entityId: withdrawalId,
    afterData: { provider_reference: payout.providerReference, provider_status: payout.status },
  });

  revalidatePath("/pouri/retraits");
}

export async function adminRejectWithdrawal(withdrawalId: string, reason: string) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();

  const { data: withdrawal } = await admin
    .from("withdrawals")
    .select("id, amount, user_id, status")
    .eq("id", withdrawalId)
    .single();

  if (!withdrawal || withdrawal.status !== "pending") {
    throw new Error("Ce retrait n'est plus en attente de traitement.");
  }

  const { error } = await admin.rpc("admin_reject_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_reason: reason,
    p_processed_by: profile.id,
  });

  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: profile.id,
    action: "withdrawal.reject",
    entityType: "withdrawals",
    entityId: withdrawalId,
    afterData: { reason },
  });

  const { data: userProfile } = await admin.from("profiles").select("email").eq("id", withdrawal.user_id).single();
  if (userProfile) {
    const env = getServerEnv();
    await sendTransactionalEmail({
      userId: withdrawal.user_id,
      toEmail: userProfile.email,
      templateKey: "withdrawal_rejected",
      template: withdrawalRejectedEmail({
        amount: withdrawal.amount,
        reason,
        dashboardUrl: `${env.APP_BASE_URL}/tableau-de-bord`,
      }),
    });
  }

  revalidatePath("/pouri/retraits");
}
