import { describe, expect, it } from "vitest";

import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation/auth";

function baseSignUp(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    firstName: "Awa",
    lastName: "Diallo",
    email: "awa@example.com",
    dateOfBirth: "1995-05-01",
    city: "Abidjan",
    phoneNumber: "+2250700000001",
    password: "Password1",
    confirmPassword: "Password1",
    referralCode: "",
    acceptTerms: true as const,
    ...overrides,
  };
}

describe("signUpSchema", () => {
  it("accepte un formulaire d'inscription valide", () => {
    const result = signUpSchema.safeParse(baseSignUp());
    expect(result.success).toBe(true);
  });

  it("rejette un utilisateur de moins de 18 ans", () => {
    const tooYoung = new Date();
    tooYoung.setFullYear(tooYoung.getFullYear() - 17);
    const result = signUpSchema.safeParse(
      baseSignUp({ dateOfBirth: tooYoung.toISOString().slice(0, 10) })
    );
    expect(result.success).toBe(false);
  });

  it("rejette une confirmation de mot de passe différente", () => {
    const result = signUpSchema.safeParse(baseSignUp({ confirmPassword: "Autre1234" }));
    expect(result.success).toBe(false);
  });

  it("rejette un mot de passe sans majuscule ni chiffre", () => {
    const result = signUpSchema.safeParse(
      baseSignUp({ password: "faible", confirmPassword: "faible" })
    );
    expect(result.success).toBe(false);
  });

  it("rejette un numéro de téléphone invalide", () => {
    const result = signUpSchema.safeParse(baseSignUp({ phoneNumber: "abc" }));
    expect(result.success).toBe(false);
  });

  it("rejette si les conditions d'utilisation ne sont pas acceptées", () => {
    const result = signUpSchema.safeParse(baseSignUp({ acceptTerms: false as unknown as true }));
    expect(result.success).toBe(false);
  });

  it("met en majuscules le code promo saisi", () => {
    const result = signUpSchema.safeParse(baseSignUp({ referralCode: "abc123" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.referralCode).toBe("ABC123");
    }
  });

  it("accepte l'absence de code promo (facultatif)", () => {
    const result = signUpSchema.safeParse(baseSignUp({ referralCode: "" }));
    expect(result.success).toBe(true);
  });
});

describe("signInSchema", () => {
  it("rejette un e-mail invalide", () => {
    const result = signInSchema.safeParse({ email: "pas-un-email", password: "x" });
    expect(result.success).toBe(false);
  });

  it("rejette un mot de passe vide", () => {
    const result = signInSchema.safeParse({ email: "a@b.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("valide une adresse e-mail correcte", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("rejette deux mots de passe différents", () => {
    const result = resetPasswordSchema.safeParse({
      password: "Password1",
      confirmPassword: "Password2",
    });
    expect(result.success).toBe(false);
  });

  it("accepte deux mots de passe identiques et valides", () => {
    const result = resetPasswordSchema.safeParse({
      password: "Password1",
      confirmPassword: "Password1",
    });
    expect(result.success).toBe(true);
  });
});
