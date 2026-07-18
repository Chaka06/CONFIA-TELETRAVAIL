/**
 * Test d'intégration des diffusions Telegram déclenchées automatiquement
 * (pas les commandes du groupe, déjà couvertes par
 * tests/integration/telegram-webhook.test.ts) : l'annonce d'une nouvelle
 * adhésion via le vrai webhook Genius Pay, et la diffusion périodique
 * d'encouragement via le nouveau cron /api/cron/telegram-encouragement.
 * L'appel réel à l'API Telegram est intercepté pour vérifier le contenu
 * exact envoyé, sans jeton de bot réel.
 */
import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

try {
  process.loadEnvFile(new URL("../../.env.local", import.meta.url));
} catch {
  // .env.local absent : valeurs par défaut de la stack locale ci-dessous.
}

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
process.env.GENIUS_PAY_WEBHOOK_SECRET ??= "test-webhook-secret";
process.env.TELEGRAM_BOT_TOKEN ??= "test-bot-token";
process.env.TELEGRAM_CHAT_ID ??= "-100test-chat-id";
process.env.CRON_SECRET ??= "test-cron-secret";

const { POST: geniusPayWebhook } = await import("@/app/api/webhooks/genius-pay/route");
const { GET: telegramEncouragementCron } = await import("@/app/api/cron/telegram-encouragement/route");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WEBHOOK_SECRET = process.env.GENIUS_PAY_WEBHOOK_SECRET!;
const CRON_SECRET = process.env.CRON_SECRET!;

const PASSWORD = "TestPassword123";
// Même résolution que SITE_URL dans src/lib/telegram.ts.
const JOIN_URL = `${process.env.APP_BASE_URL ?? "https://confssa.com"}/paniers`;

function sign(timestamp: string, body: string) {
  return createHmac("sha256", WEBHOOK_SECRET).update(`${timestamp}.${body}`, "utf8").digest("hex");
}

function buildGeniusPayWebhookRequest(payload: Record<string, unknown>) {
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

function uniqueEmail(label: string) {
  return `tgnotif.${label}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
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
      phone_number: `+22505${phoneSuffix.padStart(7, "0")}`,
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

function findTelegramCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([input]: [RequestInfo | URL]) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return url.startsWith("https://api.telegram.org/");
  });
}

function textOf(call: [RequestInfo | URL, RequestInit?]) {
  const [, options] = call;
  return JSON.parse((options!.body as string) ?? "{}").text as string;
}

describe("Diffusions Telegram automatiques", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const realFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith("https://api.telegram.org/")) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return realFetch(input, init);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockClear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe("notifyBasketMemberJoined (via le webhook Genius Pay)", () => {
    let basketTypeId: string;
    const users: { id: string; email: string }[] = [];

    afterAll(async () => {
      for (const user of users) await admin.auth.admin.deleteUser(user.id);
      if (basketTypeId) {
        await admin.from("tontine_basket_instances").delete().eq("basket_type_id", basketTypeId);
        await admin.from("tontine_basket_types").delete().eq("id", basketTypeId);
      }
    });

    it("annonce le nombre de membres, les places restantes et le lien du site quand le panier n'est pas encore plein", async () => {
      const { data: basketType } = await admin
        .from("tontine_basket_types")
        .insert({ label: "Test Telegram — adhésion", contribution_amount: 1750, interval_days: 2, capacity: 4 })
        .select("id")
        .single();
      basketTypeId = basketType!.id;

      const user = await createConfirmedUser(admin, "joiner1", "200");
      users.push(user);

      const client = await signIn(user.email);
      const { data: joinResult } = await client.rpc("join_basket", { p_basket_type_id: basketTypeId }).single();

      const res = await geniusPayWebhook(
        buildGeniusPayWebhookRequest({
          id: "evt-tg-notif-1",
          event: "payment.success",
          timestamp: Math.floor(Date.now() / 1000),
          data: {
            object: "transaction",
            id: 10,
            reference: "MTX-TG-NOTIF-1",
            amount: joinResult!.amount,
            status: "completed",
            metadata: { contribution_id: joinResult!.contribution_id },
          },
          environment: "sandbox",
        })
      );
      expect(res.status).toBe(200);

      const calls = findTelegramCalls(fetchMock);
      // notifyBasketMemberJoined (le seul événement Telegram attendu ici — le panier n'est pas plein).
      expect(calls).toHaveLength(1);
      const text = textOf(calls[0]);
      expect(text).toContain("Nouveau membre");
      expect(text).toContain("1/4");
      expect(text).toContain("Encore 3 places");
      expect(text).toContain(JOIN_URL);
      expect(text).toContain("<b>");
      expect(text).toContain("<i>");
    });

    it("n'inclut plus la relance \"rejoins vite\" quand ce paiement complète le panier (le message du gagnant suit)", async () => {
      const remainingSlots = 3; // capacity 4, 1 déjà payé dans le test précédent
      for (let i = 0; i < remainingSlots; i++) {
        const user = await createConfirmedUser(admin, `joiner${i + 2}`, String(201 + i));
        users.push(user);
        const client = await signIn(user.email);
        const { data: joinResult } = await client.rpc("join_basket", { p_basket_type_id: basketTypeId }).single();

        fetchMock.mockClear();
        const res = await geniusPayWebhook(
          buildGeniusPayWebhookRequest({
            id: `evt-tg-notif-fill-${i}`,
            event: "payment.success",
            timestamp: Math.floor(Date.now() / 1000),
            data: {
              object: "transaction",
              id: 20 + i,
              reference: `MTX-TG-NOTIF-FILL-${i}`,
              amount: joinResult!.amount,
              status: "completed",
              metadata: { contribution_id: joinResult!.contribution_id },
            },
            environment: "sandbox",
          })
        );
        expect(res.status).toBe(200);
      }

      // Dernier paiement (4e membre) : panier complet.
      const calls = findTelegramCalls(fetchMock);
      const joinedText = calls.map(textOf).find((t) => t.includes("Nouveau membre"))!;
      expect(joinedText).toContain("4/4");
      expect(joinedText).toContain("panier complet");
      expect(joinedText).not.toContain("Encore");
      expect(joinedText).not.toContain(JOIN_URL);

      const payoutText = calls.map(textOf).find((t) => t.includes("Panier complet !"))!;
      expect(payoutText).toContain("Gagnant");
    });
  });

  describe("broadcastBasketsEncouragement (cron /api/cron/telegram-encouragement)", () => {
    it("rejette une requête sans le bon secret (401)", async () => {
      const res = await telegramEncouragementCron(
        new Request("http://localhost/api/cron/telegram-encouragement", {
          headers: { authorization: "Bearer mauvais-secret" },
        })
      );
      expect(res.status).toBe(401);
      expect(findTelegramCalls(fetchMock)).toHaveLength(0);
    });

    it("diffuse le remplissage des paniers actifs avec une relance et le lien du site", async () => {
      const res = await telegramEncouragementCron(
        new Request("http://localhost/api/cron/telegram-encouragement", {
          headers: { authorization: `Bearer ${CRON_SECRET}` },
        })
      );
      expect(res.status).toBe(200);

      const calls = findTelegramCalls(fetchMock);
      expect(calls).toHaveLength(1);
      const text = textOf(calls[0]);
      expect(text).toContain("Ça bouge sur Confssa");
      expect(text).toContain("membres");
      expect(text).toContain(JOIN_URL);
      expect(text).toContain("<i>");
    });
  });
});
