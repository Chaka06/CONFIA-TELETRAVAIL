"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, requireSuperAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/send";
import { accountStatusChangedEmail } from "@/lib/email/templates";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

type AppRole = Database["public"]["Enums"]["app_role"];

// Pas de colonne profiles.status dans ce schéma : la suspension/le bannissement
// se fait nativement via Supabase Auth (auth.users.banned_until), qui bloque
// déjà la connexion sans contrôle applicatif séparé (cf. connexion-form.tsx).
export async function adminSetUserBanned(userId: string, banned: boolean) {
  const { profile } = await requireAdmin();

  if (userId === profile.id && banned) {
    throw new Error("Vous ne pouvez pas suspendre ou bannir votre propre compte.");
  }

  const admin = createAdminClient();

  const { data: updated, error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: profile.id,
    action: banned ? "user.ban" : "user.unban",
    entityType: "profiles",
    entityId: userId,
  });

  if (updated.user?.email) {
    const env = getServerEnv();
    await sendTransactionalEmail({
      userId,
      toEmail: updated.user.email,
      templateKey: banned ? "account_status_banned" : "account_status_active",
      template: accountStatusChangedEmail({
        status: banned ? "banned" : "active",
        dashboardUrl: `${env.APP_BASE_URL}/tableau-de-bord`,
      }),
    });
  }

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
