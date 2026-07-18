import { describe, expect, it } from "vitest";

import { getSafeRedirectPath } from "@/lib/safe-redirect";

describe("getSafeRedirectPath", () => {
  it("accepte un chemin interne relatif simple", () => {
    expect(getSafeRedirectPath("/tableau-de-bord", "/connexion")).toBe("/tableau-de-bord");
  });

  it("accepte un chemin interne avec une chaîne de requête", () => {
    expect(getSafeRedirectPath("/pouri/utilisateurs?q=abc", "/connexion")).toBe("/pouri/utilisateurs?q=abc");
  });

  it("rejette une URL absolue http(s) et renvoie la valeur de repli", () => {
    expect(getSafeRedirectPath("https://site-piege.com", "/tableau-de-bord")).toBe("/tableau-de-bord");
    expect(getSafeRedirectPath("http://site-piege.com", "/tableau-de-bord")).toBe("/tableau-de-bord");
  });

  it("rejette une URL protocole-relative (//)", () => {
    expect(getSafeRedirectPath("//site-piege.com", "/tableau-de-bord")).toBe("/tableau-de-bord");
  });

  it("rejette le contournement par barre oblique inversée (normalisée en // par certains navigateurs)", () => {
    expect(getSafeRedirectPath("/\\site-piege.com", "/tableau-de-bord")).toBe("/tableau-de-bord");
    expect(getSafeRedirectPath("\\\\site-piege.com", "/tableau-de-bord")).toBe("/tableau-de-bord");
  });

  it("rejette une chaîne qui ne commence pas par un slash", () => {
    expect(getSafeRedirectPath("site-piege.com", "/tableau-de-bord")).toBe("/tableau-de-bord");
    expect(getSafeRedirectPath("javascript:alert(1)", "/tableau-de-bord")).toBe("/tableau-de-bord");
  });

  it("renvoie la valeur de repli pour null, undefined ou une chaîne vide", () => {
    expect(getSafeRedirectPath(null, "/tableau-de-bord")).toBe("/tableau-de-bord");
    expect(getSafeRedirectPath(undefined, "/tableau-de-bord")).toBe("/tableau-de-bord");
    expect(getSafeRedirectPath("", "/tableau-de-bord")).toBe("/tableau-de-bord");
  });
});
