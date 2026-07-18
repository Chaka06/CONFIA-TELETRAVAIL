/**
 * Valide qu'une destination de redirection fournie par le client (paramètre
 * d'URL, jamais lié cryptographiquement à quoi que ce soit) est un chemin
 * interne relatif, jamais une adresse externe — sinon un lien du type
 * `?redirect=https://site-piege.com` ou `?redirect=//site-piege.com`
 * permettrait de rediriger un utilisateur qui vient de s'authentifier
 * légitimement vers un site externe (open redirect / hameçonnage).
 *
 * Rejette aussi le contournement par barre oblique inversée
 * (`/\site-piege.com`), que certains navigateurs normalisent en `//` —
 * donc en URL protocole-relative — avant de suivre la redirection.
 */
export function getSafeRedirectPath(candidate: string | null | undefined, fallback: string): string {
  if (!candidate) return fallback;
  return /^\/(?!\/|\\)/.test(candidate) ? candidate : fallback;
}
