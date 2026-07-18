import { Suspense } from "react";
import type { Metadata } from "next";

import { ConnexionForm } from "./connexion-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre compte Confssa pour suivre vos paniers et vos gains.",
  alternates: { canonical: "/connexion" },
};

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionForm />
    </Suspense>
  );
}
