"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const schema = z.object({
  phoneNumber: z.string().regex(/^\+?[0-9]{8,15}$/, "Numéro de téléphone invalide"),
  paymentMethod: z.enum(["orange_money", "wave", "mtn_money", "moov_money"], {
    error: "Choisissez un moyen de paiement",
  }),
});

type FormValues = z.infer<typeof schema>;

const PAYMENT_METHODS = [
  { value: "orange_money", label: "Orange Money" },
  { value: "wave", label: "Wave" },
  { value: "mtn_money", label: "MTN Money" },
  { value: "moov_money", label: "Moov Money" },
];

export function ClaimPayoutForm({ token }: { token: string }) {
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phoneNumber: "", paymentMethod: undefined },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    let res: Response;
    try {
      res = await fetch("/api/tontine/payouts/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...values }),
      });
    } catch {
      setServerError("Connexion impossible. Vérifiez votre connexion et réessayez.");
      return;
    }

    if (!res.ok) {
      setServerError("Impossible d'enregistrer vos coordonnées. Réessayez ou contactez le support.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="text-center text-sm text-success">
        Merci ! Vos coordonnées ont été transmises, votre paiement est en cours de traitement.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro mobile money</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+225 07 00 00 00 00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Moyen de paiement</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full gap-1.5">
          {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Recevoir mon gain
        </Button>
      </form>
    </Form>
  );
}
