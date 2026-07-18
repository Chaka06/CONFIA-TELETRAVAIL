/**
 * Test d'intégration des e-mails transactionnels déclenchés par le webhook
 * Genius Pay (cotisation confirmée, cotisation échouée, gain prêt),
 * exécuté contre la stack Supabase LOCALE et son Mailpit local. Contrairement
 * à tests/integration/tontine.test.ts (qui appelle fn_confirm_contribution
 * directement via le client service_role), ce fichier POST réellement sur
 * la route du webhook (comme Genius Pay le ferait), pour vérifier que
 * l'envoi d'e-mail est bien déclenché avec le contenu attendu — angle mort
 * identifié lors de l'audit du système d'e-mails (aucun des 4 e-mails du
 * parcours financier n'avait de couverture avant ce fichier).
 */
import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

try {
  process.loadEnvFile(new URL("../../.env.local", import.meta.url));
} catch {
  // .env.local absent : valeurs par défaut de la stack locale ci-dessous.
}

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
process.env.GENIUS_PAY_WEBHOOK_SECRET ??= "test-webhook-secret";

const { POST } = await import("@/app/api/webhooks/genius-pay/route");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WEBHOOK_SECRET = process.env.GENIUS_PAY_WEBHOOK_SECRET!;
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

const PASSWORD = "TestPassword123";

function sign(timestamp: string, body: string) {
  return createHmac("sha256", WEBHOOK_SECRET).update(`${timestamp}.${body}`, "utf8").digest("hex");
}

function buildWebhookRequest(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  return new Request("http://localhost/api/webhooks/genius-pay", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-signature": sign(timestamp, body),
      "x-webhook-timestamp": timestamp,
    },
    body,
  });
}

/** Récupère le dernier e-mail (sujet + HTML) envoyé à cette adresse via Mailpit. */
async function fetchLatestEmail(toEmail: string): Promise<{ subject: string; html: string }> {
  const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${toEmail}`)}`).then((r) =>
    r.json()
  );
  const messageId = search.messages?.[0]?.ID;
  if (!messageId) throw new Error(`Aucun e-mail trouvé pour ${toEmail}`);
  const message = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`).then((r) => r.json());
  return { subject: message.Subject ?? "", html: message.HTML ?? "" };
}

function uniqueEmail(label: string) {
  return `emailtest.${label}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function createConfirmedUser(admin: SupabaseClient, label: string, phoneSuffix: string) {
  const email = uniqueEmail(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: "Test",
      last_name: label,
      date_of_birth: "1995-01-01",
      city: "Abidjan",
      phone_number: `+22506${phoneSuffix.padStart(7, "0")}`,
    },
  });
  if (error || !data.user) throw new Error(`Création utilisateur ${label} échouée : ${error?.message}`);
  return { id: data.user.id, email };
}

async function signIn(email: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Connexion ${email} échouée : ${error.message}`);
  return client;
}

describe("E-mails du parcours financier — déclenchés par le webhook Genius Pay", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let basketTypeId: string;
  const users: { id: string; email: string }[] = [];

  afterAll(async () => {
    for (const user of users) await admin.auth.admin.deleteUser(user.id);
    if (basketTypeId) {
      await admin.from("tontine_basket_instances").delete().eq("basket_type_id", basketTypeId);
      await admin.from("tontine_basket_types").delete().eq("id", basketTypeId);
    }
  });

  it("contribution.confirmed envoie un e-mail de cotisation confirmée, avec le bon montant et sans le contenu générique obsolète", async () => {
    const { data: basketType } = await admin
      .from("tontine_basket_types")
      .insert({ label: "Test e-mails — cotisation confirmée", contribution_amount: 1500, interval_days: 2, capacity: 4 })
      .select("id")
      .single();
    basketTypeId = basketType!.id;

    const user = await createConfirmedUser(admin, "confirmed", "100");
    users.push(user);

    const client = await signIn(user.email);
    const { data: joinResult } = await client.rpc("join_basket", { p_basket_type_id: basketTypeId }).single();

    const res = await POST(
      buildWebhookRequest({
        id: "evt-test-confirmed-1",
        event: "payment.success",
        timestamp: Math.floor(Date.now() / 1000),
        data: {
          object: "transaction",
          id: 1,
          reference: "MTX-TEST-EMAIL-1",
          amount: joinResult!.amount,
          status: "completed",
          metadata: { contribution_id: joinResult!.contribution_id },
        },
        environment: "sandbox",
      })
    );
    expect(res.status).toBe(200);

    const email = await fetchLatestEmail(user.email);
    expect(email.subject).toBe("Votre cotisation a été confirmée");
    expect(email.html).toContain("1 500 FCFA");
    expect(email.html).not.toContain("télétravail rémunéré");
    expect(email.html).not.toContain("Confia");
  });

  it("contribution.failed envoie un e-mail avec le motif d'échec, échappé s'il contient du HTML", async () => {
    const user = await createConfirmedUser(admin, "failed", "101");
    users.push(user);

    const client = await signIn(user.email);
    const { data: joinResult } = await client.rpc("join_basket", { p_basket_type_id: basketTypeId }).single();

    const maliciousReason = "Solde insuffisant <script>alert(1)</script>";
    const res = await POST(
      buildWebhookRequest({
        id: "evt-test-failed-1",
        event: "payment.failed",
        timestamp: Math.floor(Date.now() / 1000),
        data: {
          object: "transaction",
          id: 2,
          reference: "MTX-TEST-EMAIL-2",
          amount: joinResult!.amount,
          status: "failed",
          failure_reason: maliciousReason,
          metadata: { contribution_id: joinResult!.contribution_id },
        },
        environment: "sandbox",
      })
    );
    expect(res.status).toBe(200);

    const email = await fetchLatestEmail(user.email);
    expect(email.subject).toBe("Votre cotisation n'a pas abouti");
    expect(email.html).toContain("Solde insuffisant");
    expect(email.html).not.toContain("<script>alert(1)</script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("le paiement qui complète le panier envoie au gagnant l'e-mail « gain prêt » avec le lien de réclamation", async () => {
    const { data: smallBasketType } = await admin
      .from("tontine_basket_types")
      .insert({ label: "Test e-mails — gain prêt", contribution_amount: 2500, interval_days: 2, capacity: 2 })
      .select("id")
      .single();
    const smallBasketTypeId = smallBasketType!.id;

    const winner = await createConfirmedUser(admin, "winner", "102");
    const second = await createConfirmedUser(admin, "second", "103");
    users.push(winner, second);

    try {
      const winnerClient = await signIn(winner.email);
      const { data: winnerJoin } = await winnerClient
        .rpc("join_basket", { p_basket_type_id: smallBasketTypeId })
        .single();

      // Premier paiement : panier pas encore complet, pas d'e-mail de gain.
      const firstRes = await POST(
        buildWebhookRequest({
          id: "evt-test-winner-1",
          event: "payment.success",
          timestamp: Math.floor(Date.now() / 1000),
          data: {
            object: "transaction",
            id: 3,
            reference: "MTX-TEST-EMAIL-3",
            amount: winnerJoin!.amount,
            status: "completed",
            metadata: { contribution_id: winnerJoin!.contribution_id },
          },
          environment: "sandbox",
        })
      );
      expect(firstRes.status).toBe(200);

      const secondClient = await signIn(second.email);
      const { data: secondJoin } = await secondClient
        .rpc("join_basket", { p_basket_type_id: smallBasketTypeId })
        .single();

      // Second (et dernier) paiement : panier complet, le 1er arrivé (winner) gagne.
      const secondRes = await POST(
        buildWebhookRequest({
          id: "evt-test-winner-2",
          event: "payment.success",
          timestamp: Math.floor(Date.now() / 1000),
          data: {
            object: "transaction",
            id: 4,
            reference: "MTX-TEST-EMAIL-4",
            amount: secondJoin!.amount,
            status: "completed",
            metadata: { contribution_id: secondJoin!.contribution_id },
          },
          environment: "sandbox",
        })
      );
      expect(secondRes.status).toBe(200);

      const email = await fetchLatestEmail(winner.email);
      expect(email.subject).toContain("Test e-mails — gain prêt");
      expect(email.html).toContain("4 750 FCFA"); // 2500 x 2 x 95%
      expect(email.html).toContain("/gain/");
      expect(email.html).not.toContain("télétravail rémunéré");
    } finally {
      await admin.from("tontine_basket_instances").delete().eq("basket_type_id", smallBasketTypeId);
      await admin.from("tontine_basket_types").delete().eq("id", smallBasketTypeId);
    }
  });
});
