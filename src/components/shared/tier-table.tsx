import { CheckCircle2 } from "lucide-react";

import { formatFcfa } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TierDefinition = {
  tier_number: number;
  required_deposit_amount: number;
  mission_reward_amount: number;
  missions_per_tier: number;
};

/**
 * Tableau de transparence des 4 paliers : montre pour chacun le dépôt requis
 * (toujours un nouveau paiement externe), la rémunération par mission et
 * l'actif cumulé atteint. Utilisé sur la page d'accueil et dans le tableau
 * de bord (progression des paliers).
 */
export function TierTable({
  tiers,
  currentTier,
  className,
}: {
  tiers: TierDefinition[];
  currentTier?: number;
  className?: string;
}) {
  const rows = tiers.reduce<{ tier: TierDefinition; cumulative: number }[]>((acc, tier) => {
    const previous = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
    const cumulative =
      previous + tier.required_deposit_amount + tier.mission_reward_amount * tier.missions_per_tier;
    return [...acc, { tier, cumulative }];
  }, []);

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border", className)}>
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Palier</th>
            <th className="px-4 py-3 font-medium">Dépôt requis</th>
            <th className="px-4 py-3 font-medium">Missions</th>
            <th className="px-4 py-3 font-medium">Récompense / mission</th>
            <th className="px-4 py-3 font-medium text-right">Actif cumulé</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ tier, cumulative }) => {
            const isCurrent = currentTier === tier.tier_number;
            const isDone = currentTier !== undefined && tier.tier_number < currentTier;

            return (
              <tr
                key={tier.tier_number}
                className={cn(
                  "border-t border-border",
                  isCurrent && "bg-primary/5"
                )}
              >
                <td className="px-4 py-3 font-medium">
                  <span className="inline-flex items-center gap-2">
                    {isDone && <CheckCircle2 className="size-4 text-success" aria-hidden />}
                    Palier {tier.tier_number}
                    {isCurrent && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        En cours
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatFcfa(tier.required_deposit_amount)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {tier.missions_per_tier} missions
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatFcfa(tier.mission_reward_amount)}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {formatFcfa(cumulative)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
