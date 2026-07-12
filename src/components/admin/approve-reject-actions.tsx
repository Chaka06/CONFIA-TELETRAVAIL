"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

export function ApproveRejectActions({
  onApprove,
  onReject,
  approveLabel = "Approuver",
  rejectLabel = "Refuser",
  requireReason = true,
}: {
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  approveLabel?: string;
  rejectLabel?: string;
  requireReason?: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  function handleApprove() {
    startTransition(async () => {
      try {
        await onApprove();
        toast.success("Action effectuée.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
      }
    });
  }

  function handleReject() {
    if (requireReason && reason.trim().length < 3) {
      toast.error("Veuillez indiquer un motif.");
      return;
    }
    startTransition(async () => {
      try {
        await onReject(reason);
        toast.success("Action effectuée.");
        setOpen(false);
        setReason("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={handleApprove} disabled={pending} className="gap-1.5">
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        {approveLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button size="sm" variant="destructive" disabled={pending} />}>
          {rejectLabel}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rejectLabel}</DialogTitle>
            <DialogDescription>
              Indiquez le motif : il sera communiqué à l&apos;utilisateur par e-mail.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motif du refus..."
            rows={4}
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
            <Button variant="destructive" onClick={handleReject} disabled={pending} className="gap-1.5">
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
