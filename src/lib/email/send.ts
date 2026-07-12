import "server-only";

import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMailTransporter } from "./transporter";
import type { EmailTemplate } from "./templates";

/**
 * Envoie un e-mail transactionnel métier et journalise systématiquement la
 * tentative dans `email_logs` (succès ou échec), pour audit et diagnostic —
 * un échec d'envoi ne doit jamais faire échouer l'opération métier qui l'a
 * déclenché (dépôt confirmé, retrait traité, etc.), donc les erreurs sont
 * capturées ici plutôt que propagées à l'appelant.
 */
export async function sendTransactionalEmail(params: {
  userId: string | null;
  toEmail: string;
  template: EmailTemplate;
  templateKey: string;
}) {
  const env = getServerEnv();
  const admin = createAdminClient();

  const { data: logRow } = await admin
    .from("email_logs")
    .insert({
      user_id: params.userId,
      template: params.templateKey,
      to_email: params.toEmail,
      status: "queued",
    })
    .select("id")
    .single();

  try {
    const transporter = getMailTransporter();
    const info = await transporter.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
      to: params.toEmail,
      subject: params.template.subject,
      html: params.template.html,
    });

    if (logRow) {
      await admin
        .from("email_logs")
        .update({ status: "sent", provider_message_id: info.messageId, sent_at: new Date().toISOString() })
        .eq("id", logRow.id);
    }
  } catch (err) {
    console.error("email_send_failed", params.templateKey, err);
    if (logRow) {
      await admin
        .from("email_logs")
        .update({ status: "failed", error: err instanceof Error ? err.message : "unknown_error" })
        .eq("id", logRow.id);
    }
  }
}
