"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";

export async function adminUpdateFormuleConfig(params: {
  mode: "normal" | "rush";
  formuleAmount: number;
  commissionBps: number;
  drawDelayHours: number;
}) {
  const { profile } = await requireSuperAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("formule_configs")
    .update({
      commission_bps: params.commissionBps,
      draw_delay_hours: params.drawDelayHours,
      updated_at: new Date().toISOString(),
    })
    .eq("mode", params.mode)
    .eq("formule_amount", params.formuleAmount);

  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: profile.id,
    action: "formule_configs.update",
    entityType: "formule_configs",
    afterData: params,
  });

  revalidatePath("/pouri/parametres");
}
