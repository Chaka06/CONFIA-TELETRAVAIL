import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default async function PolitiqueConfidentialitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader isAuthenticated={!!user} />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Politique de confidentialité</h1>
          <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : 12 juillet 2026.</p>

          <Alert className="mt-6">
            <AlertTriangle className="size-4" />
            <AlertTitle>Document provisoire</AlertTitle>
            <AlertDescription>
              Ce texte est un modèle générique décrivant fidèlement les données réellement
              collectées et traitées par la plateforme à ce jour. Il doit être relu et validé par
              un juriste avant toute mise en ligne définitive auprès du public.
            </AlertDescription>
          </Alert>

          <div className="mt-8 space-y-8">
            <Section title="1. Qui sommes-nous ?">
              <p>
                Confssa est une plateforme professionnelle de télétravail rémunéré. La présente
                politique décrit comment nous collectons, utilisons et protégeons les données
                personnelles des utilisateurs de la plateforme (les « Utilisateurs »).
              </p>
            </Section>

            <Section title="2. Données que nous collectons">
              <p>À l&apos;inscription et dans le cadre normal d&apos;utilisation du Service, nous collectons :</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Identité : prénom, nom, date de naissance ;</li>
                <li>Coordonnées : adresse e-mail, numéro de téléphone, ville de résidence ;</li>
                <li>Identifiants de connexion : mot de passe (stocké uniquement sous forme hashée, jamais en clair) ;</li>
                <li>Données d&apos;activité sur la plateforme : paniers rejoints, cotisations, gains, historique de connexion ;</li>
                <li>
                  Coordonnées de destination des gains (numéro mobile money) fournies directement par
                  l&apos;Utilisateur bénéficiaire lors de la réclamation d&apos;un gain.
                </li>
              </ul>
              <p>
                Nous ne collectons ni ne stockons aucune donnée de carte bancaire ou de compte de
                paiement : ces informations sont traitées exclusivement par notre prestataire de
                paiement tiers, dans son propre environnement sécurisé.
              </p>
            </Section>

            <Section title="3. Finalités du traitement">
              <p>Vos données sont utilisées pour :</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Créer et gérer votre compte, et vérifier votre identité et votre éligibilité (âge minimum) ;</li>
                <li>Exécuter le Service : gestion des paniers, suivi de l&apos;ordre d&apos;arrivée, traitement des cotisations et des gains ;</li>
                <li>Vous envoyer les communications nécessaires au fonctionnement du compte (code de confirmation d&apos;inscription, rappels de cotisation, notifications de gain) ;</li>
                <li>Prévenir la fraude et les abus (comptes multiples, tentatives de contournement de l&apos;ordre d&apos;arrivée) ;</li>
                <li>Répondre à vos demandes adressées à notre support.</li>
              </ul>
              <p>Nous n&apos;utilisons pas vos données à des fins de publicité ciblée et ne les vendons à aucun tiers.</p>
            </Section>

            <Section title="4. Partage des données">
              <p>Vos données peuvent être partagées, dans la stricte mesure nécessaire, avec :</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Notre prestataire de paiement, pour le traitement des dépôts et retraits ;</li>
                <li>Notre prestataire de messagerie électronique (SMTP), pour l&apos;envoi des e-mails transactionnels (code de confirmation, notifications) ;</li>
                <li>Notre hébergeur technique, pour l&apos;infrastructure de la plateforme (base de données, authentification) ;</li>
                <li>Les autorités compétentes, si la loi nous y oblige.</li>
              </ul>
            </Section>

            <Section title="5. Conservation des données">
              <p>
                Vos données sont conservées pendant toute la durée de vie de votre compte, puis
                archivées pour la durée nécessaire au respect de nos obligations légales et
                comptables (notamment relatives aux transactions financières), avant suppression ou
                anonymisation.
              </p>
            </Section>

            <Section title="6. Sécurité">
              <p>
                Nous mettons en œuvre des mesures techniques appropriées pour protéger vos
                données : chiffrement des communications (HTTPS), mots de passe stockés
                exclusivement sous forme hashée, cloisonnement strict des accès en base de données
                selon le rôle de chaque utilisateur (un utilisateur standard ne peut jamais accéder
                aux données d&apos;un autre utilisateur), et journalisation des actions
                administratives sensibles.
              </p>
            </Section>

            <Section title="7. Cookies">
              <p>
                Le Service utilise uniquement des cookies strictement nécessaires à son
                fonctionnement (maintien de votre session de connexion). Nous n&apos;utilisons aucun
                cookie de suivi publicitaire ou de mesure d&apos;audience tiers.
              </p>
            </Section>

            <Section title="8. Vos droits">
              <p>
                Vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression des
                données vous concernant, ainsi que d&apos;un droit d&apos;opposition et de portabilité
                dans les conditions prévues par la réglementation applicable. Pour exercer ces
                droits, contactez-nous à l&apos;adresse{" "}
                <a href="mailto:contact@confssa.com" className="text-primary hover:underline">
                  contact@confssa.com
                </a>
                . Nous pourrons être amenés à vous demander de justifier votre identité avant de
                donner suite à votre demande.
              </p>
            </Section>

            <Section title="9. Modification de cette politique">
              <p>
                Cette politique peut être mise à jour à tout moment. En cas de modification
                substantielle, les Utilisateurs en seront informés par les moyens de communication
                habituels de la plateforme.
              </p>
            </Section>

            <Section title="10. Contact">
              <p>
                Pour toute question relative à la présente politique de confidentialité, écrivez-nous à{" "}
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
