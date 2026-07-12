import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/tableau-de-bord", "/pouri"];
const AUTH_PREFIXES = ["/connexion", "/inscription", "/mot-de-passe-oublie"];

/**
 * Proxy s'exécute sur CHAQUE requête, y compris les préchargements
 * automatiques de liens Next.js (plusieurs par seconde dès qu'un
 * utilisateur voit la nav). Appeler supabase.auth.getUser() ici (réseau +
 * rafraîchissement du refresh token, à usage unique côté Supabase) faisait
 * entrer en compétition plusieurs requêtes concurrentes sur le même jeton :
 * une seule gagnait la rotation, toutes les autres échouaient et effaçaient
 * la session en cours de route — provoquant une boucle infinie de
 * redirections en production entre /connexion et les pages protégées.
 *
 * Proxy ne fait donc plus qu'une vérification optimiste (présence du
 * cookie de session, sans réseau ni base de données), conformément au
 * modèle recommandé pour cette version de Next.js. La vérification
 * autoritaire (session réellement valide + rôle) reste faite côté DAL, dans
 * les layouts /tableau-de-bord et /pouri (requireAdmin), seule source de
 * vérité pour l'autorisation.
 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtected && !isAuthPage) {
    return NextResponse.next();
  }

  const hasSession = hasSessionCookie(request);

  if (isProtected && !hasSession) {
    const redirectUrl = new URL("/connexion", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/tableau-de-bord", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
