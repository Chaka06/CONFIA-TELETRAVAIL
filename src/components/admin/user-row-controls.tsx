"use client";

import * as React from "react";
import { toast } from "sonner";

import { adminSetUserRole, adminSetUserBanned } from "@/app/pouri/utilisateurs/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/types/database";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "user", label: "Utilisateur" },
  { value: "admin", label: "Administrateur" },
  { value: "super_admin", label: "Super administrateur" },
];

export function UserRowControls({
  userId,
  banned,
  role,
  canEditRole,
}: {
  userId: string;
  banned: boolean;
  role: AppRole;
  canEditRole: boolean;
}) {
  const [pending, startTransition] = React.useTransition();

  function handleToggleBan() {
    startTransition(async () => {
      try {
        await adminSetUserBanned(userId, !banned);
        toast.success(banned ? "Compte réactivé." : "Compte banni.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
      }
    });
  }

  function handleRoleChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      try {
        await adminSetUserRole(userId, value as AppRole);
        toast.success("Rôle mis à jour.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={banned ? "outline" : "destructive"}
        disabled={pending}
        onClick={handleToggleBan}
      >
        {banned ? "Réactiver" : "Bannir"}
      </Button>

      <Select defaultValue={role} onValueChange={handleRoleChange} disabled={!canEditRole || pending}>
        <SelectTrigger size="sm" className="w-[150px]">
          <SelectValue>{(value: AppRole) => ROLE_OPTIONS.find((o) => o.value === value)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
