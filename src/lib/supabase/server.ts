import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getClientEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Client Supabase pour Server Components / Server Actions / Route Handlers.
 * Utilise la session de l'utilisateur (cookies) : soumis à RLS comme le
 * client navigateur. C'est le client à utiliser pour toute lecture/écriture
 * qui doit rester bornée aux données de l'utilisateur courant.
 */
export async function createClient() {
  const env = getClientEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Appelé depuis un Server Component : les cookies sont en
            // lecture seule. Le middleware se charge du rafraîchissement de
            // session, cette erreur est donc sans conséquence.
          }
        },
      },
    }
  );
}
