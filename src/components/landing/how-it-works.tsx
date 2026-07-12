import { formatFcfa } from "@/lib/format";
import { TierTable, type TierDefinition } from "@/components/shared/tier-table";

const STEPS = [
  {
    number: "01",
    title: "Vous effectuez un dépôt",
    description:
      "Chaque palier démarre par un dépôt obligatoire, réglé via l'agrégateur de paiement. Ce dépôt provient toujours d'un nouveau paiement externe, jamais de votre solde.",
  },
  {
    number: "02",
    title: "Vous réalisez 3 missions",
    description:
      "Une fois le dépôt confirmé, 3 missions rémunérées vous sont attribuées. Chaque mission est unique : personne ne reçoit exactement le même contenu.",
  },
  {
    number: "03",
    title: "Le palier suivant se débloque",
    description:
      "Après validation des 3 missions, le palier suivant s'ouvre automatiquement, avec un nouveau montant de dépôt et une récompense par mission plus élevée.",
  },
  {
    number: "04",
    title: "Une mission complète = un droit de retrait",
    description:
      "Après les 4 paliers, un droit de retrait unique de 5 000 FCFA est débloqué. Au-delà de 200 000 FCFA d'actif, cette limite est levée : vous retirez librement.",
  },
];

export function HowItWorks({ tiers }: { tiers: TierDefinition[] }) {
  return (
    <section id="comment-ca-marche" className="border-b border-border bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Comment fonctionne la progression
          </h2>
          <p className="mt-3 text-muted-foreground">
            Quatre paliers, chacun avec un dépôt et une rémunération connus à l&apos;avance.
            Aucune surprise, aucune règle cachée.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.number} className="rounded-xl border border-border bg-background p-5">
              <span className="text-xs font-semibold text-primary">{step.number}</span>
              <h3 className="mt-2 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <h3 className="mb-4 text-center text-lg font-semibold text-foreground">
            Détail des 4 paliers
          </h3>
          <TierTable tiers={tiers} className="mx-auto max-w-3xl bg-background" />
          {tiers.length > 0 && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              À la fin des 4 paliers, votre actif atteint{" "}
              <span className="font-semibold text-foreground">
                {formatFcfa(
                  tiers.reduce(
                    (sum, t) => sum + t.required_deposit_amount + t.mission_reward_amount * t.missions_per_tier,
                    0
                  )
                )}
              </span>
              , et un droit de retrait est débloqué.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
