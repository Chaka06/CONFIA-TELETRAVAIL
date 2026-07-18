/**
 * Test d'intégration du flux de réinitialisation de mot de passe
 * (mot de passe oublié -> e-mail de récupération natif GoTrue -> nouveau mot
 * de passe), exécuté contre la stack Supabase LOCALE et son Mailpit local
 * pour récupérer le vrai lien envoyé. Contrairement à l'inscription (code
 * OTP maison), cette partie utilise directement les mécanismes natifs de
 * Supabase Auth (resetPasswordForEmail / verifyOtp type=recovery /
 * updateUser) — le test vérifie que le lien réel envoyé fonctionne de bout
 * en bout, pas seulement que le SDK est correctement appelé.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

try {
  process.loadEnvFile(new URL("../../.env.local", import.meta.url));
} catch {
  // .env.local absent : valeurs par défaut de la stack locale ci-dessous.
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

const OLD_PASSWORD = "OldPassword123";
const NEW_PASSWORD = "NewPassword456";

function uniqueEmail(label: string) {
  return `pwreset.${label}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Récupère le token_hash du dernier e-mail de récupération envoyé à cette adresse via Mailpit. */
async function fetchLatestRecoveryTokenHash(email: string): Promise<string> {
  const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`).then((r) =>
    r.json()
  );
  const messageId = search.messages?.[0]?.ID;
  if (!messageId) throw new Error(`Aucun e-mail trouvé pour ${email}`);

  const message = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`).then((r) => r.json());
  const body: string = message.Text ?? message.HTML ?? "";
  const match = body.match(/token_hash=([^&\s"]+)/);
  if (!match) throw new Error(`Aucun token_hash trouvé dans l'e-mail pour ${email}`);
  return decodeURIComponent(match[1]);
}

describe("Réinitialisation de mot de passe (lien réel envoyé par e-mail)", () => {
  const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId: string | null = null;

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("le lien reçu par e-mail permet de définir un nouveau mot de passe, utilisable ensuite pour se connecter", async () => {
    const email = uniqueEmail("happy");
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password: OLD_PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: "Pw", last_name: "Reset", date_of_birth: "1995-01-01", city: "Abidjan", phone_number: "+2250700009998" },
    });
    userId = created!.user!.id;

    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { error: resetError } = await anon.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/auth/confirm?next=/reinitialiser-mot-de-passe",
    });
    expect(resetError).toBeNull();

    const tokenHash = await fetchLatestRecoveryTokenHash(email);

    const recoveryClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: verifyError } = await recoveryClient.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    expect(verifyError).toBeNull();

    const { error: updateError } = await recoveryClient.auth.updateUser({ password: NEW_PASSWORD });
    expect(updateError).toBeNull();

    // Le nouveau mot de passe fonctionne réellement pour une connexion normale...
    const loginClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: newLoginError } = await loginClient.auth.signInWithPassword({ email, password: NEW_PASSWORD });
    expect(newLoginError).toBeNull();

    // ...et l'ancien ne fonctionne plus.
    const oldLoginClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: oldLoginError } = await oldLoginClient.auth.signInWithPassword({ email, password: OLD_PASSWORD });
    expect(oldLoginError).not.toBeNull();
  });

  it("un token_hash de récupération invalide est rejeté", async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY);
    const { error } = await client.auth.verifyOtp({ type: "recovery", token_hash: "ce-token-nexiste-pas" });
    expect(error).not.toBeNull();
  });
});
