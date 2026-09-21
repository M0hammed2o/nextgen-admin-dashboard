import { useEffect, useState } from "react";
import { commercialApi } from "@/api/commercial";
import type { CommercialInvoice, InvoiceLineIn, InvoiceLineKind, PriceCatalogueEntry } from "@/types/commercial";
import { randsToCents, centsToRandsInput, formatCentsAsRands } from "@/lib/money";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  businessId: string;
  businessPlan: string;
  priceCatalogue: PriceCatalogueEntry[];
  /** null = creating a brand-new draft. A non-null invoice here MUST be
   * status DRAFT -- the caller is responsible for only opening this editor
   * for a draft (an issued invoice's lines are frozen, see
   * backend/app/billing/commercial_invoices.py::issue_invoice). */
  existingInvoice: CommercialInvoice | null;
  onSaved: (invoice: CommercialInvoice) => void;
}

// Local-only editable line -- carries a stable client-generated id so React
// keys never depend on a field the user is actively editing (description,
// amount, quantity), matching KNOWN_BUGS.md BUG-0010's fix pattern: a line
// existing on the server keeps ITS OWN id as the stable key; a freshly
// added line gets one generated once, at add time, never regenerated on
// every render.
interface EditableLine extends InvoiceLineIn {
  _localId: string;
  _amountInput: string; // raw rand string as typed, kept separate from unit_amount_cents until parsed
}

function newLocalId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `line-${Date.now()}-${Math.random()}`;
}

function blankLine(kind: InvoiceLineKind, description = "", amountCents = 0, quantity = 1): EditableLine {
  return {
    _localId: newLocalId(),
    kind,
    description,
    quantity,
    unit_amount_cents: amountCents,
    _amountInput: centsToRandsInput(amountCents),
  };
}

const KIND_LABELS: Record<InvoiceLineKind, string> = {
  SETUP: "Setup (once-off)",
  SUBSCRIPTION: "Subscription",
  MODULE: "Module",
  OTHER: "Other",
};

/**
 * Create/edit a DRAFT commercial invoice's lines, save the draft, and (once
 * saved) issue it. Never trusts a client-computed subtotal/VAT/total as
 * authoritative -- those are only ever shown from the server's own
 * InvoiceOut response, per this task's brief; the inline preview here is
 * explicitly labelled as a preview.
 */
export function InvoiceEditorDialog({ open, onClose, businessId, businessPlan, priceCatalogue, existingInvoice, onSaved }: Props) {
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [internalNote, setInternalNote] = useState("");
  const [savedInvoice, setSavedInvoice] = useState<CommercialInvoice | null>(existingInvoice);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFormError("");
    setSavedInvoice(existingInvoice);
    if (existingInvoice) {
      setLines(
        existingInvoice.lines.map((l) => ({
          _localId: l.id,
          kind: l.kind as InvoiceLineKind,
          description: l.description,
          quantity: l.quantity,
          unit_amount_cents: l.unit_amount_cents,
          _amountInput: centsToRandsInput(l.unit_amount_cents),
        }))
      );
      setInternalNote(existingInvoice.internal_note ?? "");
    } else {
      // Prefill a SUBSCRIPTION line from the price catalogue when the
      // client's plan has a known monthly price -- optional, removable.
      const catalogueEntry = priceCatalogue.find((p) => p.plan === businessPlan);
      setLines(
        catalogueEntry
          ? [blankLine("SUBSCRIPTION", `${businessPlan} plan — monthly subscription`, catalogueEntry.monthly_amount_cents)]
          : []
      );
      setInternalNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingInvoice]);

  const updateLine = (localId: string, patch: Partial<EditableLine>) => {
    setLines((prev) => prev.map((l) => (l._localId === localId ? { ...l, ...patch } : l)));
  };

  const setLineAmount = (localId: string, input: string) => {
    updateLine(localId, { _amountInput: input });
    try {
      const cents = randsToCents(input || "0");
      updateLine(localId, { _amountInput: input, unit_amount_cents: cents });
    } catch {
      // Leave unit_amount_cents at its last valid value -- validated again on save.
    }
  };

  const addLine = (kind: InvoiceLineKind) => setLines((prev) => [...prev, blankLine(kind)]);
  const removeLine = (localId: string) => setLines((prev) => prev.filter((l) => l._localId !== localId));

  const previewSubtotalCents = lines.reduce((sum, l) => sum + l.unit_amount_cents * l.quantity, 0);

  const buildPayloadLines = (): InvoiceLineIn[] | null => {
    if (lines.length === 0) {
      setFormError("Add at least one line item");
      return null;
    }
    const payload: InvoiceLineIn[] = [];
    for (const l of lines) {
      if (!l.description.trim()) {
        setFormError("Every line needs a description");
        return null;
      }
      let cents: number;
      try {
        cents = randsToCents(l._amountInput || "0");
      } catch (err: unknown) {
        setFormError(err instanceof Error ? err.message : "Invalid amount");
        return null;
      }
      if (!Number.isInteger(l.quantity) || l.quantity < 1) {
        setFormError("Quantity must be a whole number of at least 1");
        return null;
      }
      payload.push({ kind: l.kind, description: l.description.trim(), quantity: l.quantity, unit_amount_cents: cents });
    }
    return payload;
  };

  const handleSaveDraft = async () => {
    setFormError("");
    const payloadLines = buildPayloadLines();
    if (!payloadLines) return;
    setSaving(true);
    try {
      let result: CommercialInvoice;
      if (savedInvoice) {
        result = await commercialApi.updateInvoiceDraft(savedInvoice.id, {
          lines: payloadLines,
          internal_note: internalNote.trim() || undefined,
        });
      } else {
        result = await commercialApi.createInvoiceDraft({
          business_id: businessId,
          lines: payloadLines,
          internal_note: internalNote.trim() || undefined,
        });
      }
      setSavedInvoice(result);
      toast.success("Draft saved");
      onSaved(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save draft";
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async () => {
    if (!savedInvoice) return;
    setIssuing(true);
    try {
      const result = await commercialApi.issueInvoice(savedInvoice.id);
      toast.success(`Invoice ${result.invoice_number} issued`);
      onSaved(result);
      setConfirmIssueOpen(false);
      onClose();
    } catch (err: unknown) {
      // Surfaces INVOICING_NOT_CONFIGURED's backend message verbatim,
      // including the list of missing NEXTGEN_* config names -- per this
      // task's brief, that's acceptable to a SUPER_ADMIN (they can fix
      // config) but should stay generic for an ONBOARDER. This dialog is
      // reachable by both roles; caller decides who sees "Issue" at all
      // is out of scope here, so keep the message as-is for now and let
      // the parent Client page's copy set expectations. See DOC NOTES.
      const message = err instanceof Error ? err.message : "Failed to issue invoice";
      setFormError(message);
      toast.error(message);
    } finally {
      setIssuing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{savedInvoice ? `Draft Invoice${savedInvoice.invoice_number ? ` ${savedInvoice.invoice_number}` : ""}` : "New Invoice"}</DialogTitle>
            <DialogDescription>
              Line amounts are exclusive of VAT. The subtotal below is a preview only — the server computes the
              authoritative subtotal, VAT, and total when you save.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No line items yet — add one below.</p>
            ) : (
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line._localId} className="grid grid-cols-12 gap-2 items-start border border-border rounded-lg p-2.5">
                    <select
                      value={line.kind}
                      onChange={(e) => updateLine(line._localId, { kind: e.target.value as InvoiceLineKind })}
                      className="col-span-3 h-9 rounded-md border border-input bg-background px-2 text-xs"
                      aria-label="Line kind"
                    >
                      {(Object.keys(KIND_LABELS) as InvoiceLineKind[]).map((k) => (
                        <option key={k} value={k}>{KIND_LABELS[k]}</option>
                      ))}
                    </select>
                    <Input
                      className="col-span-4 h-9 text-xs"
                      value={line.description}
                      onChange={(e) => updateLine(line._localId, { description: e.target.value })}
                      placeholder="Description"
                      aria-label="Line description"
                    />
                    <Input
                      className="col-span-2 h-9 text-xs"
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(line._localId, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      aria-label="Quantity"
                    />
                    <Input
                      className="col-span-2 h-9 text-xs"
                      value={line._amountInput}
                      onChange={(e) => setLineAmount(line._localId, e.target.value)}
                      placeholder="0.00"
                      aria-label="Unit amount (rands)"
                    />
                    <Button type="button" variant="ghost" size="icon" className="col-span-1 h-9 w-9" onClick={() => removeLine(line._localId)} aria-label="Remove line">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => addLine("SUBSCRIPTION")}><Plus className="w-3.5 h-3.5" /> Subscription</Button>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => addLine("SETUP")}><Plus className="w-3.5 h-3.5" /> Setup</Button>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => addLine("MODULE")}><Plus className="w-3.5 h-3.5" /> Module</Button>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => addLine("OTHER")}><Plus className="w-3.5 h-3.5" /> Other</Button>
            </div>

            <div className="flex justify-end text-sm text-muted-foreground">
              Preview subtotal: <span className="font-medium text-foreground ml-1">{formatCentsAsRands(previewSubtotalCents)}</span>
            </div>

            {savedInvoice && (
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                <p>Server-confirmed subtotal: <span className="font-medium">{formatCentsAsRands(savedInvoice.subtotal_cents)}</span></p>
                <p>VAT: <span className="font-medium">{formatCentsAsRands(savedInvoice.vat_cents)}</span></p>
                <p>Total: <span className="font-medium">{formatCentsAsRands(savedInvoice.total_cents)}</span></p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="invoice-note">Internal note <span className="text-xs text-muted-foreground font-normal">(optional, admin-only)</span></Label>
              <Textarea id="invoice-note" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {savedInvoice ? "Saved as draft — not yet a real numbered document." : "Not saved yet."}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Close</Button>
              <Button type="button" variant="secondary" disabled={saving} onClick={handleSaveDraft}>
                {saving ? "Saving…" : "Save Draft"}
              </Button>
              <Button type="button" disabled={!savedInvoice || issuing} onClick={() => setConfirmIssueOpen(true)}>
                Issue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmIssueOpen} onOpenChange={(v) => !v && setConfirmIssueOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Issue Invoice</DialogTitle>
            <DialogDescription>
              Issuing assigns a permanent invoice number and cannot be edited afterwards. Correct a mistake later by
              cancelling and creating a new draft.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmIssueOpen(false)}>Cancel</Button>
            <Button disabled={issuing} onClick={handleIssue}>{issuing ? "Issuing…" : "Confirm Issue"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
