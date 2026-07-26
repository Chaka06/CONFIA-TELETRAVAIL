"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { submitPayoutClaim } from "@/app/tableau-de-bord/mes-paniers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PROVIDERS = [
  { value: "orange_money", label: "Orange Money" },
  { value: "wave", label: "Wave" },
  { value: "mtn_money", label: "MTN Money" },
  { value: "moov_money", label: "Moov Money" },
] as const;

export function PayoutClaimForm({ membershipId }: { membershipId: string }) {
  const [provider, setProvider] = React.useState<string>("");
  const [phone, setPhone] = React.useState("+225");
  const [pending, setPending] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) {
      toast.error("Choisissez un moyen de paiement.");
      return;
    }
    setPending(true);
    try {
      const { error } = await submitPayoutClaim({
        membershipId,
        mobileMoneyProvider: provider as "orange_money" | "wave" | "mtn_money" | "moov_money",
        mobileMoneyNumber: phone,
      });
      if (error) {
        toast.error("Impossible d'enregistrer vos coordonnées pour le moment.");
        return;
      }
      setSubmitted(true);
      toast.success("Coordonnées enregistrées. Votre gain sera versé sous peu.");
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <p className="rounded-lg bg-primary/10 p-3 text-sm font-medium text-primary">
        Coordonnées transmises — en attente de versement par l&apos;équipe Confssa.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">Indiquez vos coordonnées de paiement pour recevoir votre gain</p>
      <Select value={provider} onValueChange={(value) => setProvider(value ?? "")}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Moyen de paiement" />
        </SelectTrigger>
        <SelectContent>
          {PROVIDERS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+225 07 00 00 00 00"
      />
      <Button type="submit" disabled={pending} className="w-full gap-1.5">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Recevoir mon gain
      </Button>
    </form>
  );
}
