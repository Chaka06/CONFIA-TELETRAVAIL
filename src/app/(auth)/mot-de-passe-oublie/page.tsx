import type { Metadata } from "next";

import { MotDePasseOublieForm } from "./mot-de-passe-oublie-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description: "Réinitialisez le mot de passe de votre compte Confssa.",
  alternates: { canonical: "/mot-de-passe-oublie" },
};

export default function MotDePasseOubliePage() {
  return <MotDePasseOublieForm />;
}
