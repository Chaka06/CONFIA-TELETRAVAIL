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
  active: { label: "Complet — gain à confirmer", className: "bg-success/10 text-success" },
  completed: { label: "Clôturé (gain versé)", className: "bg-primary/10 text-primary" },
  paused: { label: "En pause (place libre)", className: "bg-destructive/10 text-destructive" },
};

export default async function AdminPaniersPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: instances } = await admin
    .from("tontine_basket_instances")
    .select("id, status, member_count, created_at, filled_at, tontine_basket_types(label, capacity)")
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
                  <TableHead>Créé le</TableHead>
                  <TableHead>Complété le</TableHead>
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
                      <TableCell className="text-muted-foreground">
                        {new Date(i.created_at).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {i.filled_at ? new Date(i.filled_at).toLocaleDateString("fr-FR") : "—"}
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
