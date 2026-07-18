/**
 * Test d'intégration de l'inscription par code OTP maison
 * (src/lib/auth/signup-otp.ts), exécuté contre la stack Supabase LOCALE
 * (`npx supabase start` doit être lancé au préalable) et son Mailpit local
 * pour récupérer le vrai code envoyé par e-mail.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

try {
  process.loadEnvFile(new URL("../../.env.local", import.meta.url));
} catch {
  // .env.local absent : on retombe sur les valeurs par défaut de la stack locale ci-dessous.
}

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const { requestSignupOtp, resendSignupOtp, verifySignupOtp } = await import("@/lib/auth/signup-otp");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

function uniqueEmail(label: string) {
  return `otp.${label}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

const BASE_INPUT = {
  password: "TestPassword123",
  firstName: "Test",
  lastName: "Otp",
  dateOfBirth: "1995-01-01",
  city: "Abidjan",
  phoneNumber: "+2250700009999",
};

/** Récupère le code à 6 chiffres du dernier e-mail envoyé à cette adresse via Mailpit. */
async function fetchLatestOtpCode(email: string): Promise<string> {
  const search = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`
  ).then((r) => r.json());
  const messageId = search.messages?.[0]?.ID;
  if (!messageId) throw new Error(`Aucun e-mail trouvé pour ${email}`);

  const message = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`).then((r) => r.json());
  const body: string = message.Text ?? message.HTML ?? "";
  const match = body.match(/\b(\d{6})\b/);
  if (!match) throw new Error(`Aucun code à 6 chiffres trouvé dans l'e-mail pour ${email}`);
  return match[1];
}

describe("Inscription par code OTP", () => {
  const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const createdEmails: string[] = [];

  async function cleanup(email: string) {
    const { data } = await admin.auth.admin.listUsers();
    const user = data.users.find((u) => u.email === email);
    if (user) await admin.auth.admin.deleteUser(user.id);
  }

  afterAll(async () => {
    for (const email of createdEmails) await cleanup(email);
  });

  it("un code correct valide le compte et permet une session", async () => {
    const email = uniqueEmail("happy");
    createdEmails.push(email);

    await requestSignupOtp({ ...BASE_INPUT, email });
    const code = await fetchLatestOtpCode(email);

    const { tokenHash } = await verifySignupOtp(email, code);
    expect(tokenHash).toBeTruthy();

    const { data: profile } = await admin.from("profiles").select("email_verified_at").eq("email", email).single();
    expect(profile?.email_verified_at).not.toBeNull();
  });

  it("revérifier un compte déjà activé échoue avec already_verified", async () => {
    const email = uniqueEmail("already");
    createdEmails.push(email);

    await requestSignupOtp({ ...BASE_INPUT, email });
    const code = await fetchLatestOtpCode(email);
    await verifySignupOtp(email, code);

    await expect(verifySignupOtp(email, code)).rejects.toMatchObject({ code: "already_verified" });
  });

  it("un code incorrect est rejeté et incrémente le compteur de tentatives", async () => {
    const email = uniqueEmail("wrong");
    createdEmails.push(email);

    await requestSignupOtp({ ...BASE_INPUT, email });

    await expect(verifySignupOtp(email, "000000")).rejects.toMatchObject({ code: "invalid_code" });

    const { data: profile } = await admin.from("profiles").select("id").eq("email", email).single();
    const { data: row } = await admin
      .from("email_verification_codes")
      .select("attempts")
      .eq("user_id", profile!.id)
      .is("consumed_at", null)
      .single();
    expect(row?.attempts).toBe(1);
  });

  it("dépasser le nombre maximal de tentatives bloque la vérification (too_many_attempts)", async () => {
    const email = uniqueEmail("maxattempts");
    createdEmails.push(email);

    await requestSignupOtp({ ...BASE_INPUT, email });

    const { data: profile } = await admin.from("profiles").select("id").eq("email", email).single();
    await admin
      .from("email_verification_codes")
      .update({ attempts: 5 })
      .eq("user_id", profile!.id)
      .is("consumed_at", null);

    await expect(verifySignupOtp(email, "111111")).rejects.toMatchObject({ code: "too_many_attempts" });
  });

  it("un code expiré est rejeté (expired)", async () => {
    const email = uniqueEmail("expired");
    createdEmails.push(email);

    await requestSignupOtp({ ...BASE_INPUT, email });

    const { data: profile } = await admin.from("profiles").select("id").eq("email", email).single();
    await admin
      .from("email_verification_codes")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("user_id", profile!.id)
      .is("consumed_at", null);

    await expect(verifySignupOtp(email, "111111")).rejects.toMatchObject({ code: "expired" });
  });

  it("renvoyer un code immédiatement après l'inscription est bloqué par le cooldown", async () => {
    const email = uniqueEmail("cooldown");
    createdEmails.push(email);

    await requestSignupOtp({ ...BASE_INPUT, email });

    await expect(resendSignupOtp(email)).rejects.toMatchObject({ code: "cooldown" });
  });

  it("se réinscrire avec la même adresse avant confirmation repart d'un compte neuf", async () => {
    const email = uniqueEmail("reinscription");
    createdEmails.push(email);

    await requestSignupOtp({ ...BASE_INPUT, email, firstName: "Premier" });
    const { data: firstProfile } = await admin.from("profiles").select("id").eq("email", email).single();

    // Deuxième tentative d'inscription avec la même adresse, jamais confirmée : ne doit
    // jamais échouer avec "already_registered", et doit repartir d'un compte neuf.
    await requestSignupOtp({ ...BASE_INPUT, email, firstName: "Second" });
    const { data: secondProfile } = await admin.from("profiles").select("id").eq("email", email).single();

    expect(secondProfile!.id).not.toBe(firstProfile!.id);
  });

  it("se réinscrire avec une adresse déjà confirmée échoue avec already_registered", async () => {
    const email = uniqueEmail("dejaconfirme");
    createdEmails.push(email);

    await requestSignupOtp({ ...BASE_INPUT, email });
    const code = await fetchLatestOtpCode(email);
    await verifySignupOtp(email, code);

    await expect(requestSignupOtp({ ...BASE_INPUT, email })).rejects.toMatchObject({
      code: "already_registered",
    });
  });
});
