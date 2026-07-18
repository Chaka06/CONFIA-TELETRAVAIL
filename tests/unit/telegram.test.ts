import { describe, expect, it } from "vitest";

import { escapeTelegramHtml, pickJoinEncouragement, progressBar } from "@/lib/telegram";

describe("escapeTelegramHtml", () => {
  it("échappe les caractères spéciaux du HTML Telegram", () => {
    expect(escapeTelegramHtml("&")).toBe("&amp;");
    expect(escapeTelegramHtml("<b>")).toBe("&lt;b&gt;");
    expect(escapeTelegramHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("ne touche pas au texte sans caractère spécial", () => {
    expect(escapeTelegramHtml("Aminata Koné")).toBe("Aminata Koné");
  });

  it("empêche un prénom d'injecter une fausse mise en forme", () => {
    // Un prénom saisi librement à l'inscription ne doit jamais pouvoir
    // rouvrir une balise <b> ou <a> dans un message envoyé au groupe.
    const malicious = '<a href="https://phishing.example">Cliquez ici</a>';
    expect(escapeTelegramHtml(malicious)).not.toContain("<a");
    expect(escapeTelegramHtml(malicious)).not.toContain("</a>");
  });
});

describe("progressBar", () => {
  it("est entièrement vide à 0 membre", () => {
    expect(progressBar(0, 20)).toBe("▱▱▱▱▱▱▱▱▱▱");
  });

  it("est entièrement pleine quand le panier est complet", () => {
    expect(progressBar(20, 20)).toBe("▰▰▰▰▰▰▰▰▰▰");
  });

  it("arrondit au bloc le plus proche pour un remplissage partiel", () => {
    expect(progressBar(7, 20)).toBe("▰▰▰▰▱▱▱▱▱▱"); // 7/20 = 3.5 → arrondi à 4 blocs
    expect(progressBar(10, 20)).toBe("▰▰▰▰▰▱▱▱▱▱");
  });

  it("ne dépasse jamais 10 blocs même si count > capacity", () => {
    expect(progressBar(25, 20)).toBe("▰▰▰▰▰▰▰▰▰▰");
  });

  it("ne descend jamais sous 0 bloc même si count est négatif", () => {
    expect(progressBar(-3, 20)).toBe("▱▱▱▱▱▱▱▱▱▱");
  });

  it("fait toujours 10 caractères de long, quel que soit le remplissage", () => {
    for (const count of [0, 1, 5, 7, 13, 19, 20]) {
      expect([...progressBar(count, 20)]).toHaveLength(10);
    }
  });
});

describe("pickJoinEncouragement", () => {
  it("renvoie toujours une chaîne non vide", () => {
    for (let i = 0; i < 20; i++) {
      const message = pickJoinEncouragement();
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it("pioche plusieurs variantes différentes sur un grand nombre de tirages", () => {
    // Vérifie que le choix est bien aléatoire (pas toujours la même ligne) —
    // 50 tirages rendent une collision totale sur 4 variantes quasi
    // impossible par hasard (probabilité ≈ (1/4)^49).
    const seen = new Set(Array.from({ length: 50 }, () => pickJoinEncouragement()));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("ne contient jamais de balise HTML mal fermée (uniquement <i>...</i>)", () => {
    for (let i = 0; i < 20; i++) {
      const message = pickJoinEncouragement();
      const openTags = message.match(/<i>/g)?.length ?? 0;
      const closeTags = message.match(/<\/i>/g)?.length ?? 0;
      expect(openTags).toBe(closeTags);
    }
  });
});
