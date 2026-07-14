import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Balayage quotidien de la tontine. Dans le nouveau modèle (paiement unique à
 * l'adhésion, gain instantané au 20e paiement), il ne reste qu'une seule
 * tâche périodique : expirer après 24h les réservations (dépôt d'entrée
 * jamais payé) pour libérer les places abandonnées. Tout le reste (gains,
 * clôture d'instance) est déclenché de façon synchrone par le webhook de
 * paiement, sans dépendance au cron.
 *
 * Déclenché par Vercel Cron (voir vercel.json). Protégé par CRON_SECRET —
 * échec fermé si le secret n'est pas configuré.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("tontine_sweep_cron_secret_not_configured");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.rpc("fn_daily_tontine_sweep");
  if (error) {
    console.error("tontine_sweep_failed", error);
    return NextResponse.json({ error: "sweep_failed" }, { status: 500 });
  }

  const result = data as unknown as { expired: number };
  return NextResponse.json({ expired: result.expired });
}
