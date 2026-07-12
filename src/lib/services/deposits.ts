import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import { getPaymentProvider } from "@/lib/payments";
import { formatFcfa } from "@/lib/format";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

type UserSupabaseClient = SupabaseClient<Database>;

export class DepositServiceError extends Error {}

/**
 * Initie un dépôt : crée l'intention de paiement en base (RPC utilisateur,
 * respecte RLS) puis ouvre la session de paiement chez Genius Pay. Si la
 * création de la session externe échoue, le dépôt est immédiatement marqué
 * "failed" pour ne jamais laisser un palier bloqué en "deposit_processing"
 * sans paiement réellement initié.
 */
export async function initiateTierDeposit(
  userClient: UserSupabaseClient,
  params: { cycleTierId: string; userId: string }
) {
  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("first_name, last_name, email, phone_number")
    .eq("id", params.userId)
    .single();

  if (profileError || !profile) {
    throw new DepositServiceError("Profil introuvable.");
  }

  const { data: deposit, error: rpcError } = await userClient.rpc("initiate_deposit", {
    p_cycle_tier_id: params.cycleTierId,
  });

  if (rpcError || !deposit) {
    throw new DepositServiceError(rpcError?.message ?? "Impossible d'initier le dépôt.");
  }

  const env = getServerEnv();
  const admin = createAdminClient();

  try {
    const session = await getPaymentProvider().createDepositSession({
      depositId: deposit.id,
      amount: deposit.amount,
      currency: "XOF",
      description: `Dépôt Confia — ${formatFcfa(deposit.amount)}`,
      customer: {
        fullName: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        phoneNumber: profile.phone_number,
      },
      successUrl: `${env.APP_BASE_URL}/tableau-de-bord/paliers?depot=${deposit.id}&statut=succes`,
      errorUrl: `${env.APP_BASE_URL}/tableau-de-bord/paliers?depot=${deposit.id}&statut=echec`,
    });

    // La référence Genius Pay est connue dès la création : on la conserve
    // immédiatement (utile pour le support, avant même la confirmation).
    await admin
      .from("deposits")
      .update({ provider_reference: session.providerReference })
      .eq("id", deposit.id);

    return { deposit, redirectUrl: session.redirectUrl };
  } catch (err) {
    console.error("genius_pay_create_session_failed", err);

    await admin.rpc("fail_deposit", {
      p_deposit_id: deposit.id,
      p_reason: "Échec de création de la session de paiement Genius Pay.",
    });

    throw new DepositServiceError(
      "Le service de paiement est momentanément indisponible. Veuillez réessayer dans quelques instants."
    );
  }
}
