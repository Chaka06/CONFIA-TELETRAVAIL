import { PiggyBank, Trophy, Users, Wallet } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [{ count: totalUsers }, { count: activeBaskets }, { count: pendingPayouts }, { data: payoutSums }] =
    await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("tontine_basket_instances").select("*", { count: "exact", head: true }).eq("status", "active"),
      admin.from("tontine_payouts").select("*", { count: "exact", head: true }).eq("status", "beneficiary_info_submitted"),
      admin.from("tontine_payouts").select("amount").eq("status", "paid"),
    ]);

  const totalPaidOut = (payoutSums ?? []).reduce((sum, p) => sum + p.amount, 0);

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
        <StatCard label="Paniers actifs" value={String(activeBaskets ?? 0)} icon={PiggyBank} />
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
