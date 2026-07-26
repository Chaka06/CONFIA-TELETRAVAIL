import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { timingSafeStringEqual } from "@/lib/timing-safe-equal";

/**
 * Provisionnement du compte super_admin à partir de variables d'environnement
 * uniquement (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_BOOTSTRAP_SECRET) — jamais
 * de mot de passe en dur ni transmis autrement que via les variables
 * d'environnement Vercel. Idempotent : peut être rappelé sans risque (met à
 * jour le mot de passe et le rôle si le compte existe déjà).
 *
 * Protégé par un secret partagé distinct (ADMIN_BOOTSTRAP_SECRET) plutôt que
 * par une session admin, puisqu'aucun admin n'existe encore au premier appel.
 *
 * profiles n'a pas de colonne email (elle vit uniquement dans auth.users) :
 * l'idempotence passe donc par l'erreur email_exists de createUser plutôt
 * que par une recherche préalable dans profiles.
 */
export async function POST(request: Request) {
  const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!expectedSecret || !email || !password) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const providedSecret = request.headers.get("x-bootstrap-secret");
  if (!providedSecret || !timingSafeStringEqual(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: "Super",
      last_name: "Admin",
      birth_date: "1990-01-01",
      city: "Abidjan",
      phone: "+2250000000000",
    },
  });

  if (createError || !created.user) {
    if (createError?.code !== "email_exists") {
      return NextResponse.json({ error: "create_failed" }, { status: 500 });
    }

    // Compte déjà existant : on le retrouve pour mettre à jour son mot de
    // passe et son rôle plutôt que d'échouer.
    const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = existingUsers?.users.find((u) => u.email === email);

    if (listError || !existing) {
      return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
    }

    await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    await admin.from("profiles").update({ role: "super_admin" }).eq("id", existing.id);
    return NextResponse.json({ success: true, action: "updated" });
  }

  const { error: promoteError } = await admin
    .from("profiles")
    .update({ role: "super_admin" })
    .eq("id", created.user.id);

  if (promoteError) {
    return NextResponse.json({ error: "promote_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, action: "created" });
}
