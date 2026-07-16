import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getClientEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Client Supabase pour des lectures publiques en lecture seule (ex :
 * tontine_basket_types, référentiel visible de tous sans connexion),
 * depuis un Server Component. Volontairement clé anonyme + RLS actif, et
 * surtout : ne touche jamais aux cookies. `createClient()` (@/lib/supabase/server)
 * appelle `cookies()` en interne, ce qui force Next.js à rendre la route
 * dynamique même pour une simple lecture publique — ce client permet de
 * garder une page statique/ISR (ex : la page d'accueil) quand la seule
 * donnée nécessaire est publique.
 */
export function createPublicClient() {
  const env = getClientEnv();
  return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
