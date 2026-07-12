import { NextResponse } from "next/server";
import { z } from "zod";

import { resendSignupOtp, SignupOtpError } from "@/lib/auth/signup-otp";

const bodySchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    await resendSignupOtp(parsed.data.email);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof SignupOtpError) {
      return NextResponse.json({ error: err.code }, { status: 422 });
    }
    console.error("signup_otp_resend_failed", err);
    return NextResponse.json({ error: "unexpected_error" }, { status: 500 });
  }
}
