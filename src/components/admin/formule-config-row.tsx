"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { adminUpdateFormuleConfig } from "@/app/pouri/parametres/actions";
import { formatFcfa } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FormuleConfigRow({
  mode,
  formuleAmount,
  capacity,
  commissionBps,
  drawDelayHours,
  readOnly,
}: {
  mode: "normal" | "rush";
  formuleAmount: number;
  capacity: number;
  commissionBps: number;
  drawDelayHours: number;
  readOnly: boolean;
}) {
  const [commission, setCommission] = React.useState(String(commissionBps / 100));
  const [delay, setDelay] = React.useState(String(drawDelayHours));
  const [pending, startTransition] = React.useTransition();

  function save() {
    const commissionBpsValue = Math.round(Number(commission) * 100);
    const drawDelayValue = Number(delay);

    if (!Number.isFinite(commissionBpsValue) || !Number.isFinite(drawDelayValue)) {
      toast.error("Valeurs invalides.");
      return;
    }

    startTransition(async () => {
      try {
        await adminUpdateFormuleConfig({
          mode,
          formuleAmount,
          commissionBps: commissionBpsValue,
          drawDelayHours: drawDelayValue,
        });
        toast.success("Formule mise à jour.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
        setCommission(String(commissionBps / 100));
        setDelay(String(drawDelayHours));
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          Panier {formatFcfa(formuleAmount)} — {mode === "normal" ? "Normal" : "Rush"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{capacity} places</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative">
          <Input
            type="number"
            step="0.1"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            disabled={readOnly}
            className="w-24 pr-8"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
            %
          </span>
        </div>
        <div className="relative">
          <Input
            type="number"
            value={delay}
            onChange={(e) => setDelay(e.target.value)}
            disabled={readOnly}
            className="w-24 pr-12"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
            heures
          </span>
        </div>
        {!readOnly && (
          <Button size="icon" variant="outline" onClick={save} disabled={pending} aria-label="Enregistrer">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
