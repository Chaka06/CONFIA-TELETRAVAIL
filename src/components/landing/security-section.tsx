import { KeyRound, ScrollText, ShieldCheck, Sparkles } from "lucide-react";

const POINTS = [
  {
    icon: KeyRound,
    title: "Authentification robuste",
    description: "Mots de passe hachés, sessions sécurisées, protection contre les tentatives abusives de connexion.",
  },
  {
    icon: ScrollText,
    title: "Historique complet",
    description: "Chaque cotisation et chaque gain versé est journalisé avec identifiant, statut et horodatage.",
  },
  {
    icon: ShieldCheck,
    title: "Séparation stricte des rôles",
    description: "Les opérations financières sensibles sont contrôlées côté serveur, jamais laissées à la seule confiance du client.",
  },
  {
    icon: Sparkles,
    title: "Transparence des règles",
    description: "Montant, capacité et gain sont publics et identiques pour les 4 formules, avant même de rejoindre.",
  },
];

export function SecuritySection() {
  return (
    <section id="securite" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Une plateforme pensée pour la confiance
          </h2>
          <p className="mt-3 text-muted-foreground">
            Confssa applique les standards de sécurité attendus d&apos;une plateforme financière moderne.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {POINTS.map((point) => (
            <div key={point.title} className="flex items-start gap-4 rounded-xl border border-border p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <point.icon className="size-5 text-primary" aria-hidden />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{point.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{point.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
