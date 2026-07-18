/**
 * Enveloppe HTML commune à tous les e-mails transactionnels (dépôts,
 * retraits, commissions, code d'inscription...). Même identité visuelle que
 * les gabarits Supabase Auth (supabase/templates/*.html) : sobre,
 * professionnelle, coins carrés, compatible avec les principaux clients de
 * messagerie (mise en page par tableaux).
 */

const BRAND_NAVY = "#16324f";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#4b5563";
const TEXT_MUTED = "#9ca3af";
const BORDER = "#dde2e9";
const BG = "#eef1f5";
const CONTACT_EMAIL = "contact@confssa.com";
const TELEGRAM_GROUP_URL = "https://t.me/+VhlM6M08N-swZWFk";
const SITE_URL = process.env.APP_BASE_URL ?? "https://confssa.com";
// Fond clair dans l'en-tête (et non la bannière marine des autres blocs) :
// le logo Confssa est en noir/vert, illisible sur fond sombre.
const LOGO_URL = `${SITE_URL}/logo.png`;

export { formatFcfa } from "@/lib/format";

/**
 * Échappe les caractères spéciaux HTML avant interpolation dans un e-mail —
 * même garde-fou que escapeTelegramHtml (src/lib/telegram.ts) : un motif de
 * refus de paiement (fourni par le webhook Genius Pay) ou un libellé de
 * panier ne doivent jamais pouvoir injecter de balise dans un message envoyé
 * en tant que Confssa.
 */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type EmailButton = { label: string; url: string };

export function renderEmailLayout(params: {
  title: string;
  paragraphs: string[];
  code?: string;
  button?: EmailButton;
  footnote?: string;
}): string {
  const { title, paragraphs, code, button, footnote } = params;

  const paragraphsHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color:${TEXT_SECONDARY};">${p}</p>`
    )
    .join("\n");

  const codeHtml = code
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
      <tr>
        <td align="center" style="background-color:#f7f8fa; border: 1px solid ${BORDER}; padding: 22px 12px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 10px; color:${BRAND_NAVY};">
            ${code}
          </span>
        </td>
      </tr>
    </table>`
    : "";

  const buttonHtml = button
    ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
      <tr>
        <td style="background-color:${BRAND_NAVY};">
          <a href="${button.url}" style="display:inline-block; padding: 13px 30px; font-size: 14px; font-weight: 600; color:#ffffff; text-decoration:none;">
            ${button.label}
          </a>
        </td>
      </tr>
    </table>`
    : "";

  const footnoteHtml = footnote
    ? `<p style="margin: 0; font-size: 12px; line-height: 1.6; color:${TEXT_MUTED};">${footnote}</p>`
    : "";

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${BG}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG}; padding: 32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color:#ffffff; border: 1px solid ${BORDER};">
            <tr>
              <td style="background-color:#ffffff; padding: 20px 28px; border-bottom: 1px solid ${BORDER};">
                <a href="${SITE_URL}" style="display:inline-block;">
                  <img src="${LOGO_URL}" alt="Confssa" width="152" height="32" style="display:block; border:0;" />
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding: 36px 28px 28px;">
                <h1 style="margin: 0 0 12px; font-size: 19px; color:${TEXT_PRIMARY};">${title}</h1>
                ${paragraphsHtml}
                ${codeHtml}
                ${buttonHtml}
                ${footnoteHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 28px; background-color:#f7f8fa; border-top: 1px solid ${BORDER};">
                <p style="margin:0 0 4px; font-size: 12px; color:${TEXT_MUTED};">
                  <a href="${SITE_URL}" style="color:${BRAND_NAVY}; text-decoration:none; font-weight: 600;">Confssa</a> — la tontine en ligne, simple et sécurisée.
                </p>
                <p style="margin:0 0 12px; font-size: 12px; color:${TEXT_MUTED};">Une question, une réclamation ? Écrivez-nous : <a href="mailto:${CONTACT_EMAIL}" style="color:${BRAND_NAVY};">${CONTACT_EMAIL}</a></p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="${TELEGRAM_GROUP_URL}" style="display:inline-block; padding: 10px 20px; font-size: 13px; font-weight: 600; color:${BRAND_NAVY}; background-color:#ffffff; border: 1px solid ${BRAND_NAVY}; text-decoration:none;">
                        Rejoindre le groupe Telegram
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
