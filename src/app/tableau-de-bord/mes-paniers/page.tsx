import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { formatFcfa } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-success/10 text-success" },
  removed_missed_payment: { label: "Retiré (impayé)", className: "bg-destructive/10 text-destructive" },
  paid_out_left: { label: "Gagné — sorti", className: "bg-primary/10 text-primary" },
};

export default async function MesPaniersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: memberships } = await supabase
    .from("tontine_memberships")
    .select(
      `id, status, join_order, joined_at,
       tontine_basket_instances(id, status, round_number, round_started_on,
         tontine_basket_types(label, contribution_amount, payout_amount)),
       tontine_contributions(id, occurrence_number, due_date, amount, status)`
    )
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes paniers</h1>
          <p className="mt-1 text-sm text-muted-foreground">Votre position et vos échéances pour chaque panier rejoint.</p>
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
            const basketType = m.tontine_basket_instances?.tontine_basket_types;
            const nextDue = m.tontine_contributions
              ?.filter((c) => c.status === "pending")
              .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
            const statusInfo = STATUS_LABEL[m.status] ?? { label: m.status, className: "" };

            return (
              <Card key={m.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>{basketType?.label ?? "Panier"}</CardTitle>
                      <CardDescription>Gain à terme : {formatFcfa(basketType?.payout_amount ?? 0)}</CardDescription>
                    </div>
                    <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    Position dans la file : membre n°{m.join_order}
                  </p>
                  <p className="text-muted-foreground">
                    Round n°{m.tontine_basket_instances?.round_number} —{" "}
                    {m.tontine_basket_instances?.status === "filling" ? "en cours de remplissage" : "en cours"}
                  </p>

                  {m.status === "active" && nextDue && (
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="font-medium">Prochaine cotisation</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFcfa(nextDue.amount)} — due le {new Date(nextDue.due_date).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        render={<Link href={`/mes-cotisations/${nextDue.id}/payer`} />}
                        nativeButton={false}
                      >
                        Payer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
