import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const bodySchema = z.object({
  assignmentId: z.string().uuid(),
  submission: z.record(z.string(), z.unknown()),
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

  const { data, error } = await supabase.rpc("submit_mission_assignment", {
    p_assignment_id: parsed.data.assignmentId,
    p_submission_data: parsed.data.submission as Json,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  // La correction est automatique : le résultat (validée/ratée) est connu
  // immédiatement et renvoyé tel quel au client.
  const result = data as { approved: boolean; message: string } | null;
  return NextResponse.json({ success: true, approved: result?.approved ?? false, message: result?.message });
}
