import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
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
import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  redaction_contrainte: "Rédaction encadrée",
  verification_info: "Vérification d'information",
  classification: "Classification",
  validation_contenu: "Validation de contenu",
  analyse_texte: "Analyse de texte",
  questionnaire: "Questionnaire",
  test_logique: "Test rapide",
};

export default async function AdminMissionsPage() {
  const admin = createAdminClient();

  const [{ count: validatedCount }, { count: rejectedCount }, { data: recent }] = await Promise.all([
    admin.from("mission_assignments").select("*", { count: "exact", head: true }).eq("status", "validated"),
    admin.from("mission_assignments").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    admin
      .from("mission_assignments")
      .select("id, status, reward_amount, variant_content, validated_at, profiles(first_name, last_name)")
      .in("status", ["validated", "rejected"])
      .order("validated_at", { ascending: false })
      .limit(50),
  ]);

  const total = (validatedCount ?? 0) + (rejectedCount ?? 0);
  const successRate = total > 0 ? Math.round(((validatedCount ?? 0) / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Missions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La correction des missions est entièrement automatique — aucune validation manuelle
          n&apos;est nécessaire. Cet écran sert uniquement au suivi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Missions validées" value={String(validatedCount ?? 0)} icon={CheckCircle2} accent="success" />
        <StatCard label="Missions ratées" value={String(rejectedCount ?? 0)} icon={XCircle} accent="warning" />
        <StatCard label="Taux de réussite" value={`${successRate} %`} icon={ClipboardCheck} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>50 dernières corrections</CardTitle>
        </CardHeader>
        <CardContent>
          {!recent || recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune mission corrigée pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Résultat</TableHead>
                    <TableHead className="text-right">Récompense</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((m) => {
                    const category = (m.variant_content as { category?: string } | null)?.category ?? "";
                    return (
                      <TableRow key={m.id}>
                        <TableCell>{m.profiles?.first_name} {m.profiles?.last_name}</TableCell>
                        <TableCell className="text-muted-foreground">{CATEGORY_LABEL[category] ?? category}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              m.status === "validated"
                                ? "bg-success/10 text-success"
                                : "bg-destructive/10 text-destructive"
                            }
                          >
                            {m.status === "validated" ? "Validée" : "Ratée"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {m.status === "validated" ? formatFcfa(m.reward_amount) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {m.validated_at && new Date(m.validated_at).toLocaleString("fr-FR")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
