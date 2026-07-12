import { NextResponse } from "next/server";

import { signUpSchema } from "@/lib/validation/auth";
import { requestSignupOtp, SignupOtpError } from "@/lib/auth/signup-otp";

// Marge au-delà du timeout SMTP (cf. transporter.ts) pour laisser à la
// fonction le temps de répondre proprement même en cas de serveur SMTP lent.
export const maxDuration = 30;

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    await requestSignupOtp({
      email: parsed.data.email,
      password: parsed.data.password,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      dateOfBirth: parsed.data.dateOfBirth,
      city: parsed.data.city,
      phoneNumber: parsed.data.phoneNumber,
      referralCode: parsed.data.referralCode || null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof SignupOtpError) {
      return NextResponse.json({ error: err.code }, { status: 422 });
    }
    console.error("signup_otp_request_failed", err);
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
}
