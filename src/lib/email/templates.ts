import { escapeHtml, formatFcfa, renderEmailLayout } from "./layout";

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
        `Votre cotisation de <strong>${formatFcfa(params.amount)}</strong> n'a pas pu être confirmée (${escapeHtml(params.reason)}).`,
        "Merci de réessayer rapidement : au-delà du jour de l'échéance, votre place dans le panier n'est plus garantie.",
      ],
    }),
  };
}

export function payoutReadyEmail(params: { basketLabel: string; amount: number; claimUrl: string }): EmailTemplate {
  const basketLabel = escapeHtml(params.basketLabel);
  return {
    // Le sujet n'est pas rendu comme HTML par les clients de messagerie : pas
    // besoin d'y échapper basketLabel (seul le corps HTML l'exige).
    subject: `Félicitations, vous remportez le ${params.basketLabel} !`,
    html: renderEmailLayout({
      title: "Votre gain est prêt",
      paragraphs: [
        `Le ${basketLabel} est complet et vous êtes le premier arrivé : vous remportez <strong>${formatFcfa(params.amount)}</strong>.`,
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

/**
 * Un administrateur change le statut d'un compte (adminSetUserStatus,
 * src/app/pouri/utilisateurs/actions.ts) : le titulaire doit toujours en
 * être informé, plutôt que de découvrir un blocage silencieux en essayant
 * de rejoindre un panier.
 */
export function accountStatusChangedEmail(params: {
  status: "active" | "suspended" | "banned";
  dashboardUrl: string;
}): EmailTemplate {
  if (params.status === "banned") {
    return accountAlertEmail({
      title: "Votre compte Confssa a été banni",
      message:
        "Votre compte a été banni par un administrateur, suite à une violation de nos conditions d'utilisation. Vous ne pouvez plus rejoindre de panier. Si vous pensez qu'il s'agit d'une erreur, contactez-nous.",
      dashboardUrl: params.dashboardUrl,
    });
  }
  if (params.status === "suspended") {
    return accountAlertEmail({
      title: "Votre compte Confssa a été suspendu",
      message:
        "Votre compte a été temporairement suspendu par un administrateur. Vous ne pouvez plus rejoindre de nouveau panier tant que la suspension est active. Pour toute question, contactez-nous.",
      dashboardUrl: params.dashboardUrl,
    });
  }
  return accountAlertEmail({
    title: "Votre compte Confssa a été réactivé",
    message: "Bonne nouvelle : votre compte est de nouveau actif. Vous pouvez à nouveau rejoindre un panier dès maintenant.",
    dashboardUrl: params.dashboardUrl,
  });
}
