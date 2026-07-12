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
  const admin = createAdminClient();

  const { data: payouts } = await admin
    .from("tontine_payouts")
    .select(
      `id, amount, status, beneficiary_phone, beneficiary_payment_method, created_at,
       tontine_memberships(profiles(first_name, last_name, email)),
       tontine_basket_instances(tontine_basket_types(label))`
    )
    .neq("status", "paid")
    .order("created_at", { ascending: true });

  const toProcess = (payouts ?? []).filter((p) => p.status === "beneficiary_info_submitted");
  const waiting = (payouts ?? []).filter((p) => p.status === "pending");

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
          <CardTitle>À traiter ({toProcess.length})</CardTitle>
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
                {toProcess.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Aucun gain à traiter pour le moment.
                    </TableCell>
                  </TableRow>
                ) : (
                  toProcess.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.tontine_memberships?.profiles?.first_name} {p.tontine_memberships?.profiles?.last_name}
                        <div className="text-xs text-muted-foreground">{p.tontine_memberships?.profiles?.email}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.tontine_basket_instances?.tontine_basket_types?.label}
                      </TableCell>
                      <TableCell className="font-medium">{formatFcfa(p.amount)}</TableCell>
                      <TableCell>{p.beneficiary_phone}</TableCell>
                      <TableCell>{METHOD_LABEL[p.beneficiary_payment_method ?? ""] ?? p.beneficiary_payment_method}</TableCell>
                      <TableCell className="text-right">
                        <ConfirmPayoutButton payoutId={p.id} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>En attente du bénéficiaire ({waiting.length})</CardTitle>
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
                {waiting.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Aucun gain en attente.
                    </TableCell>
                  </TableRow>
                ) : (
                  waiting.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.tontine_memberships?.profiles?.first_name} {p.tontine_memberships?.profiles?.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.tontine_basket_instances?.tontine_basket_types?.label}
                      </TableCell>
                      <TableCell className="font-medium">{formatFcfa(p.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">En attente de ses coordonnées</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
