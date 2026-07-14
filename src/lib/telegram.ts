import "server-only";

import { formatFcfa } from "@/lib/format";

/**
 * Échappe les caractères spéciaux du sous-ensemble HTML de Telegram, pour
 * qu'un prénom d'utilisateur (donnée saisie librement à l'inscription) ne
 * puisse jamais injecter de faux lien ou de mise en forme trompeuse dans un
 * message envoyé au groupe admin.
 */
function escapeTelegramHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Notifications du groupe Telegram admin. Tolérant à l'absence de
 * configuration (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID pas encore définies) :
 * un envoi qui échoue ou n'est pas configuré ne doit jamais faire échouer
 * l'opération métier qui l'a déclenché.
 */
async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("telegram_not_configured", { hasToken: !!token, hasChatId: !!chatId });
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
 * À chaque nouvelle adhésion payée (confirmation d'un dépôt d'entrée), y
 * compris avant que le panier soit plein : annonce le nouveau compte de
 * membres pour la formule concernée.
 */
export async function notifyBasketMemberJoined(params: {
  basketLabel: string;
  memberCount: number;
  capacity: number;
}) {
  await sendTelegramMessage(
    `👤 <b>${escapeTelegramHtml(params.basketLabel)}</b> : ${params.memberCount}/${params.capacity} membres.`
  );
}

export async function notifyPayoutConfirmed(params: {
  basketLabel: string;
  firstName: string;
  amount: number;
  joinUrl: string;
}) {
  await sendTelegramMessage(
    `💰 ${escapeTelegramHtml(params.firstName)} a été payé(e) : ${formatFcfa(params.amount)} sur le <b>${escapeTelegramHtml(params.basketLabel)}</b>.\nUne nouvelle place est ouverte pour retenter sa chance : ${params.joinUrl}`
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
    `🎉 <b>${escapeTelegramHtml(params.basketLabel)}</b> est complet ! ${escapeTelegramHtml(params.firstName)} remporte ${formatFcfa(params.amount)} à verser.`
  );
}
