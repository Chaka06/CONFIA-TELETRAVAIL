import { formatFcfa, renderEmailLayout } from "./layout";

export type EmailTemplate = { subject: string; html: string };

export function signupOtpEmail(params: { code: string }): EmailTemplate {
  return {
    subject: "Votre code de confirmation — Confia",
    html: renderEmailLayout({
      title: "Confirmez votre adresse e-mail",
      paragraphs: [
        "Merci de votre inscription sur Confia. Pour activer votre compte, saisissez le code suivant dans la fenêtre de confirmation :",
      ],
      code: params.code,
      footnote:
        "Ce code expire dans 15 minutes et ne peut être utilisé qu'une seule fois. Ne le communiquez jamais, même à quelqu'un se présentant comme membre de l'équipe Confia. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail : aucun compte ne sera créé sans confirmation de ce code.",
    }),
  };
}

export function depositConfirmedEmail(params: { amount: number; tierNumber: number; dashboardUrl: string }): EmailTemplate {
  return {
    subject: "Votre dépôt a été confirmé",
    html: renderEmailLayout({
      title: "Dépôt confirmé",
      paragraphs: [
        `Votre dépôt de <strong>${formatFcfa(params.amount)}</strong> pour le palier ${params.tierNumber} a été confirmé avec succès.`,
        `Vos missions rémunérées correspondantes sont désormais disponibles dans votre tableau de bord.`,
      ],
      button: { label: "Voir mes missions", url: params.dashboardUrl },
    }),
  };
}

export function depositFailedEmail(params: { amount: number; reason: string; retryUrl: string }): EmailTemplate {
  return {
    subject: "Votre dépôt n'a pas abouti",
    html: renderEmailLayout({
      title: "Dépôt non abouti",
      paragraphs: [
        `Votre dépôt de <strong>${formatFcfa(params.amount)}</strong> n'a pas pu être confirmé (${params.reason}).`,
        `Aucun montant n'a été débité de façon définitive. Vous pouvez réessayer à tout moment.`,
      ],
      button: { label: "Réessayer le dépôt", url: params.retryUrl },
    }),
  };
}

export function withdrawalApprovedEmail(params: { amount: number }): EmailTemplate {
  return {
    subject: "Votre retrait a été effectué",
    html: renderEmailLayout({
      title: "Retrait effectué",
      paragraphs: [
        `Votre retrait de <strong>${formatFcfa(params.amount)}</strong> a été validé et envoyé vers le moyen de paiement que vous avez indiqué.`,
        `Le délai de réception dépend de votre opérateur mobile money ou de votre banque.`,
      ],
    }),
  };
}

export function withdrawalRejectedEmail(params: { amount: number; reason: string; dashboardUrl: string }): EmailTemplate {
  return {
    subject: "Votre demande de retrait a été refusée",
    html: renderEmailLayout({
      title: "Retrait refusé",
      paragraphs: [
        `Votre demande de retrait de <strong>${formatFcfa(params.amount)}</strong> a été refusée (${params.reason}).`,
        `Le montant a été recrédité intégralement sur votre solde disponible.`,
      ],
      button: { label: "Voir mon solde", url: params.dashboardUrl },
    }),
  };
}

export function referralCommissionCreditedEmail(params: {
  amount: number;
  refereeFirstName: string;
  milestone: "palier 2" | "palier 4";
  dashboardUrl: string;
}): EmailTemplate {
  return {
    subject: "Commission de parrainage créditée",
    html: renderEmailLayout({
      title: "Commission de parrainage créditée",
      paragraphs: [
        `<strong>${formatFcfa(params.amount)}</strong> viennent d'être crédités sur votre solde : votre filleul ${params.refereeFirstName} a validé son ${params.milestone}.`,
      ],
      button: { label: "Voir mes parrainages", url: params.dashboardUrl },
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
