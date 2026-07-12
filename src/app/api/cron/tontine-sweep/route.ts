import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { sendTransactionalEmail } from "@/lib/email/send";
import { contributionReminderEmail, memberRemovedEmail, payoutReadyEmail } from "@/lib/email/templates";
import { notifyMemberRemoved, notifyPayoutReady } from "@/lib/telegram";

export const maxDuration = 60;

type SweepResult = {
  reminders: { contribution_id: string; email: string; first_name: string; amount: number; basket_label: string }[];
  removed: { basket_instance_id: string; email: string; first_name: string; basket_label: string }[];
  payouts: { payout_id: string; basket_instance_id: string; basket_label: string; amount: number; membership_id: string }[];
};

/**
 * Balayage quotidien de la tontine (rappels, retraits pour impayé,
 * déclenchement des gains). Déclenché par Vercel Cron (voir vercel.json) une
 * fois par jour. Protégé par CRON_SECRET pour éviter tout déclenchement non
 * autorisé — Vercel attache automatiquement ce header aux appels programmés.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const env = getServerEnv();

  const { data, error } = await admin.rpc("fn_daily_tontine_sweep");
  if (error) {
    console.error("tontine_sweep_failed", error);
    return NextResponse.json({ error: "sweep_failed" }, { status: 500 });
  }

  const result = data as unknown as SweepResult;

  for (const r of result.reminders) {
    await sendTransactionalEmail({
      userId: null,
      toEmail: r.email,
      templateKey: "contribution_reminder",
      template: contributionReminderEmail({
        amount: r.amount,
        basketLabel: r.basket_label,
        payUrl: `${env.APP_BASE_URL}/mes-cotisations/${r.contribution_id}/payer`,
      }),
    });
  }

  for (const r of result.removed) {
    await sendTransactionalEmail({
      userId: null,
      toEmail: r.email,
      templateKey: "member_removed",
      template: memberRemovedEmail({ basketLabel: r.basket_label }),
    });
    await notifyMemberRemoved({
      basketLabel: r.basket_label,
      firstName: r.first_name,
      joinUrl: `${env.APP_BASE_URL}/paniers`,
    });
  }

  for (const p of result.payouts) {
    const { data: payout } = await admin
      .from("tontine_payouts")
      .select("beneficiary_token, tontine_memberships(user_id, profiles(email, first_name))")
      .eq("id", p.payout_id)
      .single();

    const email = payout?.tontine_memberships?.profiles?.email;
    const firstName = payout?.tontine_memberships?.profiles?.first_name ?? "";
    if (email && payout?.beneficiary_token) {
      await sendTransactionalEmail({
        userId: payout.tontine_memberships?.user_id ?? null,
        toEmail: email,
        templateKey: "payout_ready",
        template: payoutReadyEmail({
          basketLabel: p.basket_label,
          amount: p.amount,
          claimUrl: `${env.APP_BASE_URL}/gain/${payout.beneficiary_token}`,
        }),
      });
    }
    await notifyPayoutReady({ basketLabel: p.basket_label, firstName, amount: p.amount });
  }

  return NextResponse.json({
    reminders: result.reminders.length,
    removed: result.removed.length,
    payouts: result.payouts.length,
  });
}
