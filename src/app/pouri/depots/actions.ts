"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/send";
import { depositConfirmedEmail, depositFailedEmail } from "@/lib/email/templates";
import { getServerEnv } from "@/lib/env";

export async function adminConfirmDeposit(depositId: string) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();

  const { data: deposit } = await admin
    .from("deposits")
    .select("id, amount, user_id, status, cycle_tiers(tier_number)")
    .eq("id", depositId)
    .single();

  if (!deposit || deposit.status !== "pending") {
    throw new Error("Ce dépôt n'est plus en attente de confirmation.");
  }

  const { error } = await admin.rpc("confirm_deposit", {
    p_deposit_id: depositId,
    p_provider_reference: `MANUEL-${profile.id.slice(0, 8)}-${Date.now()}`,
    p_provider_payload: { confirmed_manually_by: profile.id },
  });

  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: profile.id,
    action: "deposit.confirm",
    entityType: "deposits",
    entityId: depositId,
    beforeData: { status: "pending" },
    afterData: { status: "confirmed" },
  });

  const { data: userProfile } = await admin.from("profiles").select("email").eq("id", deposit.user_id).single();
  if (userProfile) {
    const env = getServerEnv();
    await sendTransactionalEmail({
      userId: deposit.user_id,
      toEmail: userProfile.email,
      templateKey: "deposit_confirmed",
      template: depositConfirmedEmail({
        amount: deposit.amount,
        tierNumber: deposit.cycle_tiers?.tier_number ?? 0,
        dashboardUrl: `${env.APP_BASE_URL}/tableau-de-bord`,
      }),
    });
  }

  revalidatePath("/pouri/depots");
}

export async function adminRejectDeposit(depositId: string, reason: string) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();

  const { data: deposit } = await admin
    .from("deposits")
    .select("id, amount, user_id, status")
    .eq("id", depositId)
    .single();

  if (!deposit || deposit.status !== "pending") {
    throw new Error("Ce dépôt n'est plus en attente de confirmation.");
  }

  const { error } = await admin.rpc("fail_deposit", { p_deposit_id: depositId, p_reason: reason });
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: profile.id,
    action: "deposit.reject",
    entityType: "deposits",
    entityId: depositId,
    beforeData: { status: "pending" },
    afterData: { status: "failed", reason },
  });

  const { data: userProfile } = await admin.from("profiles").select("email").eq("id", deposit.user_id).single();
  if (userProfile) {
    const env = getServerEnv();
    await sendTransactionalEmail({
      userId: deposit.user_id,
      toEmail: userProfile.email,
      templateKey: "deposit_failed",
      template: depositFailedEmail({
        amount: deposit.amount,
        reason,
        retryUrl: `${env.APP_BASE_URL}/tableau-de-bord/paliers`,
      }),
    });
  }

  revalidatePath("/pouri/depots");
}
