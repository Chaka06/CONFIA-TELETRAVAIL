import { formatFcfa, renderEmailLayout } from "./layout";

export type EmailTemplate = { subject: string; html: string };

export function signupOtpEmail(params: { code: string }): EmailTemplate {
  return {
    subject: "Votre code de confirmation — Confssa",
    html: renderEmailLayout({
      title: "Confirmez votre adresse e-mail",
      paragraphs: [
        "Merci de votre inscription sur Confssa. Pour activer votre compte, saisissez le code suivant dans la fenêtre de confirmation :",
      ],
      code: params.code,
      footnote:
        "Ce code expire dans 15 minutes et ne peut être utilisé qu'une seule fois. Ne le communiquez jamais, même à quelqu'un se présentant comme membre de l'équipe Confssa. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail : aucun compte ne sera créé sans confirmation de ce code.",
    }),
  };
}

export function contributionConfirmedEmail(params: { amount: number }): EmailTemplate {
  return {
    subject: "Votre cotisation a été confirmée",
    html: renderEmailLayout({
      title: "Cotisation confirmée",
      paragraphs: [
        `Votre cotisation de <strong>${formatFcfa(params.amount)}</strong> a bien été reçue.`,
        "Merci de votre régularité — c'est ce qui garantit que chacun soit payé à son tour.",
      ],
    }),
  };
}

export function contributionFailedEmail(params: { amount: number; reason: string }): EmailTemplate {
  return {
    subject: "Votre cotisation n'a pas abouti",
    html: renderEmailLayout({
      title: "Cotisation non aboutie",
      paragraphs: [
        `Votre cotisation de <strong>${formatFcfa(params.amount)}</strong> n'a pas pu être confirmée (${params.reason}).`,
        "Merci de réessayer rapidement : au-delà du jour de l'échéance, votre place dans le panier n'est plus garantie.",
      ],
    }),
  };
}

export function payoutReadyEmail(params: { basketLabel: string; amount: number; claimUrl: string }): EmailTemplate {
  return {
    subject: `Félicitations, vous remportez le ${params.basketLabel} !`,
    html: renderEmailLayout({
      title: "Votre gain est prêt",
      paragraphs: [
        `Le ${params.basketLabel} est complet et vous êtes le premier arrivé : vous remportez <strong>${formatFcfa(params.amount)}</strong>.`,
        "Cliquez sur le bouton ci-dessous pour indiquer votre numéro et le moyen de paiement (Orange Money, Wave, MTN Money ou Moov Money) sur lequel vous souhaitez le recevoir.",
      ],
      button: { label: "Recevoir mon gain", url: params.claimUrl },
      footnote: "Ce lien est personnel, ne le partagez avec personne.",
    }),
  };
}

export function payoutConfirmedEmail(params: { amount: number }): EmailTemplate {
  return {
    subject: "Votre gain a été versé",
    html: renderEmailLayout({
      title: "Gain versé",
      paragraphs: [
        `Votre gain de <strong>${formatFcfa(params.amount)}</strong> vient de vous être envoyé.`,
        "Merci de votre confiance — n'hésitez pas à rejoindre un nouveau panier dès maintenant.",
      ],
    }),
  };
}

export function accountAlertEmail(params: { title: string; message: string; dashboardUrl: string }): EmailTemplate {
  return {
    subject: params.title,
    html: renderEmailLayout({
      title: params.title,
      paragraphs: [params.message],
      button: { label: "Accéder à mon compte", url: params.dashboardUrl },
    }),
  };
}
