"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const schema = z.object({
  amount: z.coerce.number().positive("Montant invalide"),
  fullName: z.string().min(2, "Nom complet requis"),
  phoneNumber: z.string().regex(/^\+?[0-9]{8,15}$/, "Numéro de téléphone invalide"),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function WithdrawalForm({ maxAmount }: { maxAmount: number }) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { amount: maxAmount, fullName: "", phoneNumber: "" },
  });

  async function onSubmit(values: FormOutput) {
    const res = await fetch("/api/withdrawals/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Impossible de traiter la demande de retrait.");
      return;
    }

    toast.success("Demande de retrait enregistrée.");
    window.location.reload();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant à retirer (FCFA)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  max={maxAmount}
                  {...field}
                  value={field.value as number}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom complet du bénéficiaire</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full gap-1.5">
          {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Demander le retrait
        </Button>
      </form>
    </Form>
  );
}
