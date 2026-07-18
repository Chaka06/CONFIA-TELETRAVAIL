import "server-only";

import { formatFcfa } from "@/lib/format";

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

const WIN_CELEBRATIONS = [
  "🎉 Aiyééé, ambiance dans la cour ! On enjaille grave 🥳",
  "🙌 Nickel chrome, c'est carré ! Le nzassa est bien mérité 💸",
  "🎊 Ça c'est du sérieux, félicitations champion(ne) ! Profite bien 🙏",
  "🥳 Deuga confirmé ! Bravo, que ça continue comme ça 🔥",
] as const;

/**
 * À chaque nouvelle adhésion payée (confirmation d'un dépôt d'entrée), y
 * compris avant que le panier soit plein : annonce le nouveau compte de
 * membres pour la formule concernée, avec une relance pour attirer les
 * prochains — premier arrivé, premier servi.
 */
export async function notifyBasketMemberJoined(params: {
  basketLabel: string;
  memberCount: number;
  capacity: number;
}) {
  await sendTelegramMessage(
    `👤 <b>Nouveau membre</b> dans le <b>${escapeTelegramHtml(params.basketLabel)}</b>\n` +
      `${progressBar(params.memberCount, params.capacity)} <i>${params.memberCount}/${params.capacity} membres</i>\n\n` +
      pickRandom(JOIN_ENCOURAGEMENTS)
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
