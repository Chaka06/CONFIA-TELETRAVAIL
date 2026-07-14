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

  if (userId === profile.id && status !== "active") {
    throw new Error("Vous ne pouvez pas suspendre ou bannir votre propre compte.");
  }

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

  if (role !== "super_admin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");

    if ((count ?? 0) <= 1) {
      const { data: target } = await admin.from("profiles").select("role").eq("id", userId).single();
      if (target?.role === "super_admin") {
        throw new Error(
          "Impossible de retirer le rôle super administrateur au dernier compte qui le détient : personne ne pourrait plus en désigner un autre."
        );
      }
    }
  }

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
