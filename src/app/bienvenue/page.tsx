import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BienvenuePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="mb-2 size-10 text-success" aria-hidden />
          <CardTitle>Adresse e-mail confirmée</CardTitle>
          <CardDescription>
            Votre compte Confia est actif. Vous pouvez dès maintenant effectuer le dépôt de démarrage du palier 1 (2 000 FCFA) pour débloquer vos premières missions rémunérées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/tableau-de-bord" />} nativeButton={false} className="w-full">
            Accéder à mon tableau de bord
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
