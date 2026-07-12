import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type UserSupabaseClient = SupabaseClient<Database>;

export class WithdrawalServiceError extends Error {}

/**
 * Enregistre une demande de retrait. Le débit du solde et le contrôle du
 * droit de retrait (ou du seuil de déblocage illimité) sont entièrement pris
 * en charge par la fonction RPC `request_withdrawal` (transaction unique,
 * verrouillage de ligne) : ce service ne fait qu'exposer une API applicative
 * propre au-dessus.
 */
export async function requestWithdrawal(
  userClient: UserSupabaseClient,
  params: { amount: number; phoneNumber: string; fullName: string }
) {
  const { data, error } = await userClient.rpc("request_withdrawal", {
    p_amount: params.amount,
    p_destination_details: {
      phone_number: params.phoneNumber,
      full_name: params.fullName,
    },
  });

  if (error || !data) {
    throw new WithdrawalServiceError(mapWithdrawalError(error?.message ?? "unknown_error"));
  }

  return data;
}

function mapWithdrawalError(message: string): string {
  if (message.includes("no_withdrawal_right_available")) {
    return "Aucun droit de retrait disponible. Terminez une mission complète (4 paliers) pour en débloquer un nouveau.";
  }
  if (message.includes("amount_exceeds_right_cap")) {
    return "Le montant demandé dépasse le plafond de votre droit de retrait (5 000 FCFA).";
  }
  if (message.includes("amount_exceeds_available_balance")) {
    return "Le montant demandé dépasse votre solde disponible.";
  }
  if (message.includes("invalid_amount")) {
    return "Montant de retrait invalide.";
  }
  return "Impossible de traiter la demande de retrait pour le moment.";
}
