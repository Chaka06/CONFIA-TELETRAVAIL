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

  // paniers_public (vue) joint déjà paniers + formule_configs et calcule le
  // gain net après commission : une formule = une ligne, pas besoin d'un
  // second aller-retour pour recouper les instances entre elles. Seul le
  // mode "normal" est proposé ici (20 membres, cf. le texte de la page) ; le
  // mode "rush" existe en base mais n'est pas encore exposé dans cette UI.
  const [{ data: userData }, { data: paniers }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("paniers_public")
      .select("id, formule_amount, capacity, member_count, gain_net_amount")
      .eq("mode", "normal")
      .is("filled_at", null)
      .order("formule_amount"),
  ]);

  const user = userData.user;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Choisissez votre panier</h1>
            <p className="mt-3 text-muted-foreground">
              20 membres par panier, un seul dépôt à l&apos;adhésion. Dès que le panier est complet, le premier
              arrivé remporte 95% du montant total.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(paniers ?? [])
              .filter((p): p is typeof p & { id: string; formule_amount: number } => !!p.id && p.formule_amount != null)
              .map((p) => (
                <Card key={p.id}>
                  <CardHeader>
                    <CardTitle>Panier {formatFcfa(p.formule_amount)}</CardTitle>
                    <CardDescription>
                      Un dépôt unique de {formatFcfa(p.formule_amount)} à l&apos;adhésion.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-primary/5 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Gain à terme</p>
                      <p className="text-xl font-semibold text-primary">{formatFcfa(p.gain_net_amount ?? 0)}</p>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3.5" aria-hidden />
                      {p.member_count ?? 0}/{p.capacity ?? 20} membres
                    </p>
                    {user ? (
                      <JoinBasketButton panierId={p.id} amount={formatFcfa(p.formule_amount)} />
                    ) : (
                      <Button render={<Link href={`/inscription?panier=${p.id}`} />} nativeButton={false} className="w-full">
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
