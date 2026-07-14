import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: "Actif", className: "bg-success/10 text-success" },
  cycle_completed: { label: "Cycle terminé", className: "bg-muted text-muted-foreground" },
  removed_missed_payment: { label: "Retiré (impayé)", className: "bg-destructive/10 text-destructive" },
  paid_out_left: { label: "Gagné — sorti", className: "bg-primary/10 text-primary" },
};

// Un panier est "plein" (gagnant déterminé) dès qu'il n'est plus 'filling'.
const FULL_STATUSES = new Set(["active", "completed"]);

export default async function MesPaniersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: memberships } = await supabase
    .from("tontine_memberships")
    .select(
      `id, status, joined_at,
       tontine_basket_instances(id, status, member_count,
         tontine_basket_types(label, contribution_amount, payout_amount, capacity)),
       tontine_contributions(id, occurrence_number, amount, status)`
    )
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  // Le nom du gagnant n'est révélé qu'une fois le panier plein. On le récupère
  // côté serveur (client admin) car la RLS n'expose jamais le profil des
  // autres membres à un utilisateur. Tant que le panier se remplit, on
  // n'affiche que le compteur membres/capacité — jamais de position.
  const fullInstanceIds = (memberships ?? [])
    .map((m) => m.tontine_basket_instances)
    .filter((i): i is NonNullable<typeof i> => !!i && FULL_STATUSES.has(i.status))
    .map((i) => i.id);

  const winnerByInstance: Record<string, { name: string; membershipId: string }> = {};
  if (fullInstanceIds.length > 0) {
    const admin = createAdminClient();
    const { data: payouts } = await admin
      .from("tontine_payouts")
      .select("basket_instance_id, membership_id, tontine_memberships(profiles(first_name, last_name))")
      .in("basket_instance_id", fullInstanceIds);

    for (const p of payouts ?? []) {
      const profile = p.tontine_memberships?.profiles;
      if (profile) {
        winnerByInstance[p.basket_instance_id] = {
          name: `${profile.first_name} ${profile.last_name?.charAt(0) ?? ""}.`.trim(),
          membershipId: p.membership_id,
        };
      }
    }
  }

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
            const instance = m.tontine_basket_instances;
            const basketType = instance?.tontine_basket_types;
            const capacity = basketType?.capacity ?? 20;
            const memberCount = instance?.member_count ?? 0;
            const isFull = !!instance && FULL_STATUSES.has(instance.status);
            const winner = instance ? winnerByInstance[instance.id] : undefined;
            const userWon = !!winner && winner.membershipId === m.id;
            const statusInfo = STATUS_LABEL[m.status] ?? { label: m.status, className: "" };

            // Dépôt d'entrée pas encore réglé (seule cotisation possible en
            // attente dans le nouveau modèle) : on propose de le régler.
            const pendingDeposit = m.tontine_contributions?.find(
              (c) => c.occurrence_number === 1 && c.status === "pending"
            );

            return (
              <Card key={m.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>{basketType?.label ?? "Panier"}</CardTitle>
                      <CardDescription>
                        Gain pour le gagnant : {formatFcfa(basketType?.payout_amount ?? 0)}
                      </CardDescription>
                    </div>
                    <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {isFull ? (
                    userWon ? (
                      <p className="rounded-lg bg-primary/10 p-3 font-medium text-primary">
                        Panier complet — vous avez gagné {formatFcfa(basketType?.payout_amount ?? 0)} !
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        Panier complet. Gagnant : <span className="font-medium text-foreground">{winner?.name ?? "—"}</span>.
                      </p>
                    )
                  ) : (
                    <p className="text-muted-foreground">
                      Remplissage : <span className="font-medium text-foreground">{memberCount}/{capacity} membres</span>.
                    </p>
                  )}

                  {pendingDeposit && (
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="font-medium">Dépôt d&apos;entrée à régler</p>
                        <p className="text-xs text-muted-foreground">{formatFcfa(pendingDeposit.amount)}</p>
                      </div>
                      <Button
                        size="sm"
                        render={<Link href={`/mes-cotisations/${pendingDeposit.id}/payer`} />}
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
