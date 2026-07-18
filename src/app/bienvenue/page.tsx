import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Bienvenue",
};

export default function BienvenuePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="mb-2 size-10 text-success" aria-hidden />
          <CardTitle>Adresse e-mail confirmée</CardTitle>
          <CardDescription>
            Votre compte Confssa est actif. Vous pouvez dès maintenant rejoindre le panier de votre choix.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/paniers" />} nativeButton={false} className="w-full">
            Voir les paniers
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
