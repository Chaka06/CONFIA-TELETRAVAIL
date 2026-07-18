import { z } from "zod";

const PHONE_REGEX = /^\+?[0-9]{8,15}$/;

function eighteenYearsAgo(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
}

const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum")
  .regex(/[a-z]/, "Au moins une lettre minuscule")
  .regex(/[A-Z]/, "Au moins une lettre majuscule")
  .regex(/[0-9]/, "Au moins un chiffre");

export const signUpSchema = z
  .object({
    firstName: z.string().trim().min(1, "Prénom requis").max(100),
    lastName: z.string().trim().min(1, "Nom requis").max(100),
    email: z.string().trim().email("Adresse e-mail invalide"),
    dateOfBirth: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide")
      .refine((v) => new Date(v) <= eighteenYearsAgo(), "Vous devez avoir au moins 18 ans"),
    city: z.string().trim().min(1, "Ville requise").max(120),
    phoneNumber: z.string().trim().regex(PHONE_REGEX, "Numéro de téléphone invalide"),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      error: "Vous devez accepter les conditions d'utilisation",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// Supabase Auth (GoTrue) impose un plancher strict de 6 chiffres pour les
// codes OTP envoyés par e-mail — impossible de descendre en dessous.
export const OTP_LENGTH = 6;

export const signUpOtpSchema = z.object({
  code: z
    .string()
    .length(OTP_LENGTH, `Le code doit contenir ${OTP_LENGTH} chiffres`)
    .regex(/^\d+$/, "Chiffres uniquement"),
});

export type SignUpOtpInput = z.infer<typeof signUpOtpSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
