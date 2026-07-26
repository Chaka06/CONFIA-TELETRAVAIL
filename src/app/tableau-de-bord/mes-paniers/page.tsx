import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { formatFcfa } from "@/lib/format";
import { PayoutClaimForm } from "@/components/tontine/payout-claim-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  paiement_en_cours: { label: "Paiement en cours", className: "bg-warning/10 text-warning" },
  actif: { label: "Actif", className: "bg-success/10 text-success" },
  gagne_a_reclamer: { label: "Gagné — à réclamer", className: "bg-primary/10 text-primary" },
  gagne: { label: "Gagné — versé", className: "bg-primary/10 text-primary" },
  cycle_termine: { label: "Cycle terminé", className: "bg-muted text-muted-foreground" },
  retire_impaye: { label: "Retiré (impayé)", className: "bg-destructive/10 text-destructive" },
};

export default async function MesPaniersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // my_paniers est déjà filtrée sur l'utilisateur connecté (WHERE user_id =
  // auth.uid() dans la vue elle-même) : pas de filtre supplémentaire à faire.
  const { data: memberships } = await supabase
    .from("my_paniers")
    .select("*")
    .order("joined_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes paniers</h1>
          <p className="mt-1 text-sm text-muted-foreground">L&apos;état de remplissage de chaque panier rejoint.</p>
        </div>
        <Button render={<Link href="/paniers" />} nativeButton={false}>
          Rejoindre un panier
        </Button>
      </div>

      {!memberships || memberships.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Vous n&apos;avez rejoint aucun panier pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {memberships.map((m) => {
            const statusInfo = STATUS_LABEL[m.display_status ?? ""] ?? {
              label: m.display_status ?? "—",
              className: "",
            };
            const canClaim = m.membership_status === "won_pending_claim";

            return (
              <Card key={m.membership_id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>Panier {formatFcfa(m.formule_amount ?? 0)}</CardTitle>
                      <CardDescription>
                        Gain pour le gagnant : {formatFcfa(m.gain_net_amount ?? 0)}
                      </CardDescription>
                    </div>
                    <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {m.membership_status === "won_pending_payout" ? (
                    <p className="rounded-lg bg-primary/10 p-3 font-medium text-primary">
                      Coordonnées reçues — versement en cours par l&apos;équipe Confssa.
                    </p>
                  ) : m.membership_status === "paid_out" ? (
                    <p className="rounded-lg bg-primary/10 p-3 font-medium text-primary">
                      Vous avez gagné et reçu {formatFcfa(m.gain_net_amount ?? 0)} !
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Remplissage :{" "}
                      <span className="font-medium text-foreground">
                        {m.member_count ?? 0}/{m.capacity ?? 20} membres
                      </span>
                      .
                    </p>
                  )}

                  {m.membership_status === "pending_payment" && m.checkout_url && (
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="font-medium">Dépôt d&apos;adhésion à régler</p>
                        <p className="text-xs text-muted-foreground">{formatFcfa(m.formule_amount ?? 0)}</p>
                      </div>
                      <Button size="sm" render={<Link href={m.checkout_url} />} nativeButton={false}>
                        Payer
                      </Button>
                    </div>
                  )}

                  {canClaim && m.membership_id && <PayoutClaimForm membershipId={m.membership_id} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
