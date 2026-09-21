import { useState } from "react";
import { commercialApi } from "@/api/commercial";
import type { CommercialInvoice } from "@/types/commercial";
import { formatCentsAsRands } from "@/lib/money";
import { formatDateForApi } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  invoice: CommercialInvoice | null;
  onSuccess: (updated: CommercialInvoice) => void;
}

/** POST .../mark-paid -- records an EFT/cash payment. Converts the trial to
 * ACTIVE / reactivates the account the same way a Stripe/PayFast webhook
 * would (see backend/app/billing/trials.py::mark_paid, which reuses
 * lifecycle.mark_invoice_paid). Reference is required for EFT, optional
 * for CASH -- enforced both here (fast feedback) and server-side
 * (REFERENCE_REQUIRED, the real boundary). */
export function RecordPaymentDialog({ open, onClose, invoice, onSuccess }: Props) {
  const [paymentDate, setPaymentDate] = useState(() => formatDateForApi(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<"EFT" | "CASH">("EFT");
  const [reference, setReference] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const reset = () => {
    setPaymentDate(formatDateForApi(new Date()));
    setPaymentMethod("EFT");
    setReference("");
    setInternalNote("");
    setFormError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setFormError("");
    if (paymentMethod === "EFT" && !reference.trim()) {
      setFormError("A payment reference is required for an EFT payment");
      return;
    }
    setLoading(true);
    try {
      const updated = await commercialApi.markPaid(invoice.id, {
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference: reference.trim() || undefined,
        internal_note: internalNote.trim() || undefined,
      });
      toast.success("Payment recorded — invoice marked paid");
      onSuccess(updated);
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record payment";
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {invoice
              ? `${invoice.invoice_number ?? "This invoice"} — ${formatCentsAsRands(invoice.total_cents)}. Recording payment marks it PAID and will convert the trial / reactivate the account.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="payment-date">Payment date</Label>
            <Input id="payment-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-method">Method</Label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "EFT" | "CASH")}
              className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="EFT">EFT</option>
              <option value="CASH">Cash</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-reference">
              Reference {paymentMethod === "EFT" ? <span className="text-destructive">*</span> : <span className="text-xs text-muted-foreground font-normal">(optional)</span>}
            </Label>
            <Input id="payment-reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank reference / receipt number" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-note">Internal note <span className="text-xs text-muted-foreground font-normal">(optional, admin-only)</span></Label>
            <Textarea id="payment-note" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading || !invoice}>{loading ? "Recording…" : "Record Payment"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
