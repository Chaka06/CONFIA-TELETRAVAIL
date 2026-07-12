import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="bg-primary">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-primary-foreground">
          Prêt à rejoindre votre premier panier ?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
          Créez votre compte en quelques minutes et réservez votre place dans le panier de votre choix.
        </p>
        <Button
          size="lg"
          variant="secondary"
          render={<Link href="/paniers" />}
          nativeButton={false}
          className="mt-8 gap-1.5"
        >
          Voir les paniers
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </section>
  );
}
