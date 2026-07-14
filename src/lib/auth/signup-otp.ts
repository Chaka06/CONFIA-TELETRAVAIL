import "server-only";
import crypto from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/email/send";
import { signupOtpEmail } from "@/lib/email/templates";

/**
 * Inscription par code OTP entièrement maison : Supabase Auth ne compose ni
 * n'envoie jamais cet e-mail (contrairement à son mailer natif). L'app
 * génère le code, le stocke hashé, l'envoie via son propre SMTP, puis marque
 * le compte confirmé elle-même une fois le code validé.
 */

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;

export class SignupOtpError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function issueCode(admin: AdminClient, userId: string, email: string) {
  const code = generateCode();

  const { error } = await admin.from("email_verification_codes").insert({
    user_id: userId,
    email,
    code_hash: hashCode(code),
    purpose: "signup",
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });

  if (error) throw new SignupOtpError("code_creation_failed");

  await sendTransactionalEmail({
    userId,
    toEmail: email,
    template: signupOtpEmail({ code }),
    templateKey: "signup_otp",
  });
}

export async function requestSignupOtp(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  city: string;
  phoneNumber: string;
  referralCode: string | null;
}) {
  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, email_verified_at")
    .eq("email", input.email)
    .maybeSingle();

  if (existingProfile) {
    if (existingProfile.email_verified_at) {
      throw new SignupOtpError("already_registered");
    }
    // Inscription précédente jamais confirmée (code jamais saisi) : on
    // repart proprement d'un compte neuf plutôt que d'échouer.
    const { error: deleteError } = await admin.auth.admin.deleteUser(existingProfile.id);
    if (deleteError) throw new SignupOtpError("cleanup_failed");
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: false,
    user_metadata: {
      first_name: input.firstName,
      last_name: input.lastName,
      date_of_birth: input.dateOfBirth,
      city: input.city,
      phone_number: input.phoneNumber,
      referral_code_input: input.referralCode || null,
    },
  });

  if (createError || !created.user) {
    throw new SignupOtpError(createError?.code === "email_exists" ? "already_registered" : "signup_failed");
  }

  await issueCode(admin, created.user.id, input.email);
}

export async function resendSignupOtp(email: string) {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email_verified_at")
    .eq("email", email)
    .maybeSingle();

  if (!profile || profile.email_verified_at) {
    throw new SignupOtpError("not_pending");
  }

  const { data: lastCode } = await admin
    .from("email_verification_codes")
    .select("created_at")
    .eq("user_id", profile.id)
    .eq("purpose", "signup")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastCode && Date.now() - new Date(lastCode.created_at).getTime() < RESEND_COOLDOWN_MS) {
    throw new SignupOtpError("cooldown");
  }

  await admin
    .from("email_verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .eq("purpose", "signup")
    .is("consumed_at", null);

  await issueCode(admin, profile.id, email);
}

export async function verifySignupOtp(email: string, code: string): Promise<{ tokenHash: string }> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email_verified_at")
    .eq("email", email)
    .maybeSingle();

  if (!profile) throw new SignupOtpError("not_found");
  if (profile.email_verified_at) throw new SignupOtpError("already_verified");

  const { data: row } = await admin
    .from("email_verification_codes")
    .select("id, code_hash, attempts, max_attempts, expires_at")
    .eq("user_id", profile.id)
    .eq("purpose", "signup")
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) throw new SignupOtpError("no_pending_code");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new SignupOtpError("expired");
  if (row.attempts >= row.max_attempts) throw new SignupOtpError("too_many_attempts");

  if (row.code_hash !== hashCode(code)) {
    await admin.from("email_verification_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    throw new SignupOtpError("invalid_code");
  }

  await admin
    .from("email_verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);

  await admin.auth.admin.updateUserById(profile.id, { email_confirm: true });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData) throw new SignupOtpError("session_creation_failed");

  return { tokenHash: linkData.properties.hashed_token };
}
