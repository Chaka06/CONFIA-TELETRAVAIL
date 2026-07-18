import "server-only";

import { formatFcfa } from "@/lib/format";
import type { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = process.env.APP_BASE_URL ?? "https://confssa.com";
const JOIN_URL = `${SITE_URL}/paniers`;

/**
 * Échappe les caractères spéciaux du sous-ensemble HTML de Telegram, pour
 * qu'un prénom d'utilisateur (donnée saisie librement à l'inscription) ne
 * puisse jamais injecter de faux lien ou de mise en forme trompeuse dans un
 * message envoyé au groupe.
 */
export function escapeTelegramHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Envoie un message à un chat Telegram précis (groupe, réponse à une
 * commande...). Tolérant à l'absence de configuration du token : un envoi
 * qui échoue ou n'est pas configuré ne doit jamais faire échouer
 * l'opération métier qui l'a déclenché.
 */
export async function sendTelegramMessageTo(chatId: string | number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn("telegram_not_configured");
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });

    if (!response.ok) {
      console.error("telegram_send_failed", await response.text().catch(() => ""));
    }
  } catch (err) {
    console.error("telegram_send_error", err);
  }
}

/**
 * Diffuse un message dans le groupe configuré (TELEGRAM_CHAT_ID) — les
 * notifications automatiques déclenchées par le site (adhésion, gain...).
 */
async function sendTelegramMessage(text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.warn("telegram_not_configured", { hasChatId: false });
    return;
  }
  await sendTelegramMessageTo(chatId, text);
}

/**
 * Barre de progression textuelle sur 10 blocs (ex: "▰▰▰▰▰▰░░░░"), pour un
 * repère visuel immédiat du remplissage sans avoir à lire les chiffres.
 */
export function progressBar(count: number, capacity: number): string {
  const filled = Math.max(0, Math.min(10, Math.round((count / capacity) * 10)));
  return "▰".repeat(filled) + "▱".repeat(10 - filled);
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Relances "premier arrivé, premier servi" — ton ivoirien assumé, c'est un
 * groupe communautaire, pas une notif bancaire. Piochées au hasard pour ne
 * pas lasser à force de répétition.
 */
const JOIN_ENCOURAGEMENTS = [
  "⚡️ <i>Premier arrivé, premier servi ! Faut pas dormir sur la natte 😴</i>",
  "🔥 <i>Ça bouge sérieux ici, on est ensemble ! Chope ta place avant que ça parte</i> 🏃💨",
  "👀 <i>Encore quelques places, wesh la famille ! Fais vite fais vite</i> ⏱️",
  "💪 <i>Y'a pas drap, viens comme tu es — mais viens vite quand même</i> 😉",
] as const;

/** Exposée pour la commande /paniers du webhook (même ton, même relance). */
export function pickJoinEncouragement(): string {
  return pickRandom(JOIN_ENCOURAGEMENTS);
}

/** Relances utilisées pour les diffusions périodiques (pas liées à une adhésion précise). */
const PERIODIC_ENCOURAGEMENTS = [
  "Plus vite un panier se remplit, plus vite quelqu'un empoche le gain !",
  "Chaque nouveau membre rapproche tout le monde du prochain gagnant.",
  "Ne reste pas spectateur — le prochain gagnant, ça pourrait être toi.",
  "Un panier qui se remplit vite, c'est un gain qui tombe vite. On accélère ?",
] as const;

const WIN_CELEBRATIONS = [
  "🎉 Aiyééé, ambiance dans la cour ! On enjaille grave 🥳",
  "🙌 Nickel chrome, c'est carré ! Le nzassa est bien mérité 💸",
  "🎊 Ça c'est du sérieux, félicitations champion(ne) ! Profite bien 🙏",
  "🥳 Deuga confirmé ! Bravo, que ça continue comme ça 🔥",
] as const;

/**
 * Ligne "🔸 Libellé / barre + compte + places restantes" pour une formule.
 * Partagée entre la commande /paniers (webhook) et la diffusion périodique
 * d'encouragement (cron), pour un rendu identique aux deux endroits.
 */
function formatBasketStatusLine(label: string, count: number, capacity: number): string {
  const remaining = Math.max(0, capacity - count);
  return (
    `🔸 <b>${escapeTelegramHtml(label)}</b>\n` +
    `${progressBar(count, capacity)} <b>${count}/${capacity}</b> membres <i>(encore ${remaining})</i>`
  );
}

/** Récupère et formate le remplissage des formules actives, prêt à afficher. */
export async function fetchBasketStatusLines(admin: ReturnType<typeof createAdminClient>): Promise<string[]> {
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

  return (basketTypes ?? []).map((bt) => formatBasketStatusLine(bt.label, filledCount[bt.id] ?? 0, bt.capacity));
}

/**
 * À chaque nouvelle adhésion payée (confirmation d'un dépôt d'entrée), y
 * compris avant que le panier soit plein : annonce le nouveau compte de
 * membres pour la formule concernée, le nombre de places restantes, et
 * relance vers le site pour attirer les prochains — premier arrivé, premier
 * servi.
 */
export async function notifyBasketMemberJoined(params: {
  basketLabel: string;
  memberCount: number;
  capacity: number;
}) {
  const basketLabel = escapeTelegramHtml(params.basketLabel);
  const remaining = params.capacity - params.memberCount;

  if (remaining <= 0) {
    // Le panier vient d'être complété : notifyPayoutReady suit
    // immédiatement avec le gagnant et le montant, inutile de relancer
    // "rejoins vite" sur une place qui n'existe déjà plus.
    await sendTelegramMessage(
      `👤 <b>Nouveau membre</b> a rejoint le <b>${basketLabel}</b> !\n\n` +
        `${progressBar(params.memberCount, params.capacity)} <b>${params.memberCount}/${params.capacity}</b> membres — <b>panier complet</b> 🎉\n` +
        `<i>Le gagnant est annoncé juste après...</i>`
    );
    return;
  }

  const placeWord = remaining === 1 ? "place" : "places";
  await sendTelegramMessage(
    `👤 <b>Nouveau membre</b> a rejoint le <b>${basketLabel}</b> !\n\n` +
      `${progressBar(params.memberCount, params.capacity)} <b>${params.memberCount}/${params.capacity}</b> membres\n` +
      `<i>Encore ${remaining} ${placeWord} pour compléter le panier et désigner un gagnant.</i>\n\n` +
      `${pickRandom(JOIN_ENCOURAGEMENTS)}\n\n` +
      `👉 Rejoindre un panier : ${JOIN_URL}`
  );
}

/**
 * Diffusion périodique (cron, voir src/app/api/cron/telegram-encouragement)
 * — indépendante de toute adhésion précise : rappelle où en sont les
 * paniers et incite à en rejoindre un, pour accélérer le remplissage (plus
 * vite rempli, plus vite un gagnant est désigné).
 */
export async function broadcastBasketsEncouragement(admin: ReturnType<typeof createAdminClient>): Promise<void> {
  const lines = await fetchBasketStatusLines(admin);
  if (lines.length === 0) return;

  await sendTelegramMessage(
    `🔥 <b>Ça bouge sur Confssa !</b>\n\n` +
      `${lines.join("\n\n")}\n\n` +
      `<i>${pickRandom(PERIODIC_ENCOURAGEMENTS)}</i> 💰\n\n` +
      `👉 Rejoindre un panier : ${JOIN_URL}`
  );
}

export async function notifyPayoutConfirmed(params: {
  basketLabel: string;
  firstName: string;
  amount: number;
  joinUrl: string;
}) {
  await sendTelegramMessage(
    `💸 <b>Paiement confirmé</b>\n\n` +
      `👤 ${escapeTelegramHtml(params.firstName)} a reçu <b>${formatFcfa(params.amount)}</b>\n` +
      `📦 Panier : <b>${escapeTelegramHtml(params.basketLabel)}</b>\n\n` +
      `🔄 <i>Une nouvelle place est ouverte pour retenter sa chance :</i>\n${params.joinUrl}`
  );
}

/**
 * Panier plein : dans le nouveau modèle, "complet" et "gagnant déterminé"
 * sont le même instant, donc cette notification annonce directement le
 * gagnant et le montant à verser (l'ancien notifyBasketFull a été fusionné
 * ici : il n'a plus de raison d'exister séparément).
 */
export async function notifyPayoutReady(params: { basketLabel: string; firstName: string; amount: number }) {
  await sendTelegramMessage(
    `🎉 <b>Panier complet !</b> 🎉\n\n` +
      `📦 ${escapeTelegramHtml(params.basketLabel)}\n` +
      `🏆 Gagnant(e) : <b>${escapeTelegramHtml(params.firstName)}</b>\n` +
      `💰 Montant à verser : <b>${formatFcfa(params.amount)}</b>\n\n` +
      pickRandom(WIN_CELEBRATIONS)
  );
}
