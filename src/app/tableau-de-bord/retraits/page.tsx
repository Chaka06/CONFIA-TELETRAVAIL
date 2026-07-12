import { AlertCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatFcfa } from "@/lib/format";
import { WithdrawalForm } from "@/components/dashboard/withdrawal-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-warning/10 text-warning" },
  processing: { label: "En traitement", className: "bg-warning/10 text-warning" },
  completed: { label: "Effectué", className: "bg-success/10 text-success" },
  rejected: { label: "Refusé", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Annulé", className: "bg-muted text-muted-foreground" },
};

export default async function RetraitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: wallet }, { data: threshold }, { data: availableRight }, { data: withdrawals }] =
    await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
      supabase.from("platform_settings").select("value").eq("key", "unrestricted_withdrawal_threshold").single(),
      supabase
        .from("withdrawal_rights")
        .select("cap_amount")
        .eq("user_id", user.id)
        .eq("status", "available")
        .order("granted_at")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("withdrawals")
        .select("id, amount, status, requested_at, processed_at, rejected_reason")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false }),
    ]);

  const balance = wallet?.balance ?? 0;
  const unrestrictedThreshold = Number(threshold?.value ?? 200000);
  const isUnrestricted = balance >= unrestrictedThreshold;
  const progressPct = Math.min(100, Math.round((balance / unrestrictedThreshold) * 100));

  const maxAmount = isUnrestricted ? balance : (availableRight?.cap_amount ?? 0);
  const canWithdraw = maxAmount > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Retraits</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque mission complète (4 paliers) débloque un droit de retrait unique de 5 000 FCFA.
          À partir de 200 000 FCFA d&apos;actif, cette limite est levée.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progression vers le retrait illimité</CardTitle>
            <CardDescription>
              {formatFcfa(balance)} / {formatFcfa(unrestrictedThreshold)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPct} />
            {isUnrestricted && (
              <p className="mt-3 text-sm font-medium text-success">
                Seuil atteint : vous pouvez retirer librement votre solde disponible.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demander un retrait</CardTitle>
            <CardDescription>
              {canWithdraw
                ? `Montant maximum disponible : ${formatFcfa(maxAmount)}`
                : "Aucun droit de retrait disponible pour le moment."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canWithdraw ? (
              <WithdrawalForm maxAmount={maxAmount} />
            ) : (
              <Alert>
                <AlertCircle className="size-4" />
                <AlertTitle>Pas encore de droit de retrait</AlertTitle>
                <AlertDescription>
                  Terminez une mission complète (4 paliers) pour débloquer un nouveau droit de retrait.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des retraits</CardTitle>
        </CardHeader>
        <CardContent>
          {!withdrawals || withdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun retrait effectué pour le moment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{new Date(w.requested_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>{formatFcfa(w.amount)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_LABEL[w.status]?.className}>
                        {STATUS_LABEL[w.status]?.label ?? w.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
