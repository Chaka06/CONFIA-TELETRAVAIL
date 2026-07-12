"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getClientEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Client Supabase pour les Client Components. Respecte toujours les policies
 * RLS (clé anonyme + session utilisateur) : ne jamais utiliser côté client
 * pour une opération qui devrait passer par une route serveur privilégiée.
 */
export function createClient() {
  const env = getClientEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
