"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function JoinBasketButton({ basketTypeId, amount }: { basketTypeId: string; amount: string }) {
  const [pending, setPending] = React.useState(false);

  async function handleJoin() {
    setPending(true);
    try {
      const res = await fetch("/api/tontine/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basketTypeId }),
      });

      const body = (await res.json().catch(() => ({}))) as { redirectUrl?: string; error?: string };

      if (!res.ok || !body.redirectUrl) {
        toast.error(
          body.error === "already_member_of_this_basket_type"
            ? "Vous êtes déjà membre de ce panier."
            : body.error === "account_not_active"
              ? "Votre compte est suspendu : vous ne pouvez pas rejoindre de panier."
              : "Impossible de rejoindre ce panier pour le moment."
        );
        return;
      }

      window.location.href = body.redirectUrl;
    } catch {
      // Échec réseau (hors ligne, timeout...) : ne jamais laisser le bouton
      // bloqué en chargement sans retour à l'utilisateur.
      toast.error("Connexion impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={handleJoin} disabled={pending} className="w-full gap-1.5">
      {pending && <Loader2 className="size-4 animate-spin" />}
      Rejoindre — dépôt de {amount}
    </Button>
  );
}
