"use client";

import * as React from "react";
import { toast } from "sonner";

import { adminSetUserRole, adminSetUserStatus } from "@/app/pouri/utilisateurs/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/types/database";

type AccountStatus = Database["public"]["Enums"]["account_status"];
type AppRole = Database["public"]["Enums"]["app_role"];

const STATUS_OPTIONS: { value: AccountStatus; label: string }[] = [
  { value: "active", label: "Actif" },
  { value: "suspended", label: "Suspendu" },
  { value: "banned", label: "Banni" },
];

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "user", label: "Utilisateur" },
  { value: "admin", label: "Administrateur" },
  { value: "super_admin", label: "Super administrateur" },
];

export function UserRowControls({
  userId,
  status,
  role,
  canEditRole,
}: {
  userId: string;
  status: AccountStatus;
  role: AppRole;
  canEditRole: boolean;
}) {
  const [, startTransition] = React.useTransition();

  function handleStatusChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      try {
        await adminSetUserStatus(userId, value as AccountStatus);
        toast.success("Statut mis à jour.");
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
      <Select defaultValue={status} onValueChange={handleStatusChange}>
        <SelectTrigger size="sm" className="w-[110px]">
          <SelectValue>
            {(value: AccountStatus) => STATUS_OPTIONS.find((o) => o.value === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={role} onValueChange={handleRoleChange} disabled={!canEditRole}>
        <SelectTrigger size="sm" className="w-[150px]">
          <SelectValue>
            {(value: AppRole) => ROLE_OPTIONS.find((o) => o.value === value)?.label}
          </SelectValue>
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
