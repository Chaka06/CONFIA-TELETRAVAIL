import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { DepositRowActions } from "@/components/admin/deposit-row-actions";
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

export default async function AdminDepositsPage() {
  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("deposits")
    .select("id, amount, initiated_at, profiles(first_name, last_name, email), cycle_tiers(tier_number)")
    .eq("status", "pending")
    .order("initiated_at", { ascending: true });

  const { data: recent } = await admin
    .from("deposits")
    .select("id, amount, status, confirmed_at, initiated_at, profiles(first_name, last_name)")
    .neq("status", "pending")
    .order("initiated_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dépôts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirmez manuellement un dépôt une fois le paiement externe vérifié auprès de Genius Pay
          (utile tant que le webhook automatique n&apos;est pas branché sur un environnement réel).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>En attente de confirmation ({pending?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!pending || pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun dépôt en attente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Palier</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Initié le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      {d.profiles?.first_name} {d.profiles?.last_name}
                      <div className="text-xs text-muted-foreground">{d.profiles?.email}</div>
                    </TableCell>
                    <TableCell>Palier {d.cycle_tiers?.tier_number}</TableCell>
                    <TableCell>{formatFcfa(d.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(d.initiated_at).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DepositRowActions depositId={d.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique récent</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recent ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.profiles?.first_name} {d.profiles?.last_name}</TableCell>
                  <TableCell>{formatFcfa(d.amount)}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        d.status === "confirmed"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }
                    >
                      {d.status === "confirmed" ? "Confirmé" : "Échoué"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(d.initiated_at).toLocaleString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
