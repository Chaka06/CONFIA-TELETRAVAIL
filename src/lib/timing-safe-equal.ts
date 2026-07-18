import { timingSafeEqual } from "node:crypto";

/**
 * Compare deux secrets (jeton, signature de webhook...) en temps constant.
 * Une comparaison `===` classique sur une chaîne s'arrête au premier
 * caractère différent : le temps de réponse varie donc selon le nombre de
 * caractères corrects devinés, ce qui permet en théorie de reconstituer le
 * secret octet par octet (attaque temporelle). `timingSafeEqual` exige des
 * buffers de même longueur — un écart de longueur est donc rejeté avant
 * l'appel, ce qui fuite la longueur du secret mais jamais son contenu (un
 * compromis largement accepté).
 */
export function timingSafeStringEqual(a: string, b: string, encoding: BufferEncoding = "utf8"): boolean {
  const bufA = Buffer.from(a, encoding);
  const bufB = Buffer.from(b, encoding);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
