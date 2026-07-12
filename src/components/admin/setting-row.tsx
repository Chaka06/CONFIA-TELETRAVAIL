"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { adminUpdateSetting } from "@/app/pouri/parametres/actions";
import { getSettingDisplay } from "@/lib/admin/settings-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function SettingRow({
  settingKey,
  initialValue,
  description,
  readOnly,
}: {
  settingKey: string;
  initialValue: string;
  description: string | null;
  readOnly: boolean;
}) {
  const [value, setValue] = React.useState(initialValue);
  const [pending, startTransition] = React.useTransition();
  const { label, type } = getSettingDisplay(settingKey);

  function save(newValue: string) {
    startTransition(async () => {
      try {
        await adminUpdateSetting(settingKey, newValue);
        toast.success("Paramètre mis à jour.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
        setValue(initialValue);
      }
    });
  }

  function handleBooleanChange(checked: boolean) {
    const newValue = checked ? "true" : "false";
    setValue(newValue);
    save(newValue);
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>

      {type === "boolean" ? (
        <Switch checked={value === "true"} onCheckedChange={handleBooleanChange} disabled={readOnly || pending} />
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={readOnly}
              className="w-32 pr-14"
            />
            {(type === "amount" || type === "duration_hours") && (
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                {type === "amount" ? "FCFA" : "heures"}
              </span>
            )}
          </div>
          {!readOnly && (
            <Button
              size="icon"
              variant="outline"
              onClick={() => save(value)}
              disabled={pending}
              aria-label="Enregistrer"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
