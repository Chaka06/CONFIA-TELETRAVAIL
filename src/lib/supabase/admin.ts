import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Client Supabase "service_role" : contourne intégralement RLS.
 *
 * Réservé aux contextes serveur strictement contrôlés :
 *  - webhooks de paiement (Genius Pay) après vérification de signature,
 *  - actions d'administration après vérification explicite du rôle admin,
 *  - tâches planifiées (expiration de missions, relances, etc.).
 *
 * Ne JAMAIS importer ce module depuis un composant client ou l'exposer via
 * une route publique sans contrôle d'accès préalable — `server-only`
 * provoque une erreur de build si ce fichier est importé côté client.
 */
export function createAdminClient() {
  const env = getServerEnv();
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
