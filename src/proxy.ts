import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getClientEnv } from "@/lib/env";

const PROTECTED_PREFIXES = ["/tableau-de-bord", "/pouri"];
const AUTH_PREFIXES = ["/connexion", "/inscription", "/mot-de-passe-oublie"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = getClientEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `getUser()` peut avoir rafraîchi la session expirée et préparé de
  // nouveaux cookies (rotation du refresh token) via `setAll` ci-dessus,
  // qui n'atterrissent que sur `response`. Toute redirection ci-dessous doit
  // impérativement les reporter sur sa propre réponse — sinon le navigateur
  // ne reçoit jamais le nouveau refresh token, renvoie l'ancien (déjà
  // invalidé côté serveur) à la requête suivante, et boucle indéfiniment
  // entre /connexion et la page protégée.
  const redirect = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  };

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const redirectUrl = new URL("/connexion", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return redirect(redirectUrl);
  }

  if (isAuthPage && user) {
    return redirect(new URL("/tableau-de-bord", request.url));
  }

  if (pathname.startsWith("/pouri") && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return redirect(new URL("/tableau-de-bord", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
