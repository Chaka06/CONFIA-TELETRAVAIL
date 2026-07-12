import "server-only";

import { formatFcfa } from "@/lib/format";

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

export async function notifyBasketFull(params: { basketLabel: string; memberCount: number }) {
  await sendTelegramMessage(
    `✅ <b>${params.basketLabel}</b> est complet (${params.memberCount} membres). Les cotisations démarrent demain.`
  );
}

export async function notifyMemberRemoved(params: { basketLabel: string; firstName: string; joinUrl: string }) {
  await sendTelegramMessage(
    `⚠️ Un membre (${params.firstName}) a été retiré du <b>${params.basketLabel}</b> pour non-paiement.\nUne place est libre : ${params.joinUrl}`
  );
}

export async function notifyPayoutConfirmed(params: {
  basketLabel: string;
  firstName: string;
  amount: number;
  joinUrl: string;
}) {
  await sendTelegramMessage(
    `💰 ${params.firstName} a été payé(e) : ${formatFcfa(params.amount)} sur le <b>${params.basketLabel}</b>.\nUne place vient de se libérer : ${params.joinUrl}`
  );
}

export async function notifyPayoutReady(params: { basketLabel: string; firstName: string; amount: number }) {
  await sendTelegramMessage(
    `🎉 ${params.firstName} remporte le <b>${params.basketLabel}</b> : ${formatFcfa(params.amount)} à verser.`
  );
}
