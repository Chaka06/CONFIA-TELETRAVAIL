import { ClipboardCheck, Users, Wallet, WalletCards } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: pendingDeposits },
    { count: validatedMissions },
    { count: pendingWithdrawals },
    { data: walletSums },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("deposits").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("mission_assignments").select("*", { count: "exact", head: true }).eq("status", "validated"),
    admin.from("withdrawals").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("wallets").select("balance"),
  ]);

  const totalBalance = (walletSums ?? []).reduce((sum, w) => sum + w.balance, 0);

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
        <StatCard
          label="Dépôts en attente"
          value={String(pendingDeposits ?? 0)}
          icon={Wallet}
          accent="warning"
        />
        <StatCard
          label="Missions validées"
          value={String(validatedMissions ?? 0)}
          icon={ClipboardCheck}
        />
        <StatCard
          label="Retraits en attente"
          value={String(pendingWithdrawals ?? 0)}
          icon={WalletCards}
          accent="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actif total détenu par les utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">{formatFcfa(totalBalance)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
