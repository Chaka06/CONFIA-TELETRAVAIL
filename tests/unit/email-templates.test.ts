import { describe, expect, it } from "vitest";

import { escapeHtml } from "@/lib/email/layout";
import {
  accountAlertEmail,
  accountStatusChangedEmail,
  contributionConfirmedEmail,
  contributionFailedEmail,
  payoutConfirmedEmail,
  payoutReadyEmail,
  signupOtpEmail,
} from "@/lib/email/templates";

const ALL_TEMPLATES = () => [
  signupOtpEmail({ code: "482913" }),
  contributionConfirmedEmail({ amount: 1000 }),
  contributionFailedEmail({ amount: 1000, reason: "Solde insuffisant" }),
  payoutReadyEmail({ basketLabel: "Panier 5 000 FCFA", amount: 95000, claimUrl: "https://confssa.com/gain/abc" }),
  payoutConfirmedEmail({ amount: 95000 }),
  accountAlertEmail({ title: "Titre", message: "Message", dashboardUrl: "https://confssa.com/tableau-de-bord" }),
];

describe("escapeHtml", () => {
  it("échappe les caractères spéciaux HTML", () => {
    expect(escapeHtml("&")).toBe("&amp;");
    expect(escapeHtml("<b>injection</b>")).toBe("&lt;b&gt;injection&lt;/b&gt;");
  });

  it("ne touche pas au texte normal", () => {
    expect(escapeHtml("Solde insuffisant")).toBe("Solde insuffisant");
  });
});

describe("Gabarits d'e-mail — aucune trace de l'ancien contenu générique", () => {
  it("aucun gabarit n'affiche plus la description \"télétravail rémunéré\" (bug corrigé)", () => {
    for (const template of ALL_TEMPLATES()) {
      expect(template.html).not.toContain("télétravail rémunéré");
    }
  });

  it("le pied de page identifie bien Confssa comme plateforme de tontine", () => {
    for (const template of ALL_TEMPLATES()) {
      expect(template.html).toContain("la tontine en ligne");
    }
  });

  it("aucun gabarit ne porte l'ancien nom de marque \"Confia\"", () => {
    for (const template of ALL_TEMPLATES()) {
      expect(template.subject).not.toContain("Confia");
      expect(template.html).not.toContain("Confia");
    }
  });

  it("chaque gabarit affiche le logo du site", () => {
    for (const template of ALL_TEMPLATES()) {
      expect(template.html).toContain('<img src="https://confssa.com/logo.png"');
    }
  });

  it("chaque gabarit propose de rejoindre le groupe Telegram", () => {
    for (const template of ALL_TEMPLATES()) {
      expect(template.html).toContain("https://t.me/+VhlM6M08N-swZWFk");
      expect(template.html).toContain("Rejoindre le groupe Telegram");
    }
  });
});

describe("contributionFailedEmail", () => {
  it("échappe le motif d'échec (donnée transmise par le webhook Genius Pay)", () => {
    // Le gabarit contient légitimement un <img> (le logo) : on vérifie que
    // la charge malveillante précise n'apparaît jamais telle quelle.
    const malicious = "<img src=x onerror=alert(1)>";
    const template = contributionFailedEmail({ amount: 1000, reason: malicious });
    expect(template.html).not.toContain(malicious);
    expect(template.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("affiche le montant et le motif lisible", () => {
    const template = contributionFailedEmail({ amount: 3000, reason: "Solde insuffisant" });
    expect(template.html).toContain("3 000 FCFA");
    expect(template.html).toContain("Solde insuffisant");
  });
});

describe("payoutReadyEmail", () => {
  it("échappe le libellé du panier dans le corps HTML", () => {
    const template = payoutReadyEmail({
      basketLabel: '<script>alert(1)</script>',
      amount: 95000,
      claimUrl: "https://confssa.com/gain/xyz",
    });
    expect(template.html).not.toContain("<script>");
    expect(template.html).toContain("&lt;script&gt;");
  });

  it("inclut le lien de réclamation et le montant", () => {
    const template = payoutReadyEmail({
      basketLabel: "Panier 5 000 FCFA",
      amount: 95000,
      claimUrl: "https://confssa.com/gain/xyz",
    });
    expect(template.html).toContain("https://confssa.com/gain/xyz");
    expect(template.html).toContain("95 000 FCFA");
  });
});

describe("accountStatusChangedEmail", () => {
  it("informe clairement d'une suspension", () => {
    const template = accountStatusChangedEmail({ status: "suspended", dashboardUrl: "https://confssa.com/tableau-de-bord" });
    expect(template.subject).toContain("suspendu");
    expect(template.html).toContain("suspendu");
  });

  it("informe clairement d'un bannissement", () => {
    const template = accountStatusChangedEmail({ status: "banned", dashboardUrl: "https://confssa.com/tableau-de-bord" });
    expect(template.subject).toContain("banni");
    expect(template.html).toContain("banni");
  });

  it("informe clairement d'une réactivation", () => {
    const template = accountStatusChangedEmail({ status: "active", dashboardUrl: "https://confssa.com/tableau-de-bord" });
    expect(template.subject).toContain("réactivé");
    expect(template.html).toContain("nouveau actif");
  });
});
