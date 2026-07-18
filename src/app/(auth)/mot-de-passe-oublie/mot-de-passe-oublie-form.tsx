"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth";
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

export function MotDePasseOublieForm() {
  const [submitted, setSubmitted] = React.useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    const supabase = createClient();
    // Réponse volontairement identique que l'e-mail existe ou non, afin de
    // ne jamais révéler si une adresse est associée à un compte.
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reinitialiser-mot-de-passe`,
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <MailCheck className="mb-2 size-10 text-success" aria-hidden />
          <CardTitle>Vérifiez votre boîte e-mail</CardTitle>
          <CardDescription>
            Si un compte est associé à cette adresse, un lien de réinitialisation vient de lui être envoyé.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Mot de passe oublié</CardTitle>
        <CardDescription>
          Indiquez votre adresse e-mail : nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse e-mail</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Envoyer le lien de réinitialisation
            </Button>
          </form>
        </Form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/connexion" className="font-medium text-primary hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
