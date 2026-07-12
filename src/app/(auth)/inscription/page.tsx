import { Suspense } from "react";

import { InscriptionForm } from "./inscription-form";

export default function InscriptionPage() {
  return (
    <Suspense>
      <InscriptionForm />
    </Suspense>
  );
}
