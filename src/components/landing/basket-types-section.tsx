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
            Choisissez un panier, cotisez à date fixe avec 9 autres membres, et recevez le gain complet à votre tour.
          </p>
        </div>

        <ol className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          <li className="rounded-xl border border-border p-5">
            <span className="text-xs font-semibold text-primary">01</span>
            <h3 className="mt-1 text-sm font-semibold text-foreground">Vous rejoignez un panier</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Un dépôt du montant du panier réserve votre place et votre ordre d&apos;arrivée.
            </p>
          </li>
          <li className="rounded-xl border border-border p-5">
            <span className="text-xs font-semibold text-primary">02</span>
            <h3 className="mt-1 text-sm font-semibold text-foreground">Le panier se remplit</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Dès que 10 membres ont rejoint, les cotisations démarrent le lendemain, à échéance fixe.
            </p>
          </li>
          <li className="rounded-xl border border-border p-5">
            <span className="text-xs font-semibold text-primary">03</span>
            <h3 className="mt-1 text-sm font-semibold text-foreground">Vous cotisez à chaque échéance</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Un rappel par e-mail à chaque date de dépôt. Un impayé libère automatiquement votre place.
            </p>
          </li>
          <li className="rounded-xl border border-border p-5">
            <span className="text-xs font-semibold text-primary">04</span>
            <h3 className="mt-1 text-sm font-semibold text-foreground">Vous recevez votre gain à votre tour</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Premier arrivé, premier payé : le gain complet du round vous revient intégralement.
            </p>
          </li>
        </ol>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {basketTypes.map((bt) => (
            <Card key={bt.id}>
              <CardHeader>
                <CardTitle>{bt.label}</CardTitle>
                <CardDescription>Tous les {bt.interval_days} jours, sur {bt.round_length_days ?? 0} jours.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-primary">{formatFcfa(bt.payout_amount ?? 0)}</p>
                <p className="text-xs text-muted-foreground">gain à terme</p>
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
