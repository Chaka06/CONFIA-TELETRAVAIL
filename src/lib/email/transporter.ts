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
    // Un serveur SMTP mal configuré (mauvais identifiants, port bloqué) ne
    // doit jamais faire attendre indéfiniment une requête utilisateur (ex :
    // inscription) — mieux vaut échouer vite que dépasser le timeout de la
    // fonction serverless sans réponse du tout.
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });

  return cachedTransporter;
}
