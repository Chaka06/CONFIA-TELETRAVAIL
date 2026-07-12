"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/send";
import { payoutConfirmedEmail } from "@/lib/email/templates";
import { notifyPayoutConfirmed } from "@/lib/telegram";
import { getServerEnv } from "@/lib/env";

export async function adminConfirmPayout(payoutId: string) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();
  const env = getServerEnv();

  const { data: result, error } = await admin
    .rpc("admin_confirm_payout", { p_payout_id: payoutId, p_processed_by: profile.id })
    .single();

  if (error || !result) {
    throw new Error(error?.message ?? "confirm_payout_failed");
  }

  const { data: payout } = await admin.from("tontine_payouts").select("amount").eq("id", payoutId).single();

  await sendTransactionalEmail({
    userId: result.user_id,
    toEmail: result.email,
    templateKey: "payout_confirmed",
    template: payoutConfirmedEmail({ amount: payout?.amount ?? 0 }),
  });

  await notifyPayoutConfirmed({
    basketLabel: result.basket_label,
    firstName: result.first_name,
    amount: payout?.amount ?? 0,
    joinUrl: `${env.APP_BASE_URL}/paniers`,
  });

  revalidatePath("/pouri/gains");
}
