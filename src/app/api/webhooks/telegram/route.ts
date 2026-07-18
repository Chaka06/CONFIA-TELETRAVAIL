import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { escapeTelegramHtml, sendTelegramMessageTo } from "@/lib/telegram";
import { timingSafeStringEqual } from "@/lib/timing-safe-equal";

export const maxDuration = 15;

const HELP_TEXT =
  "Commandes disponibles :\n" +
  "/paniers — remplissage actuel des 4 formules\n" +
  "/gagnant — dernier gagnant connu\n" +
  "/aide — cette liste";

/**
 * Webhook des mises à jour Telegram (messages reçus dans le groupe).
 * Vérifié via le secret_token configuré à l'enregistrement du webhook
 * (setWebhook), transmis par Telegram dans l'en-tête
 * X-Telegram-Bot-Api-Secret-Token — jamais dans l'URL ni le corps, pour ne
 * jamais le voir apparaître dans des journaux d'accès.
 *
 * Ne répond QU'aux commandes reconnues (/paniers, /gagnant, /aide, /start) :
 * un bot qui répond à tout message dans un groupe public serait vite
 * perçu comme du bruit.
 */
export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!expectedSecret || !providedSecret || !timingSafeStringEqual(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  const message = update?.message;
  const chatId: string | number | undefined = message?.chat?.id;
  const text: string | undefined = message?.text;

  // Toujours répondre 200 à Telegram au-delà de ce point (même si on ne
  // fait rien) : un statut d'erreur ferait retenter Telegram indéfiniment.
  if (!chatId || !text || !text.startsWith("/")) {
    return NextResponse.json({ ok: true });
  }

  // "/paniers@nom_du_bot" (mention explicite du bot, courant dans un
  // groupe à plusieurs bots) doit être reconnu comme "/paniers".
  const command = text.trim().split(/\s+/)[0].split("@")[0].toLowerCase();

  const admin = createAdminClient();

  if (command === "/paniers") {
    const [{ data: basketTypes }, { data: instances }] = await Promise.all([
      admin
        .from("tontine_basket_types")
        .select("id, label, capacity")
        .eq("is_active", true)
        .order("contribution_amount"),
      admin
        .from("tontine_basket_instances")
        .select("basket_type_id, member_count, created_at")
        .eq("status", "filling")
        .order("created_at", { ascending: true }),
    ]);

    const filledCount: Record<string, number> = {};
    for (const i of instances ?? []) {
      if (!(i.basket_type_id in filledCount)) filledCount[i.basket_type_id] = i.member_count;
    }

    const lines = (basketTypes ?? []).map(
      (bt) => `• <b>${escapeTelegramHtml(bt.label)}</b> : ${filledCount[bt.id] ?? 0}/${bt.capacity} membres`
    );
    await sendTelegramMessageTo(chatId, lines.length > 0 ? lines.join("\n") : "Aucun panier actif pour le moment.");
  } else if (command === "/gagnant") {
    const { data: payout } = await admin
      .from("tontine_payouts")
      .select(
        "amount, status, tontine_basket_instances(tontine_basket_types(label)), tontine_memberships(profiles(first_name))"
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payout) {
      await sendTelegramMessageTo(chatId, "Aucun gagnant pour le moment.");
    } else {
      const basketLabel = payout.tontine_basket_instances?.tontine_basket_types?.label ?? "Panier";
      const firstName = payout.tontine_memberships?.profiles?.first_name ?? "Un membre";
      const statusNote = payout.status === "paid" ? "déjà versé" : "en cours de versement";
      await sendTelegramMessageTo(
        chatId,
        `🏆 Dernier gagnant : <b>${escapeTelegramHtml(firstName)}</b> sur le <b>${escapeTelegramHtml(basketLabel)}</b> — ${formatFcfa(Number(payout.amount))} (${statusNote}).`
      );
    }
  } else if (command === "/aide" || command === "/start" || command === "/help") {
    await sendTelegramMessageTo(chatId, HELP_TEXT);
  }

  return NextResponse.json({ ok: true });
}
