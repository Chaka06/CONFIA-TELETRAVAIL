import { PiggyBank, Trophy, Users, Wallet } from "lucide-react";

import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ count: totalUsers }, { count: openPaniers }, { count: pendingPayouts }, { data: paidClaims }] =
    await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("paniers").select("*", { count: "exact", head: true }).is("filled_at", null),
      admin.from("payout_claims").select("*", { count: "exact", head: true }).eq("status", "submitted"),
      admin.from("payout_claims").select("panier_memberships(panier_id)").eq("status", "paid"),
    ]);

  const paidPanierIds = (paidClaims ?? [])
    .map((c) => c.panier_memberships?.panier_id)
    .filter((id): id is string => !!id);
  const uniquePanierIds = [...new Set(paidPanierIds)];

  const { data: panierGains } =
    uniquePanierIds.length > 0
      ? await admin.from("paniers_public").select("id, gain_net_amount").in("id", uniquePanierIds)
      : { data: [] as { id: string | null; gain_net_amount: number | null }[] };

  const gainByPanierId = new Map((panierGains ?? []).map((p) => [p.id, p.gain_net_amount ?? 0]));
  const totalPaidOut = paidPanierIds.reduce((sum, id) => sum + (gainByPanierId.get(id) ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aperçu de la plateforme</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vue d&apos;ensemble en temps réel de l&apos;activité et des actions en attente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Utilisateurs" value={String(totalUsers ?? 0)} icon={Users} />
        <StatCard label="Paniers ouverts" value={String(openPaniers ?? 0)} icon={PiggyBank} />
        <StatCard
          label="Gains à verser"
          value={String(pendingPayouts ?? 0)}
          icon={Trophy}
          accent="warning"
        />
        <StatCard label="Total versé" value={formatFcfa(totalPaidOut)} icon={Wallet} accent="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions en attente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {pendingPayouts ?? 0} gain(s) prêt(s) à verser dans « Gains à verser ».
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
