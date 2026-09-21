import { useState } from "react";
import { commercialApi } from "@/api/commercial";
import type { CommercialInvoice } from "@/types/commercial";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  invoice: CommercialInvoice | null;
  onSuccess: (updated: CommercialInvoice) => void;
}

/**
 * POST .../cancel -- reason required either way. Whether the CANCEL action
 * is even offered for an ISSUED invoice (SUPER_ADMIN only, per
 * backend/app/billing/commercial_invoices.py::cancel_invoice) is decided by
 * the caller (the Client page hides the button for an ONBOARDER on an
 * issued invoice); this dialog itself has no role check of its own since
 * the server enforces FORBIDDEN(403) regardless.
 */
export function CancelInvoiceDialog({ open, onClose, invoice, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const reset = () => {
    setReason("");
    setFormError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    if (!reason.trim()) {
      setFormError("A reason is required");
      return;
    }
    setLoading(true);
    try {
      const updated = await commercialApi.cancelInvoice(invoice.id, { reason: reason.trim() });
      toast.success("Invoice cancelled");
      onSuccess(updated);
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel invoice";
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const isDraft = invoice?.status === "DRAFT";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel {isDraft ? "Draft" : "Invoice"}</DialogTitle>
          <DialogDescription>
            {isDraft
              ? "This discards the draft. It can't be undone, but nothing was ever issued to the client."
              : `This cancels ${invoice?.invoice_number ?? "the issued invoice"}. A paid invoice can never be cancelled — this only works because it hasn't been paid yet.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Back</Button>
            <Button type="submit" variant="destructive" disabled={loading}>{loading ? "Cancelling…" : "Cancel Invoice"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
