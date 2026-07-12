import { createAdminClient } from "@/lib/supabase/admin";
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

export default async function AdminAuditPage() {
  const admin = createAdminClient();

  const { data: logs } = await admin
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, created_at, profiles(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Journal d&apos;audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          100 dernières actions administratives. Traçabilité complète, non modifiable.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Administrateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs ?? []).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      {l.profiles ? `${l.profiles.first_name} ${l.profiles.last_name}` : "Système"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{l.action}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.entity_type}
                      {l.entity_id ? ` · ${l.entity_id.slice(0, 8)}` : ""}
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
