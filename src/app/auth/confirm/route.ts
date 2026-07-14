import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Point d'entrée unique des liens envoyés par e-mail (confirmation
 * d'inscription, récupération de mot de passe, changement d'adresse).
 * `verifyOtp` échange le token contre une session serveur (cookies), donc
 * l'utilisateur arrive déjà authentifié sur la page de destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next");
  // `next` n'est pas lié cryptographiquement au token : un lien légitime
  // pourrait être repris avec un `next` modifié pour rediriger, une fois la
  // session authentifiée établie, vers un site externe (hameçonnage).
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/tableau-de-bord";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      redirect(next);
    }
  }

  redirect("/connexion?erreur=lien_invalide");
}
