import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import {
  escapeTelegramHtml,
  fetchBasketStatusLines,
  pickJoinEncouragement,
  pickSignupNudge,
  sendTelegramMessageTo,
} from "@/lib/telegram";
import { timingSafeStringEqual } from "@/lib/timing-safe-equal";

export const maxDuration = 15;

const HELP_TEXT =
  "🤖 <b>Confssa Tontine — Commandes</b>\n\n" +
  "On est ensemble, wesh ! Voici ce que je sais faire 🙌\n\n" +
  "💰 /paniers — <i>remplissage des 4 formules</i>\n" +
  "🏆 /gagnant — <i>dernier gagnant connu</i>\n" +
  "🚀 /inscription — <i>créer ton compte, ça ne mord pas</i>\n" +
  "❓ /aide — <i>cette liste</i>";

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
    const lines = await fetchBasketStatusLines(admin);
    const body =
      lines.length > 0
        ? `💰 <b>Paniers en cours</b>\n\n${lines.join("\n\n")}\n\n${pickJoinEncouragement()}`
        : "😴 <i>Aucun panier actif pour le moment.</i>";
    await sendTelegramMessageTo(chatId, body);
  } else if (command === "/gagnant") {
    const { data: lastClaim } = await admin
      .from("payout_claims")
      .select("paid_at, panier_memberships(user_id, panier_id)")
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastClaim?.panier_memberships) {
      await sendTelegramMessageTo(chatId, "😴 <i>Aucun gagnant pour le moment.</i>");
    } else {
      const { user_id: userId, panier_id: panierId } = lastClaim.panier_memberships;
      const [{ data: profile }, { data: panier }] = await Promise.all([
        admin.from("profiles").select("first_name").eq("id", userId).single(),
        admin.from("paniers_public").select("formule_amount, gain_net_amount").eq("id", panierId).single(),
      ]);
      const firstName = profile?.first_name ?? "Un membre";
      const basketLabel = panier ? `Panier ${formatFcfa(panier.formule_amount ?? 0)}` : "Panier";
      await sendTelegramMessageTo(
        chatId,
        `🏆 <b>Dernier gagnant</b>\n\n` +
          `👤 <b>${escapeTelegramHtml(firstName)}</b>\n` +
          `📦 ${escapeTelegramHtml(basketLabel)}\n` +
          `💵 Montant : <b>${formatFcfa(panier?.gain_net_amount ?? 0)}</b>\n` +
          `✅ <i>Déjà versé</i>`
      );
    }
  } else if (command === "/inscription" || command === "/inscrire" || command === "/rejoindre") {
    await sendTelegramMessageTo(chatId, pickSignupNudge());
  } else if (command === "/aide" || command === "/start" || command === "/help") {
    await sendTelegramMessageTo(chatId, HELP_TEXT);
  }

  return NextResponse.json({ ok: true });
}
