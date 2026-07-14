/**
 * Régression : profiles_guard_privileged_fields (supabase/migrations/...0007)
 * bloquait silencieusement TOUTE écriture sur profiles.role / profiles.status /
 * profiles.email_verified_at dès que is_admin() était faux — ce qui est
 * TOUJOURS le cas en dehors d'une requête authentifiée par un admin humain :
 *  - le trigger système handle_email_confirmation (confirmation d'e-mail)
 *    ne pouvait donc jamais marquer un profil confirmé,
 *  - les actions admin (adminSetUserRole / adminSetUserStatus, via le
 *    client service_role) ne pouvaient jamais changer role/status non plus,
 *    sans qu'aucune erreur ne soit renvoyée.
 * Corrigé en 0010 (reconnaît service_role et le contexte système postgres).
 * Ce test vérifie directement, contre la stack Supabase LOCALE, que ces
 * écritures persistent réellement.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";

try {
  process.loadEnvFile(new URL("../../.env.local", import.meta.url));
} catch {
  // .env.local absent : on retombe sur les valeurs par défaut de la stack locale ci-dessous.
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("profiles_guard_privileged_fields — écritures système et admin", () => {
  const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId: string | null = null;

  afterEach(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
    userId = null;
  });

  it("une confirmation d'e-mail à la création marque bien le profil confirmé", async () => {
    const email = `guard.confirm.${Date.now()}@example.com`;
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password: "TestPassword123",
      email_confirm: true,
      user_metadata: { first_name: "G", last_name: "C", date_of_birth: "1995-01-01", city: "Abidjan", phone_number: "+2250700000010" },
    });
    userId = created!.user!.id;

    const { data: profile } = await admin.from("profiles").select("email_verified_at").eq("id", userId).single();
    expect(profile?.email_verified_at).not.toBeNull();
  });

  it("une écriture service_role sur profiles.role persiste réellement", async () => {
    const email = `guard.role.${Date.now()}@example.com`;
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password: "TestPassword123",
      email_confirm: true,
      user_metadata: { first_name: "G", last_name: "R", date_of_birth: "1995-01-01", city: "Abidjan", phone_number: "+2250700000011" },
    });
    userId = created!.user!.id;

    const { error } = await admin.from("profiles").update({ role: "admin" }).eq("id", userId);
    expect(error).toBeNull();

    const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).single();
    expect(profile?.role).toBe("admin");
  });

  it("une écriture service_role sur profiles.status persiste réellement", async () => {
    const email = `guard.status.${Date.now()}@example.com`;
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password: "TestPassword123",
      email_confirm: true,
      user_metadata: { first_name: "G", last_name: "S", date_of_birth: "1995-01-01", city: "Abidjan", phone_number: "+2250700000012" },
    });
    userId = created!.user!.id;

    const { error } = await admin.from("profiles").update({ status: "suspended" }).eq("id", userId);
    expect(error).toBeNull();

    const { data: profile } = await admin.from("profiles").select("status").eq("id", userId).single();
    expect(profile?.status).toBe("suspended");
  });
});
