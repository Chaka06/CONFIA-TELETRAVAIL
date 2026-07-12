import { z } from "zod";

/**
 * Validation stricte des variables d'environnement au démarrage.
 * Toute variable manquante ou mal formée fait échouer le build/boot
 * immédiatement plutôt que de provoquer une erreur silencieuse en
 * production (ex : clé de service absente -> écritures financières qui
 * échouent silencieusement).
 */

/**
 * z.coerce.boolean() utilise `Boolean(value)`, qui renvoie `true` pour toute
 * chaîne non vide (y compris "false") : piège classique. Ce schéma
 * n'accepte que "true"/"false" au lieu de coercer aveuglément.
 */
const booleanEnvVar = (defaultValue: boolean) =>
  z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((v) => v === "true");

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  GENIUS_PAY_API_BASE_URL: z.string().url().default("https://geniuspay.ci/api/v1/merchant"),
  // Clé publique (pk_sandbox_... / pk_live_...) — en-tête X-API-Key.
  GENIUS_PAY_PUBLIC_KEY: z.string().min(1).default("changeme"),
  // Clé secrète (sk_sandbox_... / sk_live_...) — en-tête X-API-Secret. Jamais exposée au client.
  GENIUS_PAY_SECRET_KEY: z.string().min(1).default("changeme"),
  // Secret de vérification des webhooks (whsec_sandbox_... / whsec_live_...).
  GENIUS_PAY_WEBHOOK_SECRET: z.string().min(1).default("changeme"),

  SMTP_HOST: z.string().min(1).default("smtp.example.com"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanEnvVar(false),
  // À activer uniquement pour un relais local sans TLS (Mailpit) ; le SMTP
  // LWS Panel en production doit garder cette option désactivée (STARTTLS).
  SMTP_IGNORE_TLS: booleanEnvVar(false),
  SMTP_USER: z.string().min(1).default("changeme"),
  SMTP_PASSWORD: z.string().min(1).default("changeme"),
  SMTP_FROM_NAME: z.string().min(1).default("Confia"),
  SMTP_FROM_EMAIL: z.string().email().default("no-reply@example.com"),

  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/** À n'appeler que côté serveur (route handlers, server actions, scripts). */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Variables d'environnement invalides :", parsed.error.flatten().fieldErrors);
    throw new Error("Configuration d'environnement invalide. Voir .env.local.example.");
  }

  cached = parsed.data;
  return cached;
}

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export function getClientEnv() {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
