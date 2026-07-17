import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/** Compare deux secrets en temps constant, comme pour la signature du webhook GeniusPay. */
function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Provisionnement du compte super_admin à partir de variables d'environnement
 * uniquement (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_BOOTSTRAP_SECRET) — jamais
 * de mot de passe en dur ni transmis autrement que via les variables
 * d'environnement Vercel. Idempotent : peut être rappelé sans risque (met à
 * jour le mot de passe et le rôle si le compte existe déjà).
 *
 * Protégé par un secret partagé distinct (ADMIN_BOOTSTRAP_SECRET) plutôt que
 * par une session admin, puisqu'aucun admin n'existe encore au premier appel.
 */
export async function POST(request: Request) {
  const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!expectedSecret || !email || !password) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const providedSecret = request.headers.get("x-bootstrap-secret");
  if (!providedSecret || !secretsMatch(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    if (existing.role !== "super_admin") {
      await admin.from("profiles").update({ role: "super_admin" }).eq("id", existing.id);
    }
    return NextResponse.json({ success: true, action: "updated" });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: "Super",
      last_name: "Admin",
      date_of_birth: "1990-01-01",
      city: "Abidjan",
      phone_number: "+2250000000000",
    },
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
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
