import "server-only";
import nodemailer from "nodemailer";

import { getServerEnv } from "@/lib/env";

let cachedTransporter: nodemailer.Transporter | null = null;

/**
 * Transporteur SMTP unique, réutilisé entre les appels (pool de connexions).
 * Pointe vers le serveur SMTP du compte de messagerie professionnelle LWS
 * Panel en production ; vers Mailpit (capture locale) en développement,
 * cf. .env.local / variables d'environnement Vercel.
 */
export function getMailTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const env = getServerEnv();

  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ignoreTLS: env.SMTP_IGNORE_TLS,
    auth: env.SMTP_USER === "changeme" ? undefined : { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });

  return cachedTransporter;
}
