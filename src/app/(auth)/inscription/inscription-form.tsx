"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { OTP_LENGTH, signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/auth/otp-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const RESEND_COOLDOWN_SECONDS = 30;

const OTP_ERROR_MESSAGES: Record<string, string> = {
  expired: "Ce code a expiré. Demandez-en un nouveau ci-dessous.",
  too_many_attempts: "Trop de tentatives. Demandez un nouveau code ci-dessous.",
  invalid_code: "Code incorrect. Vérifiez les chiffres et réessayez.",
  no_pending_code: "Aucun code en attente. Demandez-en un nouveau ci-dessous.",
  already_verified: "Ce compte est déjà activé, vous pouvez vous connecter.",
};

export function InscriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingEmail, setPendingEmail] = React.useState<string | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const [otp, setOtp] = React.useState("");
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [verifying, setVerifying] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = React.useState(RESEND_COOLDOWN_SECONDS);

  React.useEffect(() => {
    if (!pendingEmail || resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [pendingEmail, resendCooldown]);

  const verifyOtp = React.useCallback(
    async (code: string) => {
      if (!pendingEmail || code.length !== OTP_LENGTH || verifying) return;
      setOtpError(null);
      setVerifying(true);

      const res = await fetch("/api/auth/signup-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, code }),
      });
      const body = (await res.json().catch(() => ({}))) as { tokenHash?: string; error?: string };

      if (!res.ok || !body.tokenHash) {
        setVerifying(false);
        setOtpError(OTP_ERROR_MESSAGES[body.error ?? ""] ?? "Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: body.tokenHash });

      setVerifying(false);

      if (error) {
        setOtpError("Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      router.replace("/bienvenue");
      router.refresh();
    },
    [pendingEmail, router, verifying]
  );

  async function handleResend() {
    if (!pendingEmail || resendCooldown > 0) return;
    setResendMessage(null);
    setOtpError(null);
    setResending(true);

    const res = await fetch("/api/auth/signup-otp/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingEmail }),
    });

    setResending(false);

    if (!res.ok) {
      setResendMessage("Impossible de renvoyer le code pour le moment. Réessayez dans quelques instants.");
      return;
    }

    setOtp("");
    setResendMessage("Un nouveau code vient d'être envoyé.");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      dateOfBirth: "",
      city: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      referralCode: searchParams.get("ref")?.toUpperCase() ?? "",
      acceptTerms: undefined as unknown as true,
    },
  });

  async function onSubmit(values: SignUpInput) {
    setServerError(null);

    const res = await fetch("/api/auth/signup-otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setServerError(
        body.error === "already_registered"
          ? "Un compte existe déjà avec cette adresse e-mail."
          : "Une erreur est survenue. Veuillez réessayer."
      );
      return;
    }

    setOtp("");
    setOtpError(null);
    setResendMessage(null);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setPendingEmail(values.email);
  }

  if (pendingEmail) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <MailCheck className="mb-2 size-10 text-primary" aria-hidden />
          <CardTitle>Vérifiez votre e-mail</CardTitle>
          <CardDescription>
            Nous avons envoyé un code à 6 chiffres à <span className="font-medium text-foreground">{pendingEmail}</span>. Saisissez-le ci-dessous pour activer votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <OtpInput
            length={OTP_LENGTH}
            value={otp}
            onChange={(next) => {
              setOtp(next);
              setOtpError(null);
              if (next.length === OTP_LENGTH) void verifyOtp(next);
            }}
            disabled={verifying}
            autoFocus
          />

          {otpError && (
            <p role="alert" className="text-center text-sm text-destructive">
              {otpError}
            </p>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={otp.length !== OTP_LENGTH || verifying}
            onClick={() => void verifyOtp(otp)}
          >
            {verifying && <Loader2 className="size-4 animate-spin" />}
            Valider mon compte
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Vous n&apos;avez pas reçu de code ?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
            >
              {resending
                ? "Envoi en cours…"
                : resendCooldown > 0
                  ? `Renvoyer le code (${resendCooldown}s)`
                  : "Renvoyer le code"}
            </button>
          </div>

          {resendMessage && (
            <p className="text-center text-sm text-muted-foreground">{resendMessage}</p>
          )}

          <button
            type="button"
            onClick={() => setPendingEmail(null)}
            className="block w-full text-center text-xs text-muted-foreground hover:underline"
          >
            Mauvaise adresse e-mail ? Revenir au formulaire
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Créer votre compte</CardTitle>
        <CardDescription>
          Renseignez vos informations pour rejoindre Confia. Toutes les données sont utilisées uniquement dans le cadre du fonctionnement de la plateforme.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input autoComplete="given-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input autoComplete="family-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de naissance</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville de résidence</FormLabel>
                    <FormControl>
                      <Input autoComplete="address-level2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de téléphone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+225 07 00 00 00 00" autoComplete="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="referralCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code promo (facultatif)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex : 3G8J8GDQ"
                      className="uppercase"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <div className="space-y-0.5 leading-none">
                    <FormLabel className="font-normal">
                      J&apos;accepte les{" "}
                      <Link href="/conditions-utilisation" target="_blank" className="text-primary hover:underline">
                        conditions d&apos;utilisation
                      </Link>{" "}
                      et la{" "}
                      <Link href="/politique-de-confidentialite" target="_blank" className="text-primary hover:underline">
                        politique de confidentialité
                      </Link>{" "}
                      de Confia.
                    </FormLabel>
                    <FormMessage />
                  </div>
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
              Créer mon compte
            </Button>
          </form>
        </Form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link href="/connexion" className="font-medium text-primary hover:underline">
            Connectez-vous
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
