import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { DepositServiceError, initiateTierDeposit } from "@/lib/services/deposits";

const bodySchema = z.object({
  cycleTierId: z.string().uuid(),
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
    const { redirectUrl, deposit } = await initiateTierDeposit(supabase, {
      cycleTierId: parsed.data.cycleTierId,
      userId: user.id,
    });

    return NextResponse.json({ redirectUrl, depositId: deposit.id });
  } catch (err) {
    if (err instanceof DepositServiceError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("initiate_deposit_failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
