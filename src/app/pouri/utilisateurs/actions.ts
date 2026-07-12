"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, requireSuperAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type AccountStatus = Database["public"]["Enums"]["account_status"];
type AppRole = Database["public"]["Enums"]["app_role"];

export async function adminSetUserStatus(userId: string, status: AccountStatus) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("profiles").update({ status }).eq("id", userId);
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: profile.id,
    action: "user.set_status",
    entityType: "profiles",
    entityId: userId,
    afterData: { status },
  });

  revalidatePath("/pouri/utilisateurs");
}

export async function adminSetUserRole(userId: string, role: AppRole) {
  // Seul un super_admin peut accorder ou retirer des privilèges d'administration —
  // une élévation de privilège ne doit jamais dépendre d'un simple rôle "admin".
  const { profile } = await requireSuperAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: profile.id,
    action: "user.set_role",
    entityType: "profiles",
    entityId: userId,
    afterData: { role },
  });

  revalidatePath("/pouri/utilisateurs");
}
