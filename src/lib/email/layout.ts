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

export { formatFcfa } from "@/lib/format";

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
              <td style="background-color:${BRAND_NAVY}; padding: 24px 28px;">
                <span style="color:#ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.3px;">Confssa</span>
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
                <p style="margin:0 0 4px; font-size: 12px; color:${TEXT_MUTED};">Confssa — plateforme professionnelle de télétravail rémunéré.</p>
                <p style="margin:0; font-size: 12px; color:${TEXT_MUTED};">Une question, une réclamation ? Écrivez-nous : <a href="mailto:${CONTACT_EMAIL}" style="color:${BRAND_NAVY};">${CONTACT_EMAIL}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
