import { Suspense } from "react";
import type { Metadata } from "next";

import { InscriptionForm } from "./inscription-form";

export const metadata: Metadata = {
  title: "Créer un compte",
  description:
    "Créez votre compte Confssa en quelques minutes et rejoignez un panier de tontine en ligne dès la confirmation de votre e-mail.",
  alternates: { canonical: "/inscription" },
};

export default function InscriptionPage() {
  return (
    <Suspense>
      <InscriptionForm />
    </Suspense>
  );
}
