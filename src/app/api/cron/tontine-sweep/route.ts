import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { timingSafeStringEqual } from "@/lib/timing-safe-equal";
import { formatFcfa } from "@/lib/format";
import { getServerEnv } from "@/lib/env";
import { sendTransactionalEmail } from "@/lib/email/send";
import { payoutReadyEmail } from "@/lib/email/templates";
import { notifyPayoutReady } from "@/lib/telegram";

export const maxDuration = 60;

/**
 * Tirage des gagnants. Modèle "paiement unique" : remplir un panier et
 * désigner un gagnant ne sont plus le même instant (contrairement à
 * l'ancien modèle) — run_scheduled_panier_draws tire le gagnant de chaque
 * panier dont le délai (draw_at) est arrivé à échéance, et crée une
 * notification in-app 'panier_won'. On s'en sert ici pour savoir qui
 * prévenir par e-mail/Telegram, sans dépendre d'un jeton public : le
 * gagnant réclame son gain depuis son propre tableau de bord (RLS oblige).
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
  if (!authHeader || !timingSafeStringEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const env = getServerEnv();
  const since = new Date().toISOString();

  const { error } = await admin.rpc("run_scheduled_panier_draws");
  if (error) {
    console.error("panier_draws_failed", error);
    return NextResponse.json({ error: "sweep_failed" }, { status: 500 });
  }

  const { data: newWins } = await admin
    .from("notifications")
    .select("user_id, payload")
    .eq("type", "panier_won")
    .gte("created_at", since);

  let notified = 0;
  for (const win of newWins ?? []) {
    const panierId = (win.payload as { panier_id?: string } | null)?.panier_id;
    if (!panierId) continue;

    const [{ data: authUser }, { data: profile }, { data: panier }] = await Promise.all([
      admin.auth.admin.getUserById(win.user_id),
      admin.from("profiles").select("first_name").eq("id", win.user_id).single(),
      admin.from("paniers_public").select("formule_amount, gain_net_amount").eq("id", panierId).single(),
    ]);

    const basketLabel = panier ? `Panier ${formatFcfa(panier.formule_amount ?? 0)}` : "Panier";
    const amount = panier?.gain_net_amount ?? 0;

    if (authUser?.user?.email) {
      await sendTransactionalEmail({
        userId: win.user_id,
        toEmail: authUser.user.email,
        templateKey: "payout_ready",
        template: payoutReadyEmail({
          basketLabel,
          amount,
          claimUrl: `${env.APP_BASE_URL}/tableau-de-bord/mes-paniers`,
        }),
      });
    }

    await notifyPayoutReady({
      basketLabel,
      firstName: profile?.first_name ?? "Un membre",
      amount,
    });

    notified++;
  }

  return NextResponse.json({ winners: notified });
}
