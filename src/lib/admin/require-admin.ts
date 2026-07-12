import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Garde d'accès pour toutes les pages et actions serveur de l'administration.
 * Défense en profondeur : le proxy (middleware) filtre déjà /pouri, mais
 * chaque route/action revérifie le rôle indépendamment, sans jamais faire
 * confiance à une donnée transmise par le client.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    redirect("/tableau-de-bord");
  }

  return { supabase, profile };
}

export async function requireSuperAdmin() {
  const result = await requireAdmin();
  if (result.profile.role !== "super_admin") {
    redirect("/pouri");
  }
  return result;
}
