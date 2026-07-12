import { Gift, Share2, Users } from "lucide-react";

export function ReferralSection() {
  return (
    <section id="parrainage" className="border-b border-border bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Gift className="size-3.5 text-primary" aria-hidden />
              Programme de parrainage
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              Un code promo unique, des commissions traçables
            </h2>
            <p className="mt-4 text-muted-foreground">
              Dès votre inscription, vous recevez un code promo personnel et permanent. Partagez-le :
              chaque filleul qui l&apos;utilise est automatiquement rattaché à votre compte.
            </p>

            <ul className="mt-6 space-y-4">
              <li className="flex gap-3">
                <Users className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span className="text-sm text-muted-foreground">
                  {"Votre filleul valide son palier 2 : "}
                  <strong className="text-foreground">{"2 000 FCFA"}</strong>
                  {" vous sont versés."}
                </span>
              </li>
              <li className="flex gap-3">
                <Share2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span className="text-sm text-muted-foreground">
                  {"Il termine son palier 4 : "}
                  <strong className="text-foreground">{"3 000 FCFA"}</strong>
                  {" supplémentaires vous sont versés."}
                </span>
              </li>
            </ul>

            <p className="mt-4 text-sm text-muted-foreground">
              {"Soit "}
              <strong className="text-foreground">{"5 000 FCFA"}</strong>
              {" au total par filleul ayant terminé une mission complète."}
              <br />
              {"Aucune commission n'est versée tant que le filleul n'a pas validé son palier 2."}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-8">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Exemple de gain de parrainage
            </p>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">Filleul valide le palier 2</span>
                <span className="font-semibold text-success">+ 2 000 FCFA</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-sm text-muted-foreground">Filleul termine le palier 4</span>
                <span className="font-semibold text-success">+ 3 000 FCFA</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium text-foreground">Total par filleul</span>
                <span className="text-lg font-semibold text-foreground">5 000 FCFA</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
