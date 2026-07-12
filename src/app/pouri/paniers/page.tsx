import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  filling: { label: "Remplissage", className: "bg-warning/10 text-warning" },
  active: { label: "Actif", className: "bg-success/10 text-success" },
  paused: { label: "En pause (place libre)", className: "bg-destructive/10 text-destructive" },
};

export default async function AdminPaniersPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: instances } = await admin
    .from("tontine_basket_instances")
    .select("id, status, member_count, round_number, round_started_on, created_at, tontine_basket_types(label, capacity)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paniers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tous les portefeuilles en cours, avec leur état de remplissage.</p>
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formule</TableHead>
                  <TableHead>Membres</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>Démarré le</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(instances ?? []).map((i) => {
                  const statusInfo = STATUS_LABEL[i.status] ?? { label: i.status, className: "" };
                  return (
                    <TableRow key={i.id}>
                      <TableCell>{i.tontine_basket_types?.label}</TableCell>
                      <TableCell>
                        {i.member_count} / {i.tontine_basket_types?.capacity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">n°{i.round_number}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {i.round_started_on ? new Date(i.round_started_on).toLocaleDateString("fr-FR") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
