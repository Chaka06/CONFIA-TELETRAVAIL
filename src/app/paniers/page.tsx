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

export const metadata: Metadata = { title: "Paniers disponibles" };
export const revalidate = 30;

export default async function PaniersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: basketTypes } = await supabase
    .from("tontine_basket_types")
    .select("id, label, contribution_amount, interval_days, round_length_days, payout_amount, capacity")
    .eq("is_active", true)
    .order("contribution_amount");

  let openSpots: Record<string, number> = {};
  if (basketTypes) {
    const { data: instances } = await supabase
      .from("tontine_basket_instances")
      .select("basket_type_id, member_count, status")
      .in("status", ["filling", "paused"]);

    openSpots = (instances ?? []).reduce<Record<string, number>>((acc, i) => {
      const basketType = basketTypes.find((bt) => bt.id === i.basket_type_id);
      const capacity = basketType?.capacity ?? 10;
      acc[i.basket_type_id] = (acc[i.basket_type_id] ?? 0) + (capacity - i.member_count);
      return acc;
    }, {});
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader isAuthenticated={!!user} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Choisissez votre panier</h1>
            <p className="mt-3 text-muted-foreground">
              10 membres par panier, une place = un ordre d&apos;arrivée. Premier arrivé, premier payé.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(basketTypes ?? []).map((bt) => (
              <Card key={bt.id}>
                <CardHeader>
                  <CardTitle>{bt.label}</CardTitle>
                  <CardDescription>
                    Cotisation tous les {bt.interval_days} jours, round de {bt.round_length_days} jours.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/5 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Gain à terme</p>
                    <p className="text-xl font-semibold text-primary">{formatFcfa(bt.payout_amount ?? 0)}</p>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="size-3.5" aria-hidden />
                    {openSpots[bt.id] ?? bt.capacity} place(s) disponible(s)
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
