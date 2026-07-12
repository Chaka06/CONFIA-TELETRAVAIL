import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { joinBasketAndPay, TontineServiceError } from "@/lib/services/tontine";

const bodySchema = z.object({
  basketTypeId: z.string().uuid(),
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
    const { redirectUrl } = await joinBasketAndPay(supabase, {
      basketTypeId: parsed.data.basketTypeId,
      userId: user.id,
    });
    return NextResponse.json({ redirectUrl });
  } catch (err) {
    if (err instanceof TontineServiceError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("join_basket_failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
