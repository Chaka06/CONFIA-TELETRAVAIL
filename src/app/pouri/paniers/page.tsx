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

const MODE_LABEL: Record<string, string> = { normal: "Normal", rush: "Rush" };

export default async function AdminPaniersPage() {
  await requireAdmin();
  const admin = createAdminClient();

  // Modèle "paiement unique" : un panier est une ligne persistante par
  // formule/mode (pas d'instance jetable) — elle continue au cycle suivant
  // (cycle_index) après chaque gain versé, plutôt que d'être recréée.
  const { data: paniers } = await admin
    .from("paniers")
    .select("id, mode, formule_amount, capacity, member_count, cycle_index, filled_at, draw_at, created_at")
    .order("mode")
    .order("formule_amount");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paniers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tous les paniers, avec leur état de remplissage.</p>
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formule</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Membres</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Tirage prévu</TableHead>
                  <TableHead className="text-right">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(paniers ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.formule_amount} FCFA</TableCell>
                    <TableCell>{MODE_LABEL[p.mode] ?? p.mode}</TableCell>
                    <TableCell>
                      {p.member_count} / {p.capacity}
                    </TableCell>
                    <TableCell className="text-muted-foreground">#{p.cycle_index}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.draw_at ? new Date(p.draw_at).toLocaleString("fr-FR") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.filled_at ? (
                        <Badge className="bg-success/10 text-success">Complet</Badge>
                      ) : (
                        <Badge className="bg-warning/10 text-warning">Remplissage</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
