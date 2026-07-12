import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClaimPayoutForm } from "./claim-payout-form";

export default async function ClaimPayoutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: payout } = await admin
    .from("tontine_payouts")
    .select("status, amount, tontine_basket_instances(tontine_basket_types(label))")
    .eq("beneficiary_token", token)
    .maybeSingle();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CardTitle>Réclamer votre gain</CardTitle>
          {payout && (
            <CardDescription>
              {payout.tontine_basket_instances?.tontine_basket_types?.label} — {formatFcfa(payout.amount)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!payout ? (
            <p className="text-center text-sm text-muted-foreground">Ce lien est invalide ou a expiré.</p>
          ) : payout.status === "pending" ? (
            <ClaimPayoutForm token={token} />
          ) : payout.status === "beneficiary_info_submitted" ? (
            <p className="text-center text-sm text-muted-foreground">
              Vos coordonnées ont bien été reçues. Votre paiement est en cours de traitement.
            </p>
          ) : (
            <p className="text-center text-sm text-success">Ce gain a déjà été versé. Merci de votre confiance !</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
