import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastBasketsEncouragement } from "@/lib/telegram";
import { timingSafeStringEqual } from "@/lib/timing-safe-equal";

export const maxDuration = 30;

/**
 * Diffusion quotidienne dans le groupe Telegram pour inciter à rejoindre un
 * panier — indépendante de toute adhésion (contrairement à
 * notifyBasketMemberJoined) : plus un panier se remplit vite, plus vite un
 * gagnant est désigné, donc l'objectif est de relancer même sans mouvement
 * récent.
 *
 * Déclenché par Vercel Cron (voir vercel.json). Protégé par CRON_SECRET —
 * échec fermé si le secret n'est pas configuré.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("telegram_encouragement_cron_secret_not_configured");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !timingSafeStringEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  await broadcastBasketsEncouragement(admin);

  return NextResponse.json({ ok: true });
}
