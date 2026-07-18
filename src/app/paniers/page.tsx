import Link from "next/link";
import type { Metadata } from "next";
import { Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatFcfa } from "@/lib/format";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { JoinBasketButton } from "@/components/tontine/join-basket-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Paniers disponibles",
  description:
    "4 formules de tontine en ligne à 1000, 3000, 5000 ou 10 000 FCFA. Rejoignez un panier de 20 membres avec un dépôt unique et suivez sa progression en temps réel.",
  alternates: { canonical: "/paniers" },
};
export const revalidate = 30;

export default async function PaniersPage() {
  const supabase = await createClient();

  // Les trois lectures sont indépendantes (instances ne filtre pas par type de
  // panier) : les paralléliser au lieu de les enchaîner évite d'attendre
  // trois allers-retours réseau l'un après l'autre.
  const [{ data: userData }, { data: basketTypes }, { data: instances }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("tontine_basket_types")
      .select("id, label, contribution_amount, interval_days, round_length_days, payout_amount, capacity")
      .eq("is_active", true)
      .order("contribution_amount"),
    supabase
      .from("tontine_basket_instances")
      .select("basket_type_id, member_count, created_at")
      .eq("status", "filling")
      .order("created_at", { ascending: true }),
  ]);

  const user = userData.user;

  // Nombre de membres inscrits sur le panier en cours de remplissage de chaque
  // formule (celui que rejoindra un nouvel arrivant : le plus ancien 'filling').
  // On n'affiche JAMAIS qui est en tête de file ni la position d'un membre :
  // seulement le compteur membres/capacité tant que le panier n'est pas plein.
  const filledCount = (instances ?? []).reduce<Record<string, number>>((acc, i) => {
    if (!(i.basket_type_id in acc)) acc[i.basket_type_id] = i.member_count;
    return acc;
  }, {});

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Choisissez votre panier</h1>
            <p className="mt-3 text-muted-foreground">
              20 membres par panier, un seul dépôt à l&apos;adhésion. Dès que le panier est complet, le premier
              arrivé remporte la totalité.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(basketTypes ?? []).map((bt) => (
              <Card key={bt.id}>
                <CardHeader>
                  <CardTitle>{bt.label}</CardTitle>
                  <CardDescription>
                    Un dépôt unique de {formatFcfa(bt.contribution_amount)} à l&apos;adhésion.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/5 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Gain à terme</p>
                    <p className="text-xl font-semibold text-primary">{formatFcfa(bt.payout_amount ?? 0)}</p>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="size-3.5" aria-hidden />
                    {filledCount[bt.id] ?? 0}/{bt.capacity ?? 20} membres
                  </p>
                  {user ? (
                    <JoinBasketButton basketTypeId={bt.id} amount={formatFcfa(bt.contribution_amount)} />
                  ) : (
                    <Button render={<Link href={`/inscription?panier=${bt.id}`} />} nativeButton={false} className="w-full">
                      Se connecter pour rejoindre
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
