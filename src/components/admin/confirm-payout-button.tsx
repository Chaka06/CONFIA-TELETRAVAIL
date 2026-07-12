"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { adminConfirmPayout } from "@/app/pouri/gains/actions";

export function ConfirmPayoutButton({ payoutId }: { payoutId: string }) {
  const [pending, startTransition] = React.useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await adminConfirmPayout(payoutId);
        toast.success("Paiement confirmé.");
      } catch {
        toast.error("Impossible de confirmer ce paiement.");
      }
    });
  }

  return (
    <Button size="sm" onClick={handleConfirm} disabled={pending} className="gap-1.5">
      {pending && <Loader2 className="size-4 animate-spin" />}
      Paiement effectué
    </Button>
  );
}
