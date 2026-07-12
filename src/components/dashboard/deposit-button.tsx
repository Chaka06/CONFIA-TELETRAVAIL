"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function DepositButton({ cycleTierId, amount }: { cycleTierId: string; amount: number }) {
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/deposits/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleTierId }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Impossible d'initier le dépôt pour le moment.");
        setLoading(false);
        return;
      }

      window.location.href = json.redirectUrl;
    } catch {
      toast.error("Une erreur réseau est survenue. Veuillez réessayer.");
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} className="gap-1.5">
      {loading && <Loader2 className="size-4 animate-spin" />}
      Effectuer le dépôt ({new Intl.NumberFormat("fr-FR").format(amount)} FCFA)
    </Button>
  );
}
