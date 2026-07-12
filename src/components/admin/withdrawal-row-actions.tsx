"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { adminApproveWithdrawal, adminRejectWithdrawal } from "@/app/pouri/retraits/actions";
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

export function WithdrawalRowActions({ withdrawalId }: { withdrawalId: string }) {
  const [pending, startTransition] = React.useTransition();
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  function handleApprove() {
    startTransition(async () => {
      try {
        await adminApproveWithdrawal(withdrawalId);
        toast.success("Virement déclenché auprès de Genius Pay. Statut : en cours de traitement.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
      }
    });
  }

  function handleReject() {
    if (reason.trim().length < 3) {
      toast.error("Veuillez indiquer un motif.");
      return;
    }
    startTransition(async () => {
      try {
        await adminRejectWithdrawal(withdrawalId, reason);
        toast.success("Retrait refusé, fonds recrédités.");
        setRejectOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={handleApprove} disabled={pending} className="gap-1.5">
        {pending && <Loader2 className="size-3.5 animate-spin" />}
        Approuver
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger render={<Button size="sm" variant="destructive" disabled={pending} />}>Refuser</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser le retrait</DialogTitle>
            <DialogDescription>
              Aucun virement ne sera déclenché. Les fonds seront automatiquement recrédités sur le
              solde de l&apos;utilisateur.
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
