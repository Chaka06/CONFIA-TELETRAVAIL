import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  accent?: "default" | "success" | "warning";
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            accent === "success" && "bg-success/10",
            accent === "warning" && "bg-warning/10",
            accent === "default" && "bg-primary/10"
          )}
        >
          <Icon
            className={cn(
              "size-4.5",
              accent === "success" && "text-success",
              accent === "warning" && "text-warning",
              accent === "default" && "text-primary"
            )}
            aria-hidden
          />
        </div>
      </CardContent>
    </Card>
  );
}
