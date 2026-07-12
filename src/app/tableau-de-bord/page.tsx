import Link from "next/link";
import { ArrowRight, Bell, ClipboardList, Layers, Users2, Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatFcfa } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TIER_STATUS_LABEL: Record<string, string> = {
  locked: "Verrouillé",
  awaiting_deposit: "Dépôt requis",
  deposit_processing: "Paiement en cours",
  in_progress: "Missions en cours",
  completed: "Terminé",
};

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: wallet }, { data: activeCycle }, { count: missionsInProgress }, { count: rightsAvailable }, { data: notifications }, { count: referralCount }] =
    await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).single(),
      supabase
        .from("mission_cycles")
        .select("*, cycle_tiers(*)")
        .eq("user_id", user.id)
        .eq("status", "in_progress")
        .order("cycle_number", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("mission_assignments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["assigned", "submitted"]),
      supabase
        .from("withdrawal_rights")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "available"),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", user.id),
    ]);

  const currentTier = activeCycle?.cycle_tiers?.find((t) => t.tier_number === activeCycle.current_tier);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aperçu de votre compte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Votre activité, votre progression et vos gains en un coup d&apos;œil.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Actif total"
          value={formatFcfa(wallet?.balance ?? 0)}
          icon={Wallet}
          accent="default"
        />
        <StatCard
          label="Palier en cours"
          value={activeCycle ? `Palier ${activeCycle.current_tier} / 4` : "—"}
          hint={activeCycle ? `Cycle n°${activeCycle.cycle_number}` : undefined}
          icon={Layers}
          accent="default"
        />
        <StatCard
          label="Missions en cours"
          value={String(missionsInProgress ?? 0)}
          icon={ClipboardList}
          accent="warning"
        />
        <StatCard
          label="Droits de retrait"
          value={String(rightsAvailable ?? 0)}
          hint={rightsAvailable ? "Disponible(s) maintenant" : undefined}
          icon={Wallet}
          accent="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Prochaine étape</CardTitle>
            <CardDescription>
              {currentTier
                ? `Palier ${currentTier.tier_number} — ${TIER_STATUS_LABEL[currentTier.status]}`
                : "Aucun palier actif pour le moment."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentTier?.status === "awaiting_deposit" && (
              <p className="text-sm text-muted-foreground">
                Effectuez le dépôt requis pour débloquer les 3 missions de ce palier.
              </p>
            )}
            {currentTier?.status === "in_progress" && (
              <p className="text-sm text-muted-foreground">
                Vos missions sont disponibles : {currentTier.missions_completed_count} / 3 validées.
              </p>
            )}
            <Button render={<Link href="/tableau-de-bord/paliers" />} nativeButton={false} className="mt-4 gap-1.5">
              Voir mes paliers
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="size-4 text-primary" aria-hidden />
              Parrainage
            </CardTitle>
            <CardDescription>{referralCount ?? 0} filleul(s) inscrit(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              render={<Link href="/tableau-de-bord/parrainage" />}
              nativeButton={false}
              className="w-full"
            >
              Voir mon parrainage
            </Button>
          </CardContent>
        </Card>
      </div>

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
