import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  token: z.string().min(10),
  phoneNumber: z.string().regex(/^\+?[0-9]{8,15}$/),
  paymentMethod: z.enum(["orange_money", "wave", "mtn_money", "moov_money"]),
});

/**
 * Point d'entrée public (sans connexion) permettant au gagnant d'un panier de
 * renseigner ses coordonnées de paiement via le lien unique reçu par e-mail.
 * Utilise le client anonyme : la RPC `submit_payout_beneficiary_info` est
 * volontairement la seule surface accordée à `anon` sur cette table.
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("submit_payout_beneficiary_info", {
    p_token: parsed.data.token,
    p_phone: parsed.data.phoneNumber,
    p_payment_method: parsed.data.paymentMethod,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  return NextResponse.json({ success: true });
}
