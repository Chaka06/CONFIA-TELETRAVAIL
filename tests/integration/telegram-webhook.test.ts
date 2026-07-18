/**
 * Test d'intégration du webhook Telegram (/api/webhooks/telegram), exécuté
 * contre la vraie base Supabase locale. L'appel réel à l'API Telegram
 * (fetch) est intercepté pour vérifier le contenu exact de la réponse que
 * le bot aurait envoyée, sans avoir besoin d'un vrai jeton de bot.
 */
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
process.env.TELEGRAM_BOT_TOKEN ??= "test-bot-token";
process.env.TELEGRAM_WEBHOOK_SECRET ??= "test-webhook-secret";

const { POST } = await import("@/app/api/webhooks/telegram/route");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!;

function buildRequest(text: string, headers: Record<string, string> = { "x-telegram-bot-api-secret-token": WEBHOOK_SECRET }) {
  return new Request("http://localhost/api/webhooks/telegram", {
    method: "POST",
    headers,
    body: JSON.stringify({ message: { chat: { id: 12345 }, text } }),
  });
}

/** Isole, parmi tous les appels fetch (Supabase compris), les appels réellement adressés à l'API Telegram. */
function telegramCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([input]: [RequestInfo | URL]) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return url.startsWith("https://api.telegram.org/");
  });
}

describe("Webhook Telegram — commandes du bot", () => {
  const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const realFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    // N'intercepte que les appels vers l'API Telegram : le client Supabase
    // utilise lui aussi fetch() en interne pour ses vraies requêtes REST,
    // qui doivent continuer à passer normalement.
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

  it("rejette une requête sans le bon secret (401)", async () => {
    const res = await POST(buildRequest("/paniers", { "x-telegram-bot-api-secret-token": "mauvais-secret" }));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignore un message qui n'est pas une commande (pas de réponse, mais 200 pour Telegram)", async () => {
    const res = await POST(buildRequest("bonjour tout le monde"));
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("/aide répond avec la liste des commandes", async () => {
    const res = await POST(buildRequest("/aide"));
    expect(res.status).toBe(200);
    const calls = telegramCalls(fetchMock);
    expect(calls).toHaveLength(1);
    const [, options] = calls[0];
    const body = JSON.parse(options.body);
    expect(body.chat_id).toBe(12345);
    expect(body.text).toContain("/paniers");
    expect(body.text).toContain("/gagnant");
  });

  it("/paniers répond avec le remplissage réel des 4 formules", async () => {
    const { data: basketType } = await admin
      .from("tontine_basket_types")
      .select("id, label")
      .eq("contribution_amount", 1000)
      .single();

    // Une seule instance "filling" existe par formule à la fois (invariant
    // métier du modèle à paiement unique — seedée par la migration 0012) :
    // on ajuste son compteur plutôt que d'en insérer une seconde, ce qui ne
    // peut pas arriver en usage réel.
    await admin
      .from("tontine_basket_instances")
      .update({ member_count: 7 })
      .eq("basket_type_id", basketType!.id)
      .eq("status", "filling");

    try {
      const res = await POST(buildRequest("/paniers@mon_bot"));
      expect(res.status).toBe(200);
      const calls = telegramCalls(fetchMock);
      expect(calls).toHaveLength(1);
      const [, options] = calls[0];
      const body = JSON.parse(options.body);
      expect(body.text).toContain(basketType!.label);
      expect(body.text).toContain("7/20");
    } finally {
      // Remet le compteur seedé à 0 : d'autres suites (ex. tontine.test.ts)
      // partagent cette même instance "filling" sur la base locale.
      await admin
        .from("tontine_basket_instances")
        .update({ member_count: 0 })
        .eq("basket_type_id", basketType!.id)
        .eq("status", "filling");
    }
  });

  it("/gagnant répond avec le dernier gagnant connu", async () => {
    const { data: basketType } = await admin
      .from("tontine_basket_types")
      .select("id")
      .eq("contribution_amount", 3000)
      .single();

    const { data: user } = await admin.auth.admin.createUser({
      email: `telegramtest.${Date.now()}@example.com`,
      password: "TestPassword123",
      email_confirm: true,
      user_metadata: {
        first_name: "Aminata",
        last_name: "Test",
        date_of_birth: "1995-01-01",
        city: "Abidjan",
        phone_number: "+2250700009000",
      },
    });

    const { data: instance } = await admin
      .from("tontine_basket_instances")
      .insert({ basket_type_id: basketType!.id, status: "active", member_count: 20 })
      .select("id")
      .single();

    const { data: membership } = await admin
      .from("tontine_memberships")
      .insert({ basket_instance_id: instance!.id, user_id: user!.user.id, join_order: 1, status: "active" })
      .select("id")
      .single();

    await admin.from("tontine_payouts").insert({
      basket_instance_id: instance!.id,
      round_number: 1,
      membership_id: membership!.id,
      amount: 57000,
      status: "pending",
    });

    const res = await POST(buildRequest("/gagnant"));
    expect(res.status).toBe(200);
    const calls = telegramCalls(fetchMock);
    expect(calls).toHaveLength(1);
    const [, options] = calls[0];
    const body = JSON.parse(options.body);
    expect(body.text).toContain("Aminata");
    expect(body.text).toContain("57");
    expect(body.text).toContain("en cours de versement");

    await admin.auth.admin.deleteUser(user!.user.id);
  });
});
