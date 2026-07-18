"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function ReinitialiserMotDePasseForm() {
  const router = useRouter();
  const [success, setSuccess] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setServerError(
        "Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré : demandez-en un nouveau."
      );
      return;
    }

    setSuccess(true);
    setTimeout(() => router.replace("/tableau-de-bord"), 1500);
  }

  if (success) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="mb-2 size-10 text-success" aria-hidden />
          <CardTitle>Mot de passe mis à jour</CardTitle>
          <CardDescription>Redirection vers votre tableau de bord...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Nouveau mot de passe</CardTitle>
        <CardDescription>Choisissez un nouveau mot de passe pour votre compte Confssa.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmation</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {serverError && (
              <p role="alert" className="text-sm text-destructive">
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Mettre à jour le mot de passe
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
