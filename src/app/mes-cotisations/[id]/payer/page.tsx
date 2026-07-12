import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { initiateContributionPayment, TontineServiceError } from "@/lib/services/tontine";

/**
 * Page de rebond utilisée par les liens des e-mails de rappel : ouvre une
 * session de paiement fraîche pour la cotisation puis redirige immédiatement
 * vers le checkout Genius Pay. Évite d'embarquer une URL de paiement qui
 * pourrait expirer entre l'envoi de l'e-mail et le clic.
 */
export default async function PayerCotisationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/connexion?redirect=/mes-cotisations/${id}/payer`);
  }

  try {
    const { redirectUrl } = await initiateContributionPayment(supabase, { contributionId: id, userId: user.id });
    redirect(redirectUrl);
  } catch (err) {
    if (err instanceof TontineServiceError) {
      redirect(`/tableau-de-bord/mes-paniers?erreur=${err.message}`);
    }
    throw err;
  }
}
