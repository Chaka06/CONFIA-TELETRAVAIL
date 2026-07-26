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

const ACTIVE_MEMBERSHIP_STATUSES = ["pending_payment", "active", "won_pending_claim", "won_pending_payout"] as const;

/**
 * Rejoint un panier : réserve une place (INSERT panier_memberships, validé
 * par le trigger trg_reserve_panier_slot qui vérifie la capacité), puis
 * ouvre immédiatement la session de paiement Genius Pay pour le dépôt
 * unique. Modèle "paiement unique" : pas d'échéances ultérieures, une seule
 * adhésion = un seul paiement.
 */
export async function joinBasketAndPay(
  userClient: UserSupabaseClient,
  params: { panierId: string; userId: string; userEmail: string }
) {
  const { data: existing } = await userClient
    .from("panier_memberships")
    .select("id")
    .eq("panier_id", params.panierId)
    .eq("user_id", params.userId)
    .in("status", ACTIVE_MEMBERSHIP_STATUSES)
    .maybeSingle();

  if (existing) {
    throw new TontineServiceError("already_member_of_this_basket_type");
  }

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("first_name, last_name, phone")
    .eq("id", params.userId)
    .single();

  if (profileError || !profile) {
    throw new TontineServiceError("profile_not_found");
  }

  const { data: panier, error: panierError } = await userClient
    .from("paniers")
    .select("formule_amount")
    .eq("id", params.panierId)
    .single();

  if (panierError || !panier) {
    throw new TontineServiceError("panier_not_found");
  }

  const { data: membership, error: joinError } = await userClient
    .from("panier_memberships")
    // joined_in_cycle est écrasé par le trigger BEFORE INSERT
    // trg_reserve_panier_slot (qui y place le vrai cycle_index) : la valeur
    // fournie ici n'a aucune importance, seule sa présence satisfait le
    // typage (colonne NOT NULL sans défaut déclaré côté schéma).
    .insert({ panier_id: params.panierId, user_id: params.userId, joined_in_cycle: 0 })
    .select("id")
    .single();

  if (joinError || !membership) {
    throw new TontineServiceError(joinError?.message?.includes("complet") ? "basket_full" : "join_failed");
  }

  const env = getServerEnv();
  const admin = createAdminClient();

  try {
    const session = await getPaymentProvider().createMembershipSession({
      membershipId: membership.id,
      amount: panier.formule_amount,
      currency: "XOF",
      description: `Adhésion Confssa — ${formatFcfa(panier.formule_amount)}`,
      customer: {
        fullName: `${profile.first_name} ${profile.last_name}`,
        email: params.userEmail,
        phoneNumber: profile.phone,
      },
      successUrl: `${env.APP_BASE_URL}/tableau-de-bord?panier=${params.panierId}&statut=succes`,
      errorUrl: `${env.APP_BASE_URL}/tableau-de-bord?panier=${params.panierId}&statut=echec`,
    });

    await admin
      .from("panier_memberships")
      .update({ checkout_url: session.redirectUrl, geniuspay_reference: session.providerReference })
      .eq("id", membership.id);

    return { membershipId: membership.id, redirectUrl: session.redirectUrl };
  } catch (err) {
    console.error("genius_pay_create_session_failed", err);
    // Échec de création de session : on libère la place réservée
    // immédiatement plutôt que de laisser une réservation morte occuper un
    // slot de capacité indéfiniment.
    await admin.from("panier_memberships").delete().eq("id", membership.id);
    throw new TontineServiceError("payment_session_failed");
  }
}
