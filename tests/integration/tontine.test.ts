/**
 * Test d'intégration du moteur de tontine (nouveau modèle), exécuté contre la
 * stack Supabase LOCALE (`npx supabase start` au préalable). Règles métier :
 *   - rejoindre un panier crée une adhésion + un dépôt d'entrée unique dû,
 *   - `member_count` n'est incrémenté qu'à la confirmation réelle du paiement,
 *   - dès que le 20e membre paie, TOUT se déclenche de façon synchrone dans
 *     `fn_confirm_contribution` : gagnant déterminé (join_order minimal), gain
 *     créé, les 19 autres passent en `cycle_completed`, l'instance passe en
 *     `active`, et une instance `filling` neuve est disponible,
 *   - le gagnant renseigne ses coordonnées via son jeton, l'admin confirme,
 *     le membre passe `paid_out_left` et l'instance est close (`completed`),
 *   - pas de round 2, pas de cotisations étalées, pas de rappel d'échéance.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

try {
  process.loadEnvFile(new URL("../../.env.local", import.meta.url));
} catch {
  // .env.local absent : valeurs par défaut de la stack locale ci-dessous.
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const PASSWORD = "TestPassword123";
const CAPACITY = 20;

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
      phone_number: `+22507${phoneSuffix.padStart(7, "0")}`,
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

describe("Tontine — 20 paiements remplissent le panier et déclenchent le gain instantanément", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const users: { id: string; email: string }[] = [];
  let basketTypeId: string;
  let instanceId: string;
  let firstMembershipId: string;

  beforeAll(async () => {
    const { data: basketType } = await admin
      .from("tontine_basket_types")
      .select("id")
      .eq("contribution_amount", 1000)
      .single();
    basketTypeId = basketType!.id;

    for (let i = 0; i < CAPACITY; i++) {
      users.push(await createConfirmedUser(admin, `member${i}`, String(1000 + i)));
    }
  }, 120000);

  afterAll(async () => {
    for (const user of users) await admin.auth.admin.deleteUser(user.id);
    // Nettoie l'instance remplie par ce bloc et l'instance 'filling' neuve
    // auto-créée à la clôture, pour que le run suivant reparte propre.
    await admin.from("tontine_basket_instances").delete().eq("basket_type_id", basketTypeId);
  });

  it("le 20e paiement crée le gain, clôt les 19 autres et ouvre un panier neuf", async () => {
    for (const [index, user] of users.entries()) {
      const client = await signIn(user.email);
      const { data: joinResult, error: joinError } = await client
        .rpc("join_basket", { p_basket_type_id: basketTypeId })
        .single();

      expect(joinError).toBeNull();
      expect(joinResult).not.toBeNull();
      if (index === 0) {
        instanceId = joinResult!.basket_instance_id;
        firstMembershipId = joinResult!.membership_id;
      }

      const { data: confirm, error: confirmError } = await admin
        .rpc("fn_confirm_contribution", {
          p_contribution_id: joinResult!.contribution_id,
          p_provider_reference: `MTX-TEST-${index}`,
          p_paid_amount: joinResult!.amount,
        })
        .single();

      expect(confirmError).toBeNull();
      expect(confirm!.basket_instance_id).toBe(instanceId);
      expect(confirm!.member_count).toBe(index + 1);
      expect(confirm!.capacity).toBe(CAPACITY);

      if (index < CAPACITY - 1) {
        expect(confirm!.became_full).toBe(false);
      } else {
        // 20e paiement : gain déclenché immédiatement, gagnant = 1er arrivé.
        expect(confirm!.became_full).toBe(true);
        expect(confirm!.winner_user_id).toBe(users[0].id);
        expect(Number(confirm!.payout_amount)).toBe(19000); // 20 000 - 5% de commission plateforme
        expect(confirm!.beneficiary_token).toBeTruthy();
      }
    }

    // L'instance est pleine et en attente de confirmation admin.
    const { data: instance } = await admin
      .from("tontine_basket_instances")
      .select("status, member_count")
      .eq("id", instanceId)
      .single();
    expect(instance?.status).toBe("active");
    expect(instance?.member_count).toBe(CAPACITY);

    // Le gagnant (1er arrivé) reste actif ; les 19 autres sont clôturés.
    const { data: memberships } = await admin
      .from("tontine_memberships")
      .select("id, status, join_order")
      .eq("basket_instance_id", instanceId)
      .order("join_order");
    expect(memberships).toHaveLength(CAPACITY);
    expect(memberships!.filter((m) => m.status === "active")).toHaveLength(1);
    expect(memberships!.find((m) => m.status === "active")!.id).toBe(firstMembershipId);
    expect(memberships!.filter((m) => m.status === "cycle_completed")).toHaveLength(CAPACITY - 1);

    // Exactement une ligne de gain, pour le 1er arrivé, montant exact, pending.
    const { data: payouts } = await admin
      .from("tontine_payouts")
      .select("membership_id, amount, status")
      .eq("basket_instance_id", instanceId);
    expect(payouts).toHaveLength(1);
    expect(payouts![0].membership_id).toBe(firstMembershipId);
    expect(Number(payouts![0].amount)).toBe(19000); // 20 000 - 5% de commission plateforme
    expect(payouts![0].status).toBe("pending");

    // Un dépôt d'entrée unique par membre, tous payés (pas de cotisation étalée).
    const membershipIds = memberships!.map((m) => m.id);
    const { data: contributions } = await admin
      .from("tontine_contributions")
      .select("occurrence_number, status")
      .in("membership_id", membershipIds);
    expect(contributions).toHaveLength(CAPACITY);
    expect(contributions!.every((c) => c.occurrence_number === 1 && c.status === "paid")).toBe(true);

    // Une instance 'filling' neuve est disponible pour les prochains arrivants.
    const { data: filling } = await admin
      .from("tontine_basket_instances")
      .select("id, member_count")
      .eq("basket_type_id", basketTypeId)
      .eq("status", "filling")
      .maybeSingle();
    expect(filling).not.toBeNull();
    expect(filling!.member_count).toBe(0);
  }, 120000);

  it("le gagnant réclame son gain et l'admin confirme : membre sorti, instance close", async () => {
    const { data: payout } = await admin
      .from("tontine_payouts")
      .select("id, beneficiary_token")
      .eq("basket_instance_id", instanceId)
      .single();

    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { error: claimError } = await anon.rpc("submit_payout_beneficiary_info", {
      p_token: payout!.beneficiary_token,
      p_phone: "+2250700001000",
      p_payment_method: "orange_money",
    });
    expect(claimError).toBeNull();

    const { data: adminProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", "admin@confia.local")
      .maybeSingle();
    const adminId = adminProfile?.id ?? users[0].id;

    const { data: confirmResult, error: confirmError } = await admin
      .rpc("admin_confirm_payout", { p_payout_id: payout!.id, p_processed_by: adminId })
      .single();
    expect(confirmError).toBeNull();
    expect(confirmResult?.basket_instance_id).toBe(instanceId);

    const { data: winner } = await admin
      .from("tontine_memberships")
      .select("status")
      .eq("id", firstMembershipId)
      .single();
    expect(winner?.status).toBe("paid_out_left");

    const { data: instanceAfter } = await admin
      .from("tontine_basket_instances")
      .select("status")
      .eq("id", instanceId)
      .single();
    // Instance définitivement close : pas de round 2, pas de réouverture.
    expect(instanceAfter?.status).toBe("completed");
  }, 60000);
});

describe("Tontine — sécurité : une adhésion non payée ne compte jamais comme une place réelle", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let basketTypeId: string;
  let user: { id: string; email: string };

  beforeAll(async () => {
    const { data: basketType } = await admin
      .from("tontine_basket_types")
      .insert({ label: "Test isolation sécurité", contribution_amount: 1234, interval_days: 2 })
      .select("id")
      .single();
    basketTypeId = basketType!.id;
    user = await createConfirmedUser(admin, "unpaid", "700");
  }, 30000);

  afterAll(async () => {
    await admin.auth.admin.deleteUser(user.id);
    await admin.from("tontine_basket_instances").delete().eq("basket_type_id", basketTypeId);
    await admin.from("tontine_basket_types").delete().eq("id", basketTypeId);
  });

  it("join_basket seul (sans confirmation de paiement) n'incrémente pas member_count", async () => {
    const { data: freshInstance } = await admin
      .from("tontine_basket_instances")
      .insert({ basket_type_id: basketTypeId, status: "filling" })
      .select("id, member_count")
      .single();

    const client = await signIn(user.email);
    const { data: joinResult, error: joinError } = await client
      .rpc("join_basket", { p_basket_type_id: basketTypeId })
      .single();

    expect(joinError).toBeNull();
    expect(joinResult!.basket_instance_id).toBe(freshInstance!.id);

    const { data: instanceAfter } = await admin
      .from("tontine_basket_instances")
      .select("member_count")
      .eq("id", joinResult!.basket_instance_id)
      .single();

    // Tant que le paiement n'est pas confirmé, la réservation ne doit JAMAIS
    // compter comme une place occupée pour de vrai.
    expect(instanceAfter?.member_count).toBe(0);
  });

  it("fn_confirm_contribution rejette un montant qui ne correspond pas à l'échéance attendue", async () => {
    const mismatchUser = await createConfirmedUser(admin, "mismatch", "701");
    const client = await signIn(mismatchUser.email);
    const { data: joinResult } = await client.rpc("join_basket", { p_basket_type_id: basketTypeId }).single();

    const { error } = await admin.rpc("fn_confirm_contribution", {
      p_contribution_id: joinResult!.contribution_id,
      p_provider_reference: "MTX-TEST-MISMATCH",
      p_paid_amount: 1, // montant frauduleux, très inférieur aux 1234 FCFA attendus
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain("amount_mismatch");

    const { data: contribution } = await admin
      .from("tontine_contributions")
      .select("status")
      .eq("id", joinResult!.contribution_id)
      .single();
    expect(contribution?.status).toBe("pending");

    await admin.auth.admin.deleteUser(mismatchUser.id);
  });
});

describe("Tontine — sécurité : un compte suspendu ou banni ne peut plus rejoindre de panier", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let basketTypeId: string;
  let user: { id: string; email: string };

  beforeAll(async () => {
    const { data: basketType } = await admin
      .from("tontine_basket_types")
      .insert({ label: "Test statut compte", contribution_amount: 2468, interval_days: 2 })
      .select("id")
      .single();
    basketTypeId = basketType!.id;
    user = await createConfirmedUser(admin, "statususer", "702");
  }, 30000);

  afterAll(async () => {
    await admin.auth.admin.deleteUser(user.id);
    await admin.from("tontine_basket_instances").delete().eq("basket_type_id", basketTypeId);
    await admin.from("tontine_basket_types").delete().eq("id", basketTypeId);
  });

  it("refuse join_basket pour un compte suspendu, puis l'autorise une fois réactivé", async () => {
    const { error: suspendError } = await admin
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", user.id);
    expect(suspendError).toBeNull();

    // Vérifie que l'écriture a bien pris (non-régression du trigger de garde 0010).
    const { data: suspendedProfile } = await admin
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();
    expect(suspendedProfile?.status).toBe("suspended");

    const suspendedClient = await signIn(user.email);
    const { error: joinBlocked } = await suspendedClient
      .rpc("join_basket", { p_basket_type_id: basketTypeId })
      .single();
    expect(joinBlocked).not.toBeNull();
    expect(joinBlocked!.message).toContain("account_not_active");

    const { count: membershipsWhileSuspended } = await admin
      .from("tontine_memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(membershipsWhileSuspended ?? 0).toBe(0);

    // Banni : même blocage.
    await admin.from("profiles").update({ status: "banned" }).eq("id", user.id);
    const bannedClient = await signIn(user.email);
    const { error: joinBannedBlocked } = await bannedClient
      .rpc("join_basket", { p_basket_type_id: basketTypeId })
      .single();
    expect(joinBannedBlocked).not.toBeNull();
    expect(joinBannedBlocked!.message).toContain("account_not_active");

    // Réactivé : join_basket doit de nouveau fonctionner.
    await admin.from("profiles").update({ status: "active" }).eq("id", user.id);
    const activeClient = await signIn(user.email);
    const { data: joinResult, error: joinOk } = await activeClient
      .rpc("join_basket", { p_basket_type_id: basketTypeId })
      .single();
    expect(joinOk).toBeNull();
    expect(joinResult?.contribution_id).toBeTruthy();
  });
});

describe("Tontine — balayage quotidien : expiration des réservations impayées après 24h", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let basketTypeId: string;
  let user: { id: string; email: string };

  beforeAll(async () => {
    const { data: basketType } = await admin
      .from("tontine_basket_types")
      .insert({ label: "Test expiration", contribution_amount: 3690, interval_days: 2 })
      .select("id")
      .single();
    basketTypeId = basketType!.id;
    user = await createConfirmedUser(admin, "expire", "703");
  }, 30000);

  afterAll(async () => {
    await admin.auth.admin.deleteUser(user.id);
    await admin.from("tontine_basket_instances").delete().eq("basket_type_id", basketTypeId);
    await admin.from("tontine_basket_types").delete().eq("id", basketTypeId);
  });

  it("une réservation (dépôt d'entrée) jamais payée est expirée après 24h par le sweep", async () => {
    await admin
      .from("tontine_basket_instances")
      .insert({ basket_type_id: basketTypeId, status: "filling" })
      .select("id")
      .single();

    const client = await signIn(user.email);
    const { data: joinResult } = await client.rpc("join_basket", { p_basket_type_id: basketTypeId }).single();

    // Vieillit la réservation de plus de 24h.
    const old = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
    await admin.from("tontine_contributions").update({ created_at: old }).eq("id", joinResult!.contribution_id);

    const { data: sweep, error } = await admin.rpc("fn_daily_tontine_sweep");
    expect(error).toBeNull();
    expect((sweep as { expired: number }).expired).toBeGreaterThanOrEqual(1);

    const { data: membership } = await admin
      .from("tontine_memberships")
      .select("status")
      .eq("id", joinResult!.membership_id)
      .single();
    expect(membership?.status).toBe("removed_missed_payment");

    const { data: contribution } = await admin
      .from("tontine_contributions")
      .select("status")
      .eq("id", joinResult!.contribution_id)
      .single();
    expect(contribution?.status).toBe("missed");
  });
});

describe("Tontine — sécurité : un membre connecté peut relire sa propre cotisation après adhésion (régression RLS)", () => {
  // Trouvé lors d'un diagnostic en production : la policy RLS
  // memberships_select_same_basket (retirée en 0013) se référençait
  // elle-même, provoquant "infinite recursion detected in policy for
  // relation tontine_memberships" (42P17) sur TOUTE lecture de
  // tontine_memberships/tontine_contributions par le client authentifié
  // d'un utilisateur normal — cassant initiateContributionPayment() dès sa
  // première lecture, avant même l'appel à GeniusPay. Aucun test existant
  // ne relisait une cotisation via le client d'un utilisateur réellement
  // connecté (RLS) plutôt que via le client service_role (qui contourne
  // RLS et masquait donc totalement ce bug).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let basketTypeId: string;
  let user: { id: string; email: string };

  beforeAll(async () => {
    const { data: basketType } = await admin
      .from("tontine_basket_types")
      .select("id")
      .eq("contribution_amount", 1000)
      .single();
    basketTypeId = basketType!.id;
    user = await createConfirmedUser(admin, "rlsregression", "800");
  }, 30000);

  afterAll(async () => {
    await admin.auth.admin.deleteUser(user.id);
  });

  it("le client authentifié de l'utilisateur relit sa cotisation (avec et sans embed) sans erreur RLS", async () => {
    const client = await signIn(user.email);
    const { data: joinResult, error: joinError } = await client
      .rpc("join_basket", { p_basket_type_id: basketTypeId })
      .single();
    expect(joinError).toBeNull();

    const { data: withEmbed, error: withEmbedError } = await client
      .from("tontine_contributions")
      .select("id, amount, status, membership_id, tontine_memberships!inner(user_id)")
      .eq("id", joinResult!.contribution_id)
      .single();
    expect(withEmbedError).toBeNull();
    expect(withEmbed?.id).toBe(joinResult!.contribution_id);

    const { data: membership, error: membershipError } = await client
      .from("tontine_memberships")
      .select("id, status")
      .eq("id", joinResult!.membership_id)
      .single();
    expect(membershipError).toBeNull();
    expect(membership?.status).toBe("active");
  });
});

describe("Tontine — commission plateforme de 5% sur le gain de chaque formule", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  it("payout_amount = montant total collecté x 95%, pour les 4 formules", async () => {
    const { data: basketTypes } = await admin
      .from("tontine_basket_types")
      .select("contribution_amount, capacity, contributions_per_round, commission_rate, payout_amount")
      .order("contribution_amount");

    expect(basketTypes).toHaveLength(4);
    for (const bt of basketTypes!) {
      expect(Number(bt.commission_rate)).toBe(0.05);
      const totalCollected = Number(bt.contribution_amount) * bt.capacity * bt.contributions_per_round;
      const expectedPayout = Math.round(totalCollected * 0.95 * 100) / 100;
      expect(Number(bt.payout_amount)).toBe(expectedPayout);
      // Vérifie concrètement que le gagnant reçoit 95%, jamais 100%.
      expect(Number(bt.payout_amount)).toBeLessThan(totalCollected);
    }
  });
});
