import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requestWithdrawal, WithdrawalServiceError } from "@/lib/services/withdrawals";

const bodySchema = z.object({
  amount: z.number().positive().max(200_000),
  phoneNumber: z.string().regex(/^\+?[0-9]{8,15}$/),
  fullName: z.string().min(2).max(150),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const withdrawal = await requestWithdrawal(supabase, parsed.data);
    return NextResponse.json({ withdrawal });
  } catch (err) {
    if (err instanceof WithdrawalServiceError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("request_withdrawal_failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
