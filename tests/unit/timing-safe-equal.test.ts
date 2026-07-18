import { describe, expect, it } from "vitest";

import { timingSafeStringEqual } from "@/lib/timing-safe-equal";

describe("timingSafeStringEqual", () => {
  it("renvoie true pour deux chaînes identiques", () => {
    expect(timingSafeStringEqual("le-meme-secret", "le-meme-secret")).toBe(true);
  });

  it("renvoie false pour deux chaînes différentes de même longueur", () => {
    expect(timingSafeStringEqual("secret-correct-1", "secret-correct-2")).toBe(false);
  });

  it("renvoie false pour deux chaînes de longueurs différentes, sans lever d'exception", () => {
    expect(timingSafeStringEqual("court", "un-secret-beaucoup-plus-long")).toBe(false);
  });

  it("renvoie false pour une chaîne vide comparée à un vrai secret", () => {
    expect(timingSafeStringEqual("", "un-secret")).toBe(false);
  });

  it("compare correctement en hexadécimal quand l'encodage est précisé", () => {
    expect(timingSafeStringEqual("deadbeef", "deadbeef", "hex")).toBe(true);
    expect(timingSafeStringEqual("deadbeef", "deadbeee", "hex")).toBe(false);
  });
});
