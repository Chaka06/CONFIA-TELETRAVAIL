"use client";

import * as React from "react";
import { LogOut } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

/**
 * Bouton de déconnexion toujours visible (pas caché dans un menu déroulant),
 * utilisé en bas des barres latérales du tableau de bord et de l'administration.
 */
export function SignOutButton({ className }: { className?: string }) {
  const [pending, startTransition] = React.useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOutAction();
    });
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50",
        className
      )}
    >
      <LogOut className="size-4" aria-hidden />
      Déconnexion
    </button>
  );
}
