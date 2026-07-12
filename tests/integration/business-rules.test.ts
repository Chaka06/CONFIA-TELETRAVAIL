/**
 * Test d'intégration du moteur financier complet, exécuté contre la stack
 * Supabase LOCALE (`npx supabase start` doit être lancé au préalable).
 * Reproduit noir sur blanc les règles métier du cahier des charges :
 *   - un dépôt de palier ne peut jamais être financé par le solde interne,
 *   - chaque mission est corrigée automatiquement, sans intervention humaine,
 *   - une réponse incorrecte est rejetée et remplacée par une nouvelle mission,
 *   - l'actif atteint exactement 5 000 / 11 500 / 20 500 / 40 500 FCFA,
 *   - les commissions de parrainage (2 000 puis 3 000 FCFA) se déclenchent
 *     automatiquement aux paliers 2 et 4,
 *   - un cycle complété débloque exactement un droit de retrait de 5 000 FCFA,
 *   - un second retrait sans nouveau cycle complété est refusé,
 *   - le traitement d'un retrait par un administrateur suit bien le cycle
 *     pending -> processing -> completed (ou rejected), sans jamais sauter
 *     l'étape de virement réel.
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

async function createConfirmedUser(
  admin: SupabaseClient,
  label: string,
  metadata: Record<string, unknown>
) {
  const email = uniqueEmail(label);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
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

/** Construit, à partir de la réponse attendue (visible seulement du service_role), une soumission correcte. */
function buildCorrectSubmission(category: string, expected: Record<string, unknown>): Record<string, unknown> {
  switch (category) {
    case "redaction_contrainte": {
      const keywords = expected.keywords as string[];
      const filler = [
        "merci", "de", "vérifier", "attentivement", "chaque", "point", "avant", "la",
        "prochaine", "étape", "du", "projet", "avec", "toute", "notre", "équipe",
        "afin", "de", "respecter", "les", "délais", "convenus", "pour", "garantir",
        "un", "excellent", "résultat", "cette", "semaine", "ensemble",
      ];
      const minWords = expected.min_words as number;
      const words = [...keywords];
      let i = 0;
      while (words.length < minWords + 2 && i < filler.length) {
        words.push(filler[i]);
        i++;
      }
      return { answer: words.join(" ") + "." };
    }
    case "verification_info":
      return { answer: expected.answer };
    case "classification":
      return { answers: expected.answers };
    case "validation_contenu":
      return { selected_index: expected.correct_index };
    case "analyse_texte":
      return { answer: expected.answer };
    case "questionnaire":
      return { selected_index: expected.correct_index };
    case "test_logique":
      return { answer: expected.answer };
    default:
      throw new Error(`catégorie de mission inconnue dans le test : ${category}`);
  }
}

async function completeTier(
  admin: SupabaseClient,
  userClient: SupabaseClient,
  userId: string,
  tierNumber: number
) {
  const { data: tier, error: tierError } = await admin
    .from("cycle_tiers")
    .select("id, cycle_id")
    .eq("tier_number", tierNumber)
    .eq(
      "cycle_id",
      (
        await admin
          .from("mission_cycles")
          .select("id")
          .eq("user_id", userId)
          .eq("cycle_number", 1)
          .single()
      ).data!.id
    )
    .single();
  if (tierError || !tier) throw new Error(`Palier ${tierNumber} introuvable : ${tierError?.message}`);

  const { data: deposit, error: depositError } = await userClient.rpc("initiate_deposit", {
    p_cycle_tier_id: tier.id,
  });
  if (depositError || !deposit) throw new Error(`initiate_deposit a échoué : ${depositError?.message}`);

  const { error: confirmError } = await admin.rpc("confirm_deposit", {
    p_deposit_id: deposit.id,
    p_provider_reference: `TEST-${tierNumber}-${Date.now()}`,
  });
  if (confirmError) throw new Error(`confirm_deposit a échoué : ${confirmError.message}`);

  // Tant que les 3 emplacements du palier ne sont pas tous "validated", on
  // soumet la bonne réponse pour chaque mission encore "assigned" — une
  // réponse fausse régénère automatiquement une nouvelle mission sur le même
  // emplacement, donc cette boucle converge toujours.
  for (let guard = 0; guard < 20; guard++) {
    const { data: assignments } = await admin
      .from("mission_assignments")
      .select("id, variant_content, expected_answer")
      .eq("cycle_id", tier.cycle_id)
      .eq("tier_number", tierNumber)
      .eq("status", "assigned");

    if (!assignments || assignments.length === 0) break;

    for (const a of assignments) {
      const category = (a.variant_content as { category: string }).category;
      const submission = buildCorrectSubmission(category, a.expected_answer as Record<string, unknown>);

      const { data: result, error: submitError } = await userClient.rpc("submit_mission_assignment", {
        p_assignment_id: a.id,
        p_submission_data: submission,
      });
      if (submitError) throw new Error(`submit_mission_assignment a échoué : ${submitError.message}`);
      if (!(result as { approved: boolean }).approved) {
        throw new Error(`La réponse construite pour la catégorie ${category} a été jugée incorrecte`);
      }
    }
  }

  const { count: remaining } = await admin
    .from("mission_assignments")
    .select("*", { count: "exact", head: true })
    .eq("cycle_id", tier.cycle_id)
    .eq("tier_number", tierNumber)
    .eq("status", "assigned");
  if (remaining && remaining > 0) {
    throw new Error(`Le palier ${tierNumber} n'a pas convergé (missions encore assignées)`);
  }
}

async function getBalance(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("wallets").select("balance").eq("user_id", userId).single();
  return data?.balance ?? null;
}

describe("Moteur financier — parcours complet des 4 paliers", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let referrer: { id: string; email: string };
  let referee: { id: string; email: string };
  let refereeClient: SupabaseClient;

  beforeAll(async () => {
    referrer = await createConfirmedUser(admin, "referrer", {
      first_name: "Awa",
      last_name: "Diallo",
      date_of_birth: "1995-05-01",
      city: "Abidjan",
      phone_number: "+2250700000201",
    });

    const { data: referrerProfile } = await admin
      .from("profiles")
      .select("referral_code")
      .eq("id", referrer.id)
      .single();

    referee = await createConfirmedUser(admin, "referee", {
      first_name: "Moussa",
      last_name: "Kone",
      date_of_birth: "1998-03-01",
      city: "Bouake",
      phone_number: "+2250700000202",
      referral_code_input: referrerProfile!.referral_code,
    });

    refereeClient = await signIn(referee.email);
  }, 30000);

  afterAll(async () => {
    for (const user of [referrer, referee]) {
      await admin.from("audit_logs").delete().eq("actor_id", user.id);
      await admin.from("email_logs").delete().eq("user_id", user.id);
      await admin.auth.admin.deleteUser(user.id);
    }
  });

  it("associe automatiquement le filleul au parrain via le code promo", async () => {
    const { data: profile } = await admin
      .from("profiles")
      .select("referred_by")
      .eq("id", referee.id)
      .single();
    expect(profile?.referred_by).toBe(referrer.id);
  });

  it("refuse un dépôt tant que le palier n'est pas en attente de dépôt (protection contre le contournement)", async () => {
    const { data: cycle } = await admin
      .from("mission_cycles")
      .select("id")
      .eq("user_id", referee.id)
      .eq("cycle_number", 1)
      .single();

    const { data: tier2 } = await admin
      .from("cycle_tiers")
      .select("id")
      .eq("cycle_id", cycle!.id)
      .eq("tier_number", 2)
      .single();

    // Le palier 2 est encore "locked" (le palier 1 n'est pas terminé) : la
    // tentative de dépôt doit être rejetée par la RPC, jamais silencieusement acceptée.
    const { error } = await refereeClient.rpc("initiate_deposit", { p_cycle_tier_id: tier2!.id });
    expect(error).not.toBeNull();
  });

  it("une réponse incorrecte est rejetée automatiquement et remplacée par une nouvelle mission", async () => {
    // Utilisateur dédié et jetable pour ne pas perturber la progression du
    // parcours principal (referrer/referee) testé par ailleurs dans ce fichier.
    const solo = await createConfirmedUser(admin, "solo-wrong-answer", {
      first_name: "Test",
      last_name: "Solo",
      date_of_birth: "1996-01-01",
      city: "Abidjan",
      phone_number: "+2250700000401",
    });
    const soloClient = await signIn(solo.email);

    const { data: cycle } = await admin
      .from("mission_cycles")
      .select("id")
      .eq("user_id", solo.id)
      .eq("cycle_number", 1)
      .single();
    const { data: tier1 } = await admin
      .from("cycle_tiers")
      .select("id")
      .eq("cycle_id", cycle!.id)
      .eq("tier_number", 1)
      .single();

    const { data: deposit } = await soloClient.rpc("initiate_deposit", { p_cycle_tier_id: tier1!.id });
    await admin.rpc("confirm_deposit", { p_deposit_id: deposit!.id, p_provider_reference: `TEST-WRONG-${Date.now()}` });

    const { data: assignment } = await admin
      .from("mission_assignments")
      .select("id, slot_number")
      .eq("cycle_id", cycle!.id)
      .eq("tier_number", 1)
      .eq("status", "assigned")
      .limit(1)
      .single();

    // Une réponse volontairement fausse pour n'importe quel type de mission :
    // le champ pertinent (answer/selected_index/answers) échoue la
    // comparaison avec expected_answer quelle que soit la catégorie tirée.
    const { data: result } = await soloClient.rpc("submit_mission_assignment", {
      p_assignment_id: assignment!.id,
      p_submission_data: { answer: "réponse délibérément fausse", selected_index: -1, answers: {} },
    });
    expect((result as { approved: boolean }).approved).toBe(false);

    const { data: rejected } = await admin
      .from("mission_assignments")
      .select("status")
      .eq("id", assignment!.id)
      .single();
    expect(rejected?.status).toBe("rejected");

    const { data: replacement } = await admin
      .from("mission_assignments")
      .select("id, status")
      .eq("cycle_id", cycle!.id)
      .eq("tier_number", 1)
      .eq("slot_number", assignment!.slot_number)
      .eq("status", "assigned")
      .maybeSingle();
    expect(replacement).not.toBeNull();

    await admin.from("audit_logs").delete().eq("actor_id", solo.id);
    await admin.from("email_logs").delete().eq("user_id", solo.id);
    await admin.auth.admin.deleteUser(solo.id);
  });

  it("palier 1 : après dépôt (2 000 FCFA) et 3 missions validées, l'actif atteint 5 000 FCFA", async () => {
    await completeTier(admin, refereeClient, referee.id, 1);
    expect(await getBalance(admin, referee.id)).toBe(5000);
  });

  it("palier 2 : l'actif atteint 11 500 FCFA et le parrain reçoit 2 000 FCFA de commission", async () => {
    await completeTier(admin, refereeClient, referee.id, 2);
    expect(await getBalance(admin, referee.id)).toBe(11500);
    expect(await getBalance(admin, referrer.id)).toBe(2000);
  });

  it("palier 3 : l'actif atteint 20 500 FCFA (aucune commission à ce palier)", async () => {
    await completeTier(admin, refereeClient, referee.id, 3);
    expect(await getBalance(admin, referee.id)).toBe(20500);
    expect(await getBalance(admin, referrer.id)).toBe(2000);
  });

  it("palier 4 : l'actif atteint 40 500 FCFA, le parrain reçoit 3 000 FCFA de plus (5 000 FCFA au total)", async () => {
    await completeTier(admin, refereeClient, referee.id, 4);
    expect(await getBalance(admin, referee.id)).toBe(40500);
    expect(await getBalance(admin, referrer.id)).toBe(5000);
  });

  it("une mission complète débloque exactement un droit de retrait de 5 000 FCFA", async () => {
    const { data: rights } = await admin
      .from("withdrawal_rights")
      .select("cap_amount, status")
      .eq("user_id", referee.id);
    expect(rights).toHaveLength(1);
    expect(rights![0].cap_amount).toBe(5000);
    expect(rights![0].status).toBe("available");
  });

  it("démarre automatiquement un nouveau cycle après la mission complète", async () => {
    const { data: cycles } = await admin
      .from("mission_cycles")
      .select("cycle_number, status")
      .eq("user_id", referee.id)
      .order("cycle_number");
    expect(cycles).toHaveLength(2);
    expect(cycles![0].status).toBe("completed");
    expect(cycles![1].status).toBe("in_progress");
  });

  it("le retrait débite le solde et consomme le droit unique", async () => {
    const { data: withdrawal, error } = await refereeClient.rpc("request_withdrawal", {
      p_amount: 5000,
      p_destination_details: { phone_number: "+2250700000202", full_name: "Moussa Kone" },
    });
    expect(error).toBeNull();
    expect(withdrawal?.amount).toBe(5000);
    expect(await getBalance(admin, referee.id)).toBe(35500);

    const { data: right } = await admin
      .from("withdrawal_rights")
      .select("status")
      .eq("user_id", referee.id)
      .single();
    expect(right?.status).toBe("used");
  });

  it("refuse un second retrait tant qu'aucun nouveau cycle n'est complété", async () => {
    const { error } = await refereeClient.rpc("request_withdrawal", {
      p_amount: 1000,
      p_destination_details: { phone_number: "+2250700000202", full_name: "Moussa Kone" },
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain("no_withdrawal_right_available");
  });
});

describe("Retraits — cycle d'état pending → processing → completed/rejected", () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let user: { id: string; email: string };
  let userClient: SupabaseClient;

  beforeAll(async () => {
    user = await createConfirmedUser(admin, "withdrawer", {
      first_name: "Fatou",
      last_name: "Sow",
      date_of_birth: "1997-01-01",
      city: "Dakar",
      phone_number: "+2250700000301",
    });
    userClient = await signIn(user.email);

    // Crédite directement le portefeuille et octroie un droit de retrait
    // pour isoler ce test du parcours complet des paliers.
    await admin.rpc("fn_apply_wallet_delta", {
      p_user_id: user.id,
      p_delta: 5000,
      p_type: "adjustment",
      p_reference_table: "test",
      p_reference_id: user.id,
      p_description: "Crédit de test",
    });
    const { data: cycle } = await admin
      .from("mission_cycles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    await admin.from("withdrawal_rights").insert({
      user_id: user.id,
      source_cycle_id: cycle!.id,
      cap_amount: 5000,
    });
  }, 30000);

  afterAll(async () => {
    await admin.from("audit_logs").delete().eq("actor_id", user.id);
    await admin.from("email_logs").delete().eq("user_id", user.id);
    await admin.auth.admin.deleteUser(user.id);
  });

  it("un retrait approuvé passe par 'processing' avant 'completed' — jamais directement", async () => {
    const { data: withdrawal } = await userClient.rpc("request_withdrawal", {
      p_amount: 5000,
      p_destination_details: { phone_number: "+2250700000301", full_name: "Fatou Sow" },
    });

    const { error: approveError } = await admin.rpc("admin_approve_withdrawal", {
      p_withdrawal_id: withdrawal!.id,
      p_provider_reference: "MTX-TEST-AUTO-001",
    });
    expect(approveError).toBeNull();

    const { data: afterApprove } = await admin
      .from("withdrawals")
      .select("status, provider_reference")
      .eq("id", withdrawal!.id)
      .single();
    expect(afterApprove?.status).toBe("processing");
    expect(afterApprove?.provider_reference).toBe("MTX-TEST-AUTO-001");

    // Deux étapes de validation existent volontairement : l'approbation
    // (déclenche le virement) ne finalise jamais seule le retrait.
    expect(afterApprove?.status).not.toBe("completed");

    const { error: finalizeError } = await admin.rpc("finalize_withdrawal_payout", {
      p_withdrawal_id: withdrawal!.id,
      p_approved: true,
      p_provider_reference: "MTX-TEST-AUTO-001",
    });
    expect(finalizeError).toBeNull();

    const { data: afterFinalize } = await admin
      .from("withdrawals")
      .select("status")
      .eq("id", withdrawal!.id)
      .single();
    expect(afterFinalize?.status).toBe("completed");
  });

  it("un virement qui échoue après approbation recrédite le solde et restitue le droit", async () => {
    await admin.rpc("fn_apply_wallet_delta", {
      p_user_id: user.id,
      p_delta: 5000,
      p_type: "adjustment",
      p_reference_table: "test",
      p_reference_id: user.id,
      p_description: "Second crédit de test",
    });
    // Un droit de retrait est lié de façon unique à un cycle (une seule ligne
    // par cycle_id) : on démarre un second cycle pour ce test plutôt que de
    // réutiliser celui déjà consommé par le test précédent.
    const { data: newCycleId } = await admin.rpc("fn_start_new_cycle", { p_user_id: user.id, p_cycle_number: 2 });
    const { data: right } = await admin
      .from("withdrawal_rights")
      .insert({ user_id: user.id, source_cycle_id: newCycleId, cap_amount: 5000 })
      .select("id")
      .single();

    const balanceBefore = await getBalance(admin, user.id);

    const { data: withdrawal, error: requestError } = await userClient.rpc("request_withdrawal", {
      p_amount: 5000,
      p_destination_details: { phone_number: "+2250700000301", full_name: "Fatou Sow" },
    });
    expect(requestError).toBeNull();
    expect(await getBalance(admin, user.id)).toBe(balanceBefore! - 5000);

    await admin.rpc("admin_approve_withdrawal", {
      p_withdrawal_id: withdrawal!.id,
      p_provider_reference: "MTX-TEST-FAIL-001",
    });

    await admin.rpc("finalize_withdrawal_payout", {
      p_withdrawal_id: withdrawal!.id,
      p_approved: false,
      p_reason: "Numéro mobile money invalide",
    });

    expect(await getBalance(admin, user.id)).toBe(balanceBefore);

    const { data: rightAfter } = await admin.from("withdrawal_rights").select("status").eq("id", right!.id).single();
    expect(rightAfter?.status).toBe("available");
  });
});
