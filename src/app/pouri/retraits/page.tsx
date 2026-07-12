import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { WithdrawalRowActions } from "@/components/admin/withdrawal-row-actions";
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
import type { Json } from "@/types/database";

type Destination = { phone_number?: string; full_name?: string };

export default async function AdminWithdrawalsPage() {
  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("withdrawals")
    .select("id, amount, destination_details, requested_at, profiles!withdrawals_user_id_fkey(first_name, last_name, email)")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  const { data: recent } = await admin
    .from("withdrawals")
    .select("id, amount, status, processed_at, requested_at, profiles!withdrawals_user_id_fkey(first_name, last_name)")
    .neq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Retraits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Traitez les demandes de retrait après vérification de l&apos;éligibilité et du destinataire.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>En attente de traitement ({pending?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!pending || pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun retrait en attente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Demandé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((w) => {
                  const destination = (w.destination_details as Json as Destination) ?? {};
                  return (
                    <TableRow key={w.id}>
                      <TableCell>
                        {w.profiles?.first_name} {w.profiles?.last_name}
                        <div className="text-xs text-muted-foreground">{w.profiles?.email}</div>
                      </TableCell>
                      <TableCell>
                        {destination.full_name}
                        <div className="text-xs text-muted-foreground">{destination.phone_number}</div>
                      </TableCell>
                      <TableCell>{formatFcfa(w.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(w.requested_at).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <WithdrawalRowActions withdrawalId={w.id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
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
              {(recent ?? []).map((w) => (
                <TableRow key={w.id}>
                  <TableCell>{w.profiles?.first_name} {w.profiles?.last_name}</TableCell>
                  <TableCell>{formatFcfa(w.amount)}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        w.status === "completed"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }
                    >
                      {w.status === "completed" ? "Effectué" : "Refusé"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(w.requested_at).toLocaleString("fr-FR")}
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
