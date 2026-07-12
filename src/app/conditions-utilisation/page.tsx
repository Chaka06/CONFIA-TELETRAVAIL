import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
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
                l&apos;utilisation de la plateforme Confia (le « Service »), qui propose à ses
                utilisateurs (les « Utilisateurs ») d&apos;accomplir des micro-missions rémunérées en
                télétravail, organisées selon un système de progression par paliers.
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
                multiples par une même personne, notamment dans le but de contourner les règles de
                progression ou de parrainage, constitue une violation des présentes CGU pouvant
                entraîner la suspension immédiate de l&apos;ensemble des comptes concernés.
              </p>
              <p>
                L&apos;Utilisateur est seul responsable de la confidentialité de ses identifiants de
                connexion et de toute activité réalisée depuis son compte.
              </p>
            </Section>

            <Section title="3. Fonctionnement du Service">
              <p>
                L&apos;accès aux missions rémunérées est organisé en paliers progressifs. Chaque palier
                nécessite un dépôt financier préalable, obligatoirement effectué depuis une source de
                fonds externe au Service (jamais financé par le solde interne de l&apos;Utilisateur),
                via le prestataire de paiement partenaire. Une fois le dépôt confirmé, l&apos;Utilisateur
                accède à un nombre défini de missions rémunérées propres à ce palier.
              </p>
              <p>
                Les missions sont générées et corrigées automatiquement par le Service, sans
                intervention humaine dans l&apos;évaluation des réponses. Une réponse incorrecte est
                automatiquement rejetée et remplacée par une nouvelle mission, sans impact négatif
                sur le solde de l&apos;Utilisateur.
              </p>
              <p>
                Confia se réserve le droit de faire évoluer à tout moment le contenu, le nombre, la
                rémunération ou la nature des missions, ainsi que les montants et conditions des
                paliers, sous réserve d&apos;en informer les Utilisateurs.
              </p>
            </Section>

            <Section title="4. Parrainage">
              <p>
                Un Utilisateur peut parrainer d&apos;autres personnes au moyen d&apos;un code promotionnel
                personnel et unique. Des commissions de parrainage peuvent être versées lorsque le
                filleul atteint certains jalons de progression définis par le Service. Ces commissions
                ne sont dues que dans les conditions précisément définies au sein du Service et
                peuvent être révisées à tout moment pour l&apos;avenir.
              </p>
              <p>
                Toute tentative de fraude au système de parrainage (auto-parrainage, comptes
                fictifs, incitation trompeuse) entraîne l&apos;annulation des commissions concernées et
                peut donner lieu à la suspension du compte.
              </p>
            </Section>

            <Section title="5. Paiements, dépôts et retraits">
              <p>
                Les dépôts et retraits sont traités par l&apos;intermédiaire d&apos;un prestataire de
                paiement tiers agréé. Confia ne collecte ni ne conserve aucune donnée de carte
                bancaire ou de compte de paiement : ces informations transitent exclusivement par
                l&apos;infrastructure sécurisée du prestataire de paiement.
              </p>
              <p>
                Les retraits sont soumis aux règles de déblocage en vigueur sur la plateforme
                (droits de retrait associés à la progression, et/ou seuils d&apos;actif minimum), ainsi
                qu&apos;à une validation manuelle par l&apos;équipe d&apos;administration avant tout envoi
                effectif des fonds. Confia se réserve le droit de suspendre temporairement les
                retraits, en tout ou partie, notamment en cas d&apos;indisponibilité du prestataire de
                paiement pour les opérations sortantes, sans que cela ne remette en cause les
                sommes dues, qui restent acquises à l&apos;Utilisateur et exigibles dès le retour à la
                normale.
              </p>
              <p>
                Toute demande de retrait doit correspondre à des coordonnées de destination
                (numéro de mobile money ou compte bancaire) appartenant réellement à
                l&apos;Utilisateur titulaire du compte.
              </p>
            </Section>

            <Section title="6. Usage interdit">
              <p>Il est strictement interdit d&apos;utiliser le Service pour :</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Fournir des informations d&apos;identité fausses ou usurpées ;</li>
                <li>Automatiser la réalisation des missions par un script, un bot ou tout autre moyen technique non autorisé ;</li>
                <li>Contourner, exploiter ou tenter d&apos;exploiter une faille de sécurité ou un dysfonctionnement du Service ;</li>
                <li>Blanchir des fonds ou utiliser le Service à des fins illégales ;</li>
                <li>Revendre, céder ou partager l&apos;accès à son compte avec un tiers.</li>
              </ul>
            </Section>

            <Section title="7. Suspension et résiliation">
              <p>
                Confia se réserve le droit de suspendre ou de résilier, à tout moment et sans
                préavis, le compte d&apos;un Utilisateur en cas de violation des présentes CGU, de
                fraude avérée ou suspectée, ou de toute utilisation abusive du Service. L&apos;Utilisateur
                peut à tout moment demander la clôture de son compte en contactant le support.
              </p>
            </Section>

            <Section title="8. Responsabilité">
              <p>
                Le Service est fourni « en l&apos;état ». Confia met en œuvre des moyens raisonnables
                pour assurer la disponibilité et la sécurité de la plateforme, sans garantir
                l&apos;absence totale d&apos;interruption ou d&apos;erreur. Confia ne saurait être tenue
                responsable des dommages indirects résultant de l&apos;utilisation ou de
                l&apos;impossibilité d&apos;utiliser le Service, ni des délais de traitement imputables à
                un prestataire de paiement tiers ou à un opérateur de mobile money.
              </p>
            </Section>

            <Section title="9. Propriété intellectuelle">
              <p>
                L&apos;ensemble des éléments composant le Service (marque, logo, contenus, interface,
                code source) est la propriété exclusive de Confia ou de ses concédants et est
                protégé par les législations applicables en matière de propriété intellectuelle.
                Toute reproduction ou exploitation non autorisée est interdite.
              </p>
            </Section>

            <Section title="10. Modification des CGU">
              <p>
                Confia peut modifier les présentes CGU à tout moment. Les Utilisateurs seront
                informés de toute modification substantielle. La poursuite de l&apos;utilisation du
                Service après modification vaut acceptation des nouvelles CGU.
              </p>
            </Section>

            <Section title="11. Droit applicable et contact">
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
