import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ConnexionForm } from "./connexion-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre compte Confssa pour suivre vos paniers et vos gains.",
  alternates: { canonical: "/connexion" },
};

export default async function ConnexionPage() {
  // Vérification autoritaire (réseau) plutôt que la simple présence du
  // cookie utilisée par proxy.ts : un cookie sb-*-auth-token présent mais
  // périmé ou issu d'un autre projet Supabase ne doit jamais renvoyer vers
  // /tableau-de-bord, sous peine de recréer la boucle de redirection que
  // proxy.ts (optimiste, sans réseau) ne peut pas détecter lui-même.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/tableau-de-bord");
  }

  return (
    <Suspense>
      <ConnexionForm />
    </Suspense>
  );
}
