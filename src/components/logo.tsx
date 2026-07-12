import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Logo de marque. "icon" = blason seul (favoris, espaces compacts),
 * "full" = blason + mot-symbole "Confssa" (en-têtes, pages d'authentification).
 */
export function Logo({
  variant = "full",
  className,
  priority,
}: {
  variant?: "full" | "icon";
  className?: string;
  priority?: boolean;
}) {
  if (variant === "icon") {
    return (
      <Image
        src="/logo-icon.png"
        alt="Confssa"
        width={178}
        height={134}
        priority={priority}
        className={cn("h-8 w-auto", className)}
      />
    );
  }

  return (
    <Image
      src="/logo.png"
      alt="Confssa"
      width={638}
      height={134}
      priority={priority}
      className={cn("h-8 w-auto", className)}
    />
  );
}
