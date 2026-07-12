"use client";

import * as React from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { formatFcfa } from "@/lib/format";
import {
  buildSubmissionData,
  isAnswerComplete,
  MissionAnswerInput,
  type MissionContent,
} from "@/components/dashboard/mission-answer-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Json } from "@/types/database";

type MissionAssignment = {
  id: string;
  slot_number: number;
  reward_amount: number;
  status: string;
  variant_content: Json;
};

type VariantContent = MissionContent & { title?: string; category?: string; instructions?: string };

function asVariantContent(content: Json): VariantContent {
  return (content as VariantContent | null) ?? {};
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  assigned: { label: "À réaliser", icon: Clock, className: "bg-muted text-muted-foreground" },
  submitted: { label: "Correction en cours", icon: Clock, className: "bg-warning/10 text-warning" },
  validated: { label: "Validée", icon: CheckCircle2, className: "bg-success/10 text-success" },
  rejected: { label: "Non validée", icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

export function MissionCard({ assignment }: { assignment: MissionAssignment }) {
  const [open, setOpen] = React.useState(false);
  const [answer, setAnswer] = React.useState<unknown>(undefined);
  const [loading, setLoading] = React.useState(false);

  const status = STATUS_CONFIG[assignment.status] ?? STATUS_CONFIG.assigned;
  const content = asVariantContent(assignment.variant_content);

  async function handleSubmit() {
    if (!isAnswerComplete(content, answer)) {
      toast.error("Veuillez compléter votre réponse avant de soumettre.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/missions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: assignment.id,
          submission: buildSubmissionData(content, answer),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(json.error ?? "Impossible de soumettre la mission.");
        setLoading(false);
        return;
      }

      // La correction est automatique et immédiate : le résultat revient
      // directement dans la réponse, pas besoin d'attendre une revue.
      if (json.approved) {
        toast.success(json.message ?? "Réponse correcte, mission validée.");
      } else {
        toast.error(json.message ?? "Réponse incorrecte.");
      }
      setOpen(false);
      window.location.reload();
    } catch {
      toast.error("Une erreur réseau est survenue.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">
            {content.title ?? `Mission ${assignment.slot_number}`}
          </CardTitle>
          <Badge className={status.className}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {content.instructions}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            {formatFcfa(assignment.reward_amount)}
          </span>

          {assignment.status === "assigned" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                Réaliser la mission
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{content.title}</DialogTitle>
                  <DialogDescription>{content.instructions}</DialogDescription>
                </DialogHeader>
                <MissionAnswerInput content={content} value={answer} onChange={setAnswer} />
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Annuler
                  </DialogClose>
                  <Button onClick={handleSubmit} disabled={loading} className="gap-1.5">
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    Soumettre
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
