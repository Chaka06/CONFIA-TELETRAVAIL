import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BlobImage } from "@/components/landing/blob-image";

export function Hero() {
  return (
    <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden />
              Tontine en ligne, simple et transparente
            </span>

            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Cotisez à plusieurs, soyez payé chacun votre tour.
            </h1>

            <p className="mt-5 text-balance text-lg leading-relaxed text-muted-foreground">
              Confssa organise votre tontine en ligne : rejoignez un panier de 10 membres,
              cotisez à date fixe, et recevez l&apos;intégralité du gain quand c&apos;est votre tour —
              premier arrivé, premier payé.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Button size="lg" render={<Link href="/paniers" />} nativeButton={false} className="gap-1.5">
                Voir les paniers
                <ArrowRight className="size-4" aria-hidden />
              </Button>
              <Button size="lg" variant="outline" render={<a href="#comment-ca-marche" />} nativeButton={false}>
                Comprendre le fonctionnement
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              À partir de 1 000 FCFA tous les 2 jours. Aucun engagement caché.
            </p>
          </div>

          <BlobImage
            variant={1}
            src="https://photos.tf1info.fr/images/613/345/photo-billets-franc-cfa-5ddd11-0@1x.jpeg"
            alt="Billets de francs CFA"
            className="mx-auto aspect-[4/3] w-full max-w-md shadow-xl shadow-primary/10 lg:max-w-none"
          />
        </div>
      </div>
    </section>
  );
}
