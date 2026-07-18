import type { Metadata } from "next";

import { ReinitialiserMotDePasseForm } from "./reinitialiser-mot-de-passe-form";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  robots: { index: false, follow: false },
};

export default function ReinitialiserMotDePassePage() {
  return <ReinitialiserMotDePasseForm />;
}
