/**
 * Test d'intégration du moteur de tontine, exécuté contre la stack Supabase
 * LOCALE (`npx supabase start` doit être lancé au préalable). Reproduit
 * noir sur blanc les règles métier :
 *   - rejoindre un panier crée une adhésion + une cotisation d'entrée due,
 *   - dès que le 10e membre paie son entrée, le round démarre : les
 *     échéances 2 à 5 sont générées pour tous, espacées de interval_days,
 *   - une échéance non payée le lendemain de sa date due retire
 *     automatiquement le membre concerné,
 *   - la dernière échéance du round déclenche le gain du premier membre par
 *     ordre d'arrivée, pour le montant exact attendu,
 *   - le gagnant renseigne ses coordonnées via son jeton, l'admin confirme,
 *     le membre quitte le panier et une place se libère.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

try {
  process.loadEnvFile(new URL("../../.env.local", import.meta.url));
} catch {
  // .env.local absent : on retombe sur les valeurs par défaut de la stack locale ci-dessous.
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const PASSWORD = "TestPassword123";

function uniqueEmail(label: string) {
  return `${label}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
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
      phone_number: `+225070000${phoneSuffix}`,
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

describe("Tontine — remplissage d'un panier et démarrage de round", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const users: { id: string; email: string }[] = [];
  let basketTypeId: string;
  let instanceId: string;

  beforeAll(async () => {
    const { data: basketType } = await admin
      .from("tontine_basket_types")
      .select("id")
      .eq("contribution_amount", 1000)
      .single();
    basketTypeId = basketType!.id;

    for (let i = 0; i < 10; i++) {
      const user = await createConfirmedUser(admin, `member${i}`, String(500 + i));
      users.push(user);
    }
  }, 60000);

  afterAll(async () => {
    for (const user of users) {
      await admin.auth.admin.deleteUser(user.id);
    }
  });

  it("10 membres rejoignant et payant leur entrée remplissent le panier et démarrent le round", async () => {
    for (const [index, user] of users.entries()) {
      const client = await signIn(user.email);
      const { data: joinResult, error: joinError } = await client
        .rpc("join_basket", { p_basket_type_id: basketTypeId })
        .single();

      expect(joinError).toBeNull();
      expect(joinResult).not.toBeNull();
      if (index === 0) instanceId = joinResult!.basket_instance_id;

      const { data: confirmResult, error: confirmError } = await admin
        .rpc("fn_confirm_contribution", {
          p_contribution_id: joinResult!.contribution_id,
          p_provider_reference: `MTX-TEST-${index}`,
        })
        .single();

      expect(confirmError).toBeNull();

      if (index < 9) {
        expect(confirmResult?.should_start_round).toBe(false);
      } else {
        expect(confirmResult?.should_start_round).toBe(true);
        expect(confirmResult?.basket_instance_id).toBe(instanceId);
      }
    }

    const { data: instance } = await admin
      .from("tontine_basket_instances")
      .select("status, member_count, round_started_on")
      .eq("id", instanceId)
      .single();
    expect(instance?.status).toBe("filling");
    expect(instance?.member_count).toBe(10);

    // Le démarrage du round est déclenché explicitement par l'appelant
    // (webhook) une fois should_start_round=true — on le fait ici comme le
    // ferait la route webhook.
    const { data: members, error: startError } = await admin.rpc("fn_start_round", { p_instance_id: instanceId });
    expect(startError).toBeNull();
    expect(members).toHaveLength(10);

    const { data: activeInstance } = await admin
      .from("tontine_basket_instances")
      .select("status, round_started_on")
      .eq("id", instanceId)
      .single();
    expect(activeInstance?.status).toBe("active");
    expect(activeInstance?.round_started_on).not.toBeNull();

    const { data: contributions } = await admin
      .from("tontine_contributions")
      .select("occurrence_number, status, membership_id")
      .in(
        "membership_id",
        (await admin.from("tontine_memberships").select("id").eq("basket_instance_id", instanceId)).data!.map(
          (m) => m.id
        )
      );

    // 10 membres x 5 occurrences (1 payée à l'entrée + 4 générées au démarrage du round).
    expect(contributions).toHaveLength(50);
    expect(contributions!.filter((c) => c.occurrence_number === 1 && c.status === "paid")).toHaveLength(10);
    expect(contributions!.filter((c) => c.occurrence_number > 1 && c.status === "pending")).toHaveLength(40);

    // Un nouveau panier "filling" doit être disponible pour les prochains arrivants.
    const { data: newFillingInstance } = await admin
      .from("tontine_basket_instances")
      .select("id")
      .eq("basket_type_id", basketTypeId)
      .eq("status", "filling")
      .maybeSingle();
    expect(newFillingInstance).not.toBeNull();
  }, 60000);
});

describe("Tontine — impayé, retrait automatique et déclenchement du gain", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let basketTypeId: string;
  let instanceId: string;
  const memberships: { id: string; userId: string; email: string }[] = [];

  beforeAll(async () => {
    const { data: basketType } = await admin
      .from("tontine_basket_types")
      .select("id, contribution_amount, contributions_per_round")
      .eq("contribution_amount", 1000)
      .single();
    basketTypeId = basketType!.id;

    const { data: instance } = await admin
      .from("tontine_basket_instances")
      .insert({ basket_type_id: basketTypeId, status: "filling" })
      .select("id")
      .single();
    instanceId = instance!.id;

    for (let i = 0; i < 10; i++) {
      const user = await createConfirmedUser(admin, `sweep${i}`, String(600 + i));
      const { data: membership } = await admin
        .from("tontine_memberships")
        .insert({ basket_instance_id: instanceId, user_id: user.id, join_order: i + 1, status: "active" })
        .select("id")
        .single();
      memberships.push({ id: membership!.id, userId: user.id, email: user.email });
    }

    await admin.from("tontine_basket_instances").update({ member_count: 10 }).eq("id", instanceId);
    await admin.rpc("fn_start_round", { p_instance_id: instanceId });
  }, 60000);

  afterAll(async () => {
    for (const m of memberships) {
      await admin.auth.admin.deleteUser(m.userId);
    }
  });

  it("retire automatiquement un membre n'ayant pas payé l'échéance de la veille", async () => {
    // Force l'échéance n°2 du premier membre à hier, pour simuler un impayé.
    const { data: contribution } = await admin
      .from("tontine_contributions")
      .select("id")
      .eq("membership_id", memberships[0].id)
      .eq("occurrence_number", 2)
      .single();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await admin
      .from("tontine_contributions")
      .update({ due_date: yesterday.toISOString().slice(0, 10) })
      .eq("id", contribution!.id);

    const { data: sweepResult, error } = await admin.rpc("fn_daily_tontine_sweep");
    expect(error).toBeNull();
    expect((sweepResult as { removed: unknown[] }).removed.length).toBeGreaterThanOrEqual(1);

    const { data: membershipAfter } = await admin
      .from("tontine_memberships")
      .select("status")
      .eq("id", memberships[0].id)
      .single();
    expect(membershipAfter?.status).toBe("removed_missed_payment");

    const { data: instanceAfter } = await admin
      .from("tontine_basket_instances")
      .select("member_count, status")
      .eq("id", instanceId)
      .single();
    expect(instanceAfter?.member_count).toBe(9);
    expect(instanceAfter?.status).toBe("paused");
  });

  it("déclenche le gain du premier membre restant quand la dernière échéance arrive, puis l'admin confirme le versement", async () => {
    // Force toutes les dernières échéances (occurrence 5) restantes à aujourd'hui.
    const remainingMembershipIds = memberships.slice(1).map((m) => m.id);
    await admin
      .from("tontine_contributions")
      .update({ due_date: new Date().toISOString().slice(0, 10) })
      .in("membership_id", remainingMembershipIds)
      .eq("occurrence_number", 5);

    const { data: sweepResult, error } = await admin.rpc("fn_daily_tontine_sweep");
    expect(error).toBeNull();
    const payouts = (sweepResult as { payouts: { payout_id: string; amount: number; membership_id: string }[] })
      .payouts;
    expect(payouts).toHaveLength(1);
    expect(payouts[0].amount).toBe(50000);
    // Le membre[0] a été retiré au test précédent : le gagnant doit être membre[1] (2e arrivé).
    expect(payouts[0].membership_id).toBe(memberships[1].id);

    const { data: payout } = await admin
      .from("tontine_payouts")
      .select("beneficiary_token, status")
      .eq("id", payouts[0].payout_id)
      .single();
    expect(payout?.status).toBe("pending");

    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { error: claimError } = await anon.rpc("submit_payout_beneficiary_info", {
      p_token: payout!.beneficiary_token,
      p_phone: "+2250700000601",
      p_payment_method: "orange_money",
    });
    expect(claimError).toBeNull();

    const { data: adminProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", "admin@confia.local")
      .maybeSingle();
    const adminId = adminProfile?.id ?? memberships[0].userId;

    const { data: confirmResult, error: confirmError } = await admin
      .rpc("admin_confirm_payout", { p_payout_id: payouts[0].payout_id, p_processed_by: adminId })
      .single();
    expect(confirmError).toBeNull();
    expect(confirmResult?.basket_instance_id).toBe(instanceId);

    const { data: winnerMembership } = await admin
      .from("tontine_memberships")
      .select("status")
      .eq("id", memberships[1].id)
      .single();
    expect(winnerMembership?.status).toBe("paid_out_left");

    const { data: instanceAfter } = await admin
      .from("tontine_basket_instances")
      .select("member_count, status")
      .eq("id", instanceId)
      .single();
    expect(instanceAfter?.member_count).toBe(8);
    expect(instanceAfter?.status).toBe("paused");
  });
});
