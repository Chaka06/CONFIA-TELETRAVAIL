import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { formatFcfa } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BasketType = {
  id: string;
  label: string;
  contribution_amount: number;
  interval_days: number;
  round_length_days: number | null;
  payout_amount: number | null;
};

export function BasketTypesSection({ basketTypes }: { basketTypes: BasketType[] }) {
  return (
    <section id="comment-ca-marche" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Comment fonctionne la tontine</h2>
          <p className="mt-3 text-muted-foreground">
            Choisissez un panier, versez un dépôt unique, et dès que 20 membres l&apos;ont rejoint, le premier
            arrivé remporte la totalité.
          </p>
        </div>

        <ol className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          <li className="rounded-xl border border-border p-5">
            <span className="text-xs font-semibold text-primary">01</span>
            <h3 className="mt-1 text-sm font-semibold text-foreground">Vous rejoignez un panier</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Un dépôt unique du montant du panier valide votre place, en un seul paiement.
            </p>
          </li>
          <li className="rounded-xl border border-border p-5">
            <span className="text-xs font-semibold text-primary">02</span>
            <h3 className="mt-1 text-sm font-semibold text-foreground">Le panier se remplit</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Vous suivez le nombre de membres inscrits en temps réel, jusqu&apos;à atteindre les 20 places.
            </p>
          </li>
          <li className="rounded-xl border border-border p-5">
            <span className="text-xs font-semibold text-primary">03</span>
            <h3 className="mt-1 text-sm font-semibold text-foreground">Le panier devient complet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Dès le 20ᵉ membre, le gagnant est désigné immédiatement : le premier arrivé dans le panier.
            </p>
          </li>
          <li className="rounded-xl border border-border p-5">
            <span className="text-xs font-semibold text-primary">04</span>
            <h3 className="mt-1 text-sm font-semibold text-foreground">Le gagnant reçoit la totalité</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Il indique son moyen de paiement et reçoit le gain complet. Chacun peut rejoindre un nouveau panier
              pour retenter.
            </p>
          </li>
        </ol>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {basketTypes.map((bt) => (
            <Card key={bt.id}>
              <CardHeader>
                <CardTitle>{bt.label}</CardTitle>
                <CardDescription>Dépôt unique de {formatFcfa(bt.contribution_amount)}.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-primary">{formatFcfa(bt.payout_amount ?? 0)}</p>
                <p className="text-xs text-muted-foreground">gain pour le gagnant</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button size="lg" render={<Link href="/paniers" />} nativeButton={false} className="gap-1.5">
            Voir tous les paniers
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}
