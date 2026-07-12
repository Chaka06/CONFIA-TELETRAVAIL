import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { initiateContributionPayment, TontineServiceError } from "@/lib/services/tontine";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  try {
    const { redirectUrl } = await initiateContributionPayment(supabase, {
      contributionId: id,
      userId: user.id,
    });
    return NextResponse.json({ redirectUrl });
  } catch (err) {
    if (err instanceof TontineServiceError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error("initiate_contribution_payment_failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
