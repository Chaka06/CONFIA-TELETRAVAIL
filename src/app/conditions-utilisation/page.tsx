import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions générales d'utilisation de la plateforme de tontine en ligne Confssa.",
  alternates: { canonical: "/conditions-utilisation" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function ConditionsUtilisationPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Conditions générales d&apos;utilisation</h1>
          <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : 12 juillet 2026.</p>

          <Alert className="mt-6">
            <AlertTriangle className="size-4" />
            <AlertTitle>Document provisoire</AlertTitle>
            <AlertDescription>
              Ce texte est un modèle générique rédigé pour couvrir le fonctionnement actuel de la
              plateforme. Il doit être relu et validé par un juriste avant toute mise en ligne
              définitive auprès du public.
            </AlertDescription>
          </Alert>

          <div className="mt-8 space-y-8">
            <Section title="1. Objet">
              <p>
                Les présentes conditions générales d&apos;utilisation (« CGU ») régissent l&apos;accès et
                l&apos;utilisation de la plateforme Confssa (le « Service »), qui organise des tontines
                en ligne : des paniers regroupant 20 membres, où chacun verse un dépôt unique à
                l&apos;adhésion et où, dès que le panier est complet, le premier membre arrivé remporte
                l&apos;intégralité du gain.
              </p>
              <p>
                En créant un compte, l&apos;Utilisateur reconnaît avoir lu, compris et accepté sans
                réserve l&apos;intégralité des présentes CGU ainsi que la{" "}
                <a href="/politique-de-confidentialite" className="text-primary hover:underline">
                  politique de confidentialité
                </a>
                .
              </p>
            </Section>

            <Section title="2. Éligibilité et compte utilisateur">
              <p>
                L&apos;inscription est réservée aux personnes physiques âgées d&apos;au moins 18 ans,
                capables juridiquement de contracter. L&apos;Utilisateur s&apos;engage à fournir des
                informations exactes, complètes et à jour (identité, date de naissance, ville,
                numéro de téléphone, adresse e-mail) et à les maintenir à jour.
              </p>
              <p>
                Chaque Utilisateur ne peut détenir qu&apos;un seul compte. La création de comptes
                multiples par une même personne, notamment dans le but d&apos;obtenir un ordre
                d&apos;arrivée supplémentaire dans un même panier, constitue une violation des
                présentes CGU pouvant entraîner la suspension immédiate de l&apos;ensemble des comptes
                concernés.
              </p>
              <p>
                L&apos;Utilisateur est seul responsable de la confidentialité de ses identifiants de
                connexion et de toute activité réalisée depuis son compte.
              </p>
            </Section>

            <Section title="3. Fonctionnement du Service">
              <p>
                Chaque panier propose un montant de dépôt fixe (par exemple 1 000 FCFA). Rejoindre un
                panier nécessite un dépôt unique du montant de la formule, obligatoirement effectué via
                le prestataire de paiement partenaire (jamais financé par un solde interne). Ce dépôt,
                versé une seule fois à l&apos;adhésion, valide la place de l&apos;Utilisateur dans le panier.
              </p>
              <p>
                Un panier compte 20 membres. Dès que la 20ᵉ place est occupée et payée, le panier est
                complet : l&apos;intégralité du gain est aussitôt attribuée au membre arrivé en premier
                dans ce panier. Les autres membres ne remportent pas ce panier et peuvent rejoindre un
                nouveau panier de la même formule pour retenter leur chance. Un panier complet est
                définitivement clos ; il n&apos;est ni rejoué ni réutilisé.
              </p>
              <p>
                Un dépôt d&apos;entrée réservé mais non réglé dans un délai de 24 heures est
                automatiquement annulé et la réservation libérée, sans conséquence pour l&apos;Utilisateur.
              </p>
              <p>
                Confssa se réserve le droit de faire évoluer à tout moment les montants, fréquences ou
                conditions des paniers, sous réserve d&apos;en informer les Utilisateurs, et de créer ou
                fermer des paniers selon la demande.
              </p>
            </Section>

            <Section title="4. Paiements, cotisations et gains">
              <p>
                Les cotisations sont traitées par l&apos;intermédiaire d&apos;un prestataire de paiement
                tiers agréé. Confssa ne collecte ni ne conserve aucune donnée de carte bancaire ou de
                compte de paiement : ces informations transitent exclusivement par l&apos;infrastructure
                sécurisée du prestataire de paiement.
              </p>
              <p>
                Les gains sont versés manuellement par l&apos;équipe d&apos;administration vers le moyen de
                paiement mobile money indiqué par le bénéficiaire (Orange Money, Wave, MTN Money ou
                Moov Money), après validation de ses coordonnées. Confssa se réserve le droit
                d&apos;ajuster les délais de versement, notamment en cas d&apos;indisponibilité temporaire
                d&apos;un opérateur, sans que cela ne remette en cause les sommes dues, qui restent
                acquises au bénéficiaire.
              </p>
              <p>
                Toute demande de versement doit correspondre à des coordonnées de destination
                (numéro de mobile money) appartenant réellement à l&apos;Utilisateur titulaire du compte
                bénéficiaire.
              </p>
            </Section>

            <Section title="5. Usage interdit">
              <p>Il est strictement interdit d&apos;utiliser le Service pour :</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Fournir des informations d&apos;identité fausses ou usurpées ;</li>
                <li>Créer ou tenter de créer plusieurs comptes pour multiplier son ordre d&apos;arrivée dans un même panier ;</li>
                <li>Contourner, exploiter ou tenter d&apos;exploiter une faille de sécurité ou un dysfonctionnement du Service ;</li>
                <li>Blanchir des fonds ou utiliser le Service à des fins illégales ;</li>
                <li>Revendre, céder ou partager l&apos;accès à son compte avec un tiers.</li>
              </ul>
            </Section>

            <Section title="6. Suspension et résiliation">
              <p>
                Confssa se réserve le droit de suspendre ou de résilier, à tout moment et sans
                préavis, le compte d&apos;un Utilisateur en cas de violation des présentes CGU, de
                fraude avérée ou suspectée, ou de toute utilisation abusive du Service. L&apos;Utilisateur
                peut à tout moment demander la clôture de son compte en contactant le support.
              </p>
            </Section>

            <Section title="7. Responsabilité">
              <p>
                Le Service est fourni « en l&apos;état ». Confssa met en œuvre des moyens raisonnables
                pour assurer la disponibilité et la sécurité de la plateforme, sans garantir
                l&apos;absence totale d&apos;interruption ou d&apos;erreur. Confssa ne saurait être tenue
                responsable des dommages indirects résultant de l&apos;utilisation ou de
                l&apos;impossibilité d&apos;utiliser le Service, ni des délais de traitement imputables à
                un prestataire de paiement tiers ou à un opérateur de mobile money.
              </p>
            </Section>

            <Section title="8. Propriété intellectuelle">
              <p>
                L&apos;ensemble des éléments composant le Service (marque, logo, contenus, interface,
                code source) est la propriété exclusive de Confssa ou de ses concédants et est
                protégé par les législations applicables en matière de propriété intellectuelle.
                Toute reproduction ou exploitation non autorisée est interdite.
              </p>
            </Section>

            <Section title="9. Modification des CGU">
              <p>
                Confssa peut modifier les présentes CGU à tout moment. Les Utilisateurs seront
                informés de toute modification substantielle. La poursuite de l&apos;utilisation du
                Service après modification vaut acceptation des nouvelles CGU.
              </p>
            </Section>

            <Section title="10. Droit applicable et contact">
              <p>
                Les présentes CGU sont régies par le droit ivoirien. Pour toute question relative à
                ces CGU ou au Service, vous pouvez nous contacter à l&apos;adresse{" "}
                <a href="mailto:contact@confssa.com" className="text-primary hover:underline">
                  contact@confssa.com
                </a>
                .
              </p>
            </Section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
