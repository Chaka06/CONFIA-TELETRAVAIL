import { CreditCard, ScrollText, Timer, Users } from "lucide-react";

const BADGES = [
  {
    icon: Users,
    title: "20 membres par panier",
    description: "Un seul dépôt à l'adhésion. Dès que le panier est complet, le premier arrivé remporte tout.",
  },
  {
    icon: Timer,
    title: "Un paiement unique",
    description: "Pas de cotisations à répétition : vous versez une seule fois, à l'adhésion, puis vous suivez le remplissage.",
  },
  {
    icon: ScrollText,
    title: "Règles écrites noir sur blanc",
    description: "Montant, capacité et gain sont annoncés avant même de rejoindre un panier.",
  },
  {
    icon: CreditCard,
    title: "Paiements sécurisés",
    description: "Chaque dépôt transite par un agrégateur de paiement, avec traçabilité complète.",
  },
];

export function TrustBadges() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {BADGES.map((badge) => (
          <div key={badge.title} className="flex flex-col gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <badge.icon className="size-5 text-primary" aria-hidden />
            </div>
            <h3 className="text-sm font-semibold text-foreground">{badge.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{badge.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
