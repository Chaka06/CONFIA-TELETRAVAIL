import { FileCheck2, ScrollText, Wallet } from "lucide-react";

import { BlobImage } from "@/components/landing/blob-image";

const BADGES = [
  {
    icon: Wallet,
    title: "Dépôts toujours externes",
    description:
      "Chaque dépôt de palier provient obligatoirement d'un nouveau paiement. Vos gains ne financent jamais un dépôt.",
  },
  {
    icon: FileCheck2,
    title: "Missions vérifiées",
    description:
      "Rédaction, vérification, classification, analyse : des tâches réelles, réalisables en quelques minutes.",
  },
  {
    icon: ScrollText,
    title: "Règles écrites noir sur blanc",
    description:
      "Montants, paliers, commissions et conditions de retrait sont annoncés avant toute action, sans exception.",
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

        <div className="flex flex-col gap-3">
          <BlobImage
            variant={3}
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsdQ7neJLPpFY1R44U3KOSDjK_EC0k8zz3FDfUbjJsqyROgTfQSodj73M2&s=10"
            alt="Paiement sécurisé"
            className="size-10"
          />
          <h3 className="text-sm font-semibold text-foreground">Paiements sécurisés</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Dépôts et retraits transitent par un agrégateur de paiement, avec traçabilité complète de
            chaque opération.
          </p>
        </div>
      </div>
    </section>
  );
}
