"use client";

import { ApproveRejectActions } from "@/components/admin/approve-reject-actions";
import { adminConfirmDeposit, adminRejectDeposit } from "@/app/pouri/depots/actions";

export function DepositRowActions({ depositId }: { depositId: string }) {
  return (
    <ApproveRejectActions
      approveLabel="Confirmer"
      rejectLabel="Refuser"
      onApprove={() => adminConfirmDeposit(depositId)}
      onReject={(reason) => adminRejectDeposit(depositId, reason)}
    />
  );
}
