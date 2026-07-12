import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import { getPaymentProvider } from "@/lib/payments";
import { formatFcfa } from "@/lib/format";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

type UserSupabaseClient = SupabaseClient<Database>;

export class TontineServiceError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/**
 * Rejoint un panier : crée l'adhésion + la cotisation d'entrée (RPC
 * `join_basket`, respecte RLS), puis ouvre immédiatement la session de
 * paiement Genius Pay pour ce dépôt d'entrée.
 */
export async function joinBasketAndPay(userClient: UserSupabaseClient, params: { basketTypeId: string; userId: string }) {
  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("first_name, last_name, email, phone_number")
    .eq("id", params.userId)
    .single();

  if (profileError || !profile) {
    throw new TontineServiceError("profile_not_found");
  }

  const { data: joinResult, error: joinError } = await userClient
    .rpc("join_basket", { p_basket_type_id: params.basketTypeId })
    .single();

  if (joinError || !joinResult) {
    throw new TontineServiceError(joinError?.message ?? "join_failed");
  }

  return initiateContributionPayment(userClient, {
    contributionId: joinResult.contribution_id,
    userId: params.userId,
    profile,
    onSessionFailure: async () => {
      const admin = createAdminClient();
      await admin.rpc("fn_cancel_failed_join", { p_contribution_id: joinResult.contribution_id });
    },
  });
}

/** Ouvre une session de paiement pour une cotisation déjà existante (échéances 2 à 5). */
export async function initiateContributionPayment(
  userClient: UserSupabaseClient,
  params: {
    contributionId: string;
    userId: string;
    profile?: { first_name: string; last_name: string; email: string; phone_number: string };
    onSessionFailure?: () => Promise<void>;
  }
) {
  let profile = params.profile;
  if (!profile) {
    const { data, error } = await userClient
      .from("profiles")
      .select("first_name, last_name, email, phone_number")
      .eq("id", params.userId)
      .single();
    if (error || !data) throw new TontineServiceError("profile_not_found");
    profile = data;
  }

  const { data: contribution, error: contribError } = await userClient
    .from("tontine_contributions")
    .select("id, amount, status, membership_id, tontine_memberships!inner(user_id)")
    .eq("id", params.contributionId)
    .single();

  if (contribError || !contribution) {
    throw new TontineServiceError("contribution_not_found");
  }
  if (contribution.status !== "pending") {
    throw new TontineServiceError("contribution_not_pending");
  }

  const env = getServerEnv();
  const admin = createAdminClient();

  try {
    const session = await getPaymentProvider().createContributionSession({
      contributionId: contribution.id,
      amount: contribution.amount,
      currency: "XOF",
      description: `Cotisation Confssa — ${formatFcfa(contribution.amount)}`,
      customer: {
        fullName: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        phoneNumber: profile.phone_number,
      },
      successUrl: `${env.APP_BASE_URL}/tableau-de-bord?cotisation=${contribution.id}&statut=succes`,
      errorUrl: `${env.APP_BASE_URL}/tableau-de-bord?cotisation=${contribution.id}&statut=echec`,
    });

    await admin
      .from("tontine_contributions")
      .update({ provider_reference: session.providerReference })
      .eq("id", contribution.id);

    return { contributionId: contribution.id, redirectUrl: session.redirectUrl };
  } catch (err) {
    console.error("genius_pay_create_session_failed", err);
    if (params.onSessionFailure) await params.onSessionFailure();
    throw new TontineServiceError("payment_session_failed");
  }
}
