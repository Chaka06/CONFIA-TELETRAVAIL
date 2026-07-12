import Link from "next/link";

import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <Logo className="h-7" />
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Plateforme professionnelle de télétravail rémunéré : missions vérifiées, règles
              transparentes, paiements sécurisés.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <p className="mb-3 font-medium text-foreground">Plateforme</p>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#comment-ca-marche" className="hover:text-foreground">Comment ça marche</a></li>
                <li><a href="#missions" className="hover:text-foreground">Missions</a></li>
                <li><a href="#parrainage" className="hover:text-foreground">Parrainage</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-medium text-foreground">Compte</p>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link href="/inscription" className="hover:text-foreground">Créer un compte</Link></li>
                <li><Link href="/connexion" className="hover:text-foreground">Connexion</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-medium text-foreground">Confiance</p>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#securite" className="hover:text-foreground">Sécurité</a></li>
                <li>
                  <a href="mailto:contact@confssa.com" className="hover:text-foreground">
                    Réclamations &amp; contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Confia. Tous droits réservés.</span>
          <div className="flex gap-4">
            <Link href="/conditions-utilisation" className="hover:text-foreground">
              Conditions d&apos;utilisation
            </Link>
            <Link href="/politique-de-confidentialite" className="hover:text-foreground">
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
