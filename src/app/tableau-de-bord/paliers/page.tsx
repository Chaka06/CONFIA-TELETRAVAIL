import { AlertCircle, CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatFcfa } from "@/lib/format";
import { TierTable } from "@/components/shared/tier-table";
import { DepositButton } from "@/components/dashboard/deposit-button";
import { MissionCard } from "@/components/dashboard/mission-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PaliersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: tierDefinitions }, { data: activeCycle }] = await Promise.all([
    supabase
      .from("tier_definitions")
      .select("tier_number, required_deposit_amount, mission_reward_amount, missions_per_tier")
      .order("tier_number"),
    supabase
      .from("mission_cycles")
      .select("*, cycle_tiers(*)")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .order("cycle_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const currentTier = activeCycle?.cycle_tiers
    ?.slice()
    .sort((a, b) => a.tier_number - b.tier_number)
    .find((t) => t.tier_number === activeCycle.current_tier);

  const tierDefinition = tierDefinitions?.find((t) => t.tier_number === currentTier?.tier_number);

  const { data: assignments } = currentTier
    ? await supabase
        .from("mission_assignments")
        .select("id, slot_number, reward_amount, status, variant_content")
        .eq("cycle_id", activeCycle!.id)
        .eq("tier_number", currentTier.tier_number)
        .not("status", "in", "(rejected,expired)")
        .order("slot_number")
    : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paliers & missions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quatre paliers obligatoires. Chaque palier nécessite un nouveau dépôt externe — vos gains
          ne peuvent jamais financer ce dépôt.
        </p>
      </div>

      <TierTable tiers={tierDefinitions ?? []} currentTier={activeCycle?.current_tier} />

      {currentTier && tierDefinition && (
        <Card>
          <CardHeader>
            <CardTitle>Palier {currentTier.tier_number}</CardTitle>
            <CardDescription>
              {currentTier.status === "awaiting_deposit" &&
                "Un dépôt est requis pour débloquer les 3 missions de ce palier."}
              {currentTier.status === "deposit_processing" &&
                "Votre paiement est en cours de traitement par Genius Pay."}
              {currentTier.status === "in_progress" &&
                `${currentTier.missions_completed_count} / ${tierDefinition.missions_per_tier} missions validées.`}
              {currentTier.status === "completed" && "Palier terminé."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentTier.status === "awaiting_deposit" && (
              <>
                <Alert>
                  <AlertCircle className="size-4" />
                  <AlertTitle>Dépôt obligatoire</AlertTitle>
                  <AlertDescription>
                    {`Ce dépôt de ${formatFcfa(tierDefinition.required_deposit_amount)} doit provenir d'un nouveau paiement externe. Votre solde actuel ne peut pas être utilisé.`}
                  </AlertDescription>
                </Alert>
                <DepositButton
                  cycleTierId={currentTier.id}
                  amount={tierDefinition.required_deposit_amount}
                />
              </>
            )}

            {currentTier.status === "in_progress" && assignments && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {assignments.map((a) => (
                  <MissionCard key={a.id} assignment={a} />
                ))}
              </div>
            )}

            {currentTier.status === "completed" && (
              <Alert>
                <CheckCircle2 className="size-4 text-success" />
                <AlertTitle>Palier terminé</AlertTitle>
                <AlertDescription>Le palier suivant a été débloqué automatiquement.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {!activeCycle && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Aucun cycle actif</AlertTitle>
          <AlertDescription>
            Contactez le support si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
