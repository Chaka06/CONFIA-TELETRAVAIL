import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // "server-only" lève volontairement une erreur si Next.js ne l'a pas
      // remplacé par un no-op côté bundler (protection contre les fuites de
      // code serveur vers le client). Sous Vitest, ce garde-fou n'a pas lieu
      // d'être : on le neutralise pour pouvoir tester les modules serveur.
      "server-only": path.resolve(__dirname, "./tests/mocks/server-only.ts"),
    },
  },
});
