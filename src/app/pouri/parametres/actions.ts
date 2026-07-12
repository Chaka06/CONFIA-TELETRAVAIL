"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export async function adminUpdateSetting(key: string, rawValue: string) {
  const { profile } = await requireSuperAdmin();
  const admin = createAdminClient();

  let value: Json;
  try {
    // Les valeurs sont stockées en jsonb ; un nombre ou "true"/"false" est
    // interprété tel quel, sinon la valeur est traitée comme une chaîne.
    value = JSON.parse(rawValue);
  } catch {
    value = rawValue;
  }

  const { error } = await admin
    .from("platform_settings")
    .update({ value, updated_by: profile.id, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: profile.id,
    action: "platform_settings.update",
    entityType: "platform_settings",
    afterData: { key, value },
  });

  revalidatePath("/pouri/parametres");
}
