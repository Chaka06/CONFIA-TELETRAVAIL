"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const claimSchema = z.object({
  membershipId: z.string().uuid(),
  mobileMoneyProvider: z.enum(["orange_money", "wave", "mtn_money", "moov_money"]),
  mobileMoneyNumber: z.string().regex(/^\+225[0-9]{8,10}$/, "Numéro ivoirien invalide (format +225XXXXXXXXXX)"),
});

type ClaimInput = z.infer<typeof claimSchema>;

/**
 * Soumission des coordonnées de paiement d'un gain. Contrairement à
 * l'ancien modèle (lien public avec jeton), la RLS payout_claims_insert_own
 * exige que l'appelant soit connecté et propriétaire de l'adhésion gagnante
 * (status='won_pending_claim') : pas de flux anonyme possible ici, le
 * gagnant réclame son gain depuis son propre tableau de bord.
 */
export async function submitPayoutClaim(input: ClaimInput): Promise<{ error?: string }> {
  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid_payload" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "not_authenticated" };
  }

  const payload: Database["public"]["Tables"]["payout_claims"]["Insert"] = {
    membership_id: parsed.data.membershipId,
    mobile_money_provider: parsed.data.mobileMoneyProvider,
    mobile_money_number: parsed.data.mobileMoneyNumber,
  };

  const { error } = await supabase.from("payout_claims").insert(payload);

  if (error) {
    return { error: "claim_failed" };
  }

  revalidatePath("/tableau-de-bord/mes-paniers");
  return {};
}
