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
              Plateforme professionnelle de télétravail rémunéré
            </span>

            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Des missions rémunérées, une progression claire, des retraits transparents.
            </h1>

            <p className="mt-5 text-balance text-lg leading-relaxed text-muted-foreground">
              Confssa structure le télétravail rémunéré autour de missions courtes et vérifiées,
              d&apos;une progression par paliers expliquée à l&apos;avance et de règles financières
              identiques pour tous — sans zone d&apos;ombre.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Button size="lg" render={<Link href="/inscription" />} nativeButton={false} className="gap-1.5">
                Créer mon compte
                <ArrowRight className="size-4" aria-hidden />
              </Button>
              <Button size="lg" variant="outline" render={<a href="#comment-ca-marche" />} nativeButton={false}>
                Comprendre le fonctionnement
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Premier dépôt : 2 000 FCFA pour débloquer le palier 1. Aucun engagement caché.
            </p>
          </div>

          <BlobImage
            variant={1}
            src="https://f.hellowork.com/edito/sites/3/2025/10/teletravail-etude-demission.jpg"
            alt="Personne en situation de télétravail"
            className="mx-auto aspect-[4/3] w-full max-w-md shadow-xl shadow-primary/10 lg:max-w-none"
          />
        </div>
      </div>
    </section>
  );
}
