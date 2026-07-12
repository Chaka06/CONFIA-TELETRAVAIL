import { describe, expect, it } from "vitest";

import { formatFcfa } from "@/lib/format";

describe("formatFcfa", () => {
  it("formate les montants avec un espace comme séparateur de milliers", () => {
    expect(formatFcfa(2000)).toBe("2 000 FCFA");
    expect(formatFcfa(40500)).toBe("40 500 FCFA");
    expect(formatFcfa(200000)).toBe("200 000 FCFA");
  });

  it("gère les montants sans séparateur", () => {
    expect(formatFcfa(500)).toBe("500 FCFA");
    expect(formatFcfa(0)).toBe("0 FCFA");
  });

  it("arrondit les décimales (le FCFA n'a pas de sous-unité)", () => {
    expect(formatFcfa(1999.6)).toBe("2 000 FCFA");
  });
});
