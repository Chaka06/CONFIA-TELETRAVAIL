import { CreditCard, ScrollText, Timer, Users } from "lucide-react";

const BADGES = [
  {
    icon: Users,
    title: "10 membres par panier",
    description: "Une place = un ordre d'arrivée. Premier arrivé, premier payé, sans exception.",
  },
  {
    icon: Timer,
    title: "Cotisations régulières",
    description: "Un montant fixe, à date fixe, jusqu'à ce que ce soit votre tour de recevoir le gain complet.",
  },
  {
    icon: ScrollText,
    title: "Règles écrites noir sur blanc",
    description: "Montants, échéances et ordre de passage sont annoncés avant même de rejoindre un panier.",
  },
  {
    icon: CreditCard,
    title: "Cotisations sécurisées",
    description: "Chaque cotisation transite par un agrégateur de paiement, avec traçabilité complète.",
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
