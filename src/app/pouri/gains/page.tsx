import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmPayoutButton } from "@/components/admin/confirm-payout-button";

const METHOD_LABEL: Record<string, string> = {
  orange_money: "Orange Money",
  wave: "Wave",
  mtn_money: "MTN Money",
  moov_money: "Moov Money",
};

export default async function AdminGainsPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: claims }, { data: waitingMemberships }] = await Promise.all([
    admin
      .from("payout_claims")
      .select("id, mobile_money_number, mobile_money_provider, submitted_at, panier_memberships(user_id, panier_id)")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: true }),
    admin
      .from("panier_memberships")
      .select("id, user_id, panier_id, joined_at")
      .eq("status", "won_pending_claim")
      .order("joined_at", { ascending: true }),
  ]);

  const userIds = [
    ...(claims ?? []).map((c) => c.panier_memberships?.user_id).filter((v): v is string => !!v),
    ...(waitingMemberships ?? []).map((m) => m.user_id),
  ];
  const panierIds = [
    ...(claims ?? []).map((c) => c.panier_memberships?.panier_id).filter((v): v is string => !!v),
    ...(waitingMemberships ?? []).map((m) => m.panier_id),
  ];

  const [{ data: profiles }, { data: paniers }] = await Promise.all([
    userIds.length > 0
      ? admin.from("profiles").select("id, first_name, last_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
    panierIds.length > 0
      ? admin.from("paniers_public").select("id, formule_amount, gain_net_amount").in("id", panierIds)
      : Promise.resolve({ data: [] as { id: string; formule_amount: number | null; gain_net_amount: number | null }[] }),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const panierById = new Map((paniers ?? []).map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gains à verser</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Effectuez le virement vous-même (Orange Money/Wave/MTN/Moov), puis confirmez ici.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>À traiter ({(claims ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Panier</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Moyen</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(claims ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Aucun gain à traiter pour le moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  (claims ?? []).map((c) => {
                    const profile = c.panier_memberships?.user_id ? profileById.get(c.panier_memberships.user_id) : undefined;
                    const panier = c.panier_memberships?.panier_id ? panierById.get(c.panier_memberships.panier_id) : undefined;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          {profile?.first_name} {profile?.last_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          Panier {formatFcfa(panier?.formule_amount ?? 0)}
                        </TableCell>
                        <TableCell className="font-medium">{formatFcfa(panier?.gain_net_amount ?? 0)}</TableCell>
                        <TableCell>{c.mobile_money_number}</TableCell>
                        <TableCell>{METHOD_LABEL[c.mobile_money_provider] ?? c.mobile_money_provider}</TableCell>
                        <TableCell className="text-right">
                          <ConfirmPayoutButton payoutId={c.id} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>En attente du bénéficiaire ({(waitingMemberships ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead>Panier</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(waitingMemberships ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Aucun gain en attente.
                    </TableCell>
                  </TableRow>
                ) : (
                  (waitingMemberships ?? []).map((m) => {
                    const profile = profileById.get(m.user_id);
                    const panier = panierById.get(m.panier_id);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          {profile?.first_name} {profile?.last_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          Panier {formatFcfa(panier?.formule_amount ?? 0)}
                        </TableCell>
                        <TableCell className="font-medium">{formatFcfa(panier?.gain_net_amount ?? 0)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">En attente de ses coordonnées</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
