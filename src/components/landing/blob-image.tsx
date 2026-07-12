import { cn } from "@/lib/utils";

/*
  Bordures organiques ("flaque d'eau") : chaque coin a un rayon différent
  plutôt qu'un simple arrondi régulier ou un rectangle. Appliqué en style
  inline (et non via une classe Tailwind) pour éviter que l'outil
  d'extraction de classes ne l'élimine du CSS compilé.
*/
const BLOB_RADIUS: Record<1 | 2 | 3, string> = {
  1: "63% 37% 54% 46% / 43% 37% 63% 57%",
  2: "38% 62% 63% 37% / 41% 44% 56% 59%",
  3: "56% 44% 33% 67% / 60% 38% 62% 40%",
};

export function BlobImage({
  src,
  alt,
  variant = 1,
  className,
}: {
  src: string;
  alt: string;
  variant?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-hidden", className)}
      style={{ borderRadius: BLOB_RADIUS[variant] }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}
