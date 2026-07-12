import Link from "next/link";
import { ArrowRight, Bell, CalendarClock, PiggyBank, Trophy } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatFcfa } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ count: activeMemberships }, { data: nextDue }, { data: pendingPayouts }, { data: notifications }] =
    await Promise.all([
      supabase
        .from("tontine_memberships")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase
        .from("tontine_contributions")
        .select("due_date, amount, tontine_memberships!inner(user_id)")
        .eq("tontine_memberships.user_id", user.id)
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("tontine_payouts")
        .select("amount, status, tontine_memberships!inner(user_id)")
        .eq("tontine_memberships.user_id", user.id)
        .neq("status", "paid"),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aperçu de votre compte</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vos paniers, vos échéances et vos gains en un coup d&apos;œil.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Paniers actifs" value={String(activeMemberships ?? 0)} icon={PiggyBank} accent="default" />
        <StatCard
          label="Prochaine cotisation"
          value={nextDue ? formatFcfa(nextDue.amount) : "—"}
          hint={nextDue ? new Date(nextDue.due_date).toLocaleDateString("fr-FR") : "Aucune échéance en attente"}
          icon={CalendarClock}
          accent="warning"
        />
        <StatCard
          label="Gains en attente"
          value={String(pendingPayouts?.length ?? 0)}
          hint={pendingPayouts && pendingPayouts.length > 0 ? "À réclamer" : undefined}
          icon={Trophy}
          accent="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes paniers</CardTitle>
          <CardDescription>Suivez votre position dans la file d&apos;attente et vos échéances.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/tableau-de-bord/mes-paniers" />} nativeButton={false} className="gap-1.5">
            Voir mes paniers
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4 text-primary" aria-hidden />
            Notifications récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!notifications || notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune notification pour le moment.</p>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  </div>
                  {!n.read_at && <Badge className="shrink-0">Nouveau</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
