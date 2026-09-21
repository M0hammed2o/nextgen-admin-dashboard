import { useState } from "react";
import { businessesApi } from "@/api/businesses";
import type { TrialExtendResponse } from "@/types/business";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ONBOARDER_TRIAL_EXTENSION_CAP_DAYS } from "@/lib/constants";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  businessId: string;
  isOnboarder: boolean;
  /** trial_extension_days_total already used, when known -- only ever known
   * after a successful extend earlier THIS session (no GET endpoint returns
   * it -- see this task's DOC NOTES). null = genuinely unknown, not zero. */
  extensionDaysUsed: number | null;
  onSuccess: (result: TrialExtendResponse) => void;
}

/** Extend (or reactivate an expired) trial -- POST .../trial/extend.
 * ONBOARDER is capped at ONBOARDER_TRIAL_EXTENSION_CAP_DAYS cumulative days
 * per business (403 EXTENSION_CAP_EXCEEDED); SUPER_ADMIN is unlimited. */
export function ExtendTrialDialog({ open, onClose, businessId, isOnboarder, extensionDaysUsed, onSuccess }: Props) {
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const reset = () => {
    setDays("7");
    setReason("");
    setFormError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const parsedDays = Number(days);
    if (!Number.isInteger(parsedDays) || parsedDays <= 0) {
      setFormError("Days must be a whole number greater than 0");
      return;
    }
    if (!reason.trim()) {
      setFormError("A reason is required");
      return;
    }
    setLoading(true);
    try {
      const result = await businessesApi.extendTrial(businessId, { days: parsedDays, reason: reason.trim() });
      toast.success(`Trial extended to ${new Date(result.trial_ends_at ?? "").toLocaleDateString()}`);
      onSuccess(result);
      handleClose();
    } catch (err: unknown) {
      // Surfaces EXTENSION_CAP_EXCEEDED's backend message verbatim (it
      // already includes "(already used N)") -- kept inline (not just a
      // toast) so it stays visible while the admin adjusts the days field.
      const message = err instanceof Error ? err.message : "Failed to extend trial";
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const remaining = isOnboarder && extensionDaysUsed !== null
    ? Math.max(0, ONBOARDER_TRIAL_EXTENSION_CAP_DAYS - extensionDaysUsed)
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Extend Trial</DialogTitle>
          <DialogDescription>
            Push the trial end date further out. Extending an already-expired trial reactivates it.
          </DialogDescription>
        </DialogHeader>
        {isOnboarder && (
          <p className="text-xs text-muted-foreground">
            {remaining !== null
              ? `You've used ${extensionDaysUsed} of ${ONBOARDER_TRIAL_EXTENSION_CAP_DAYS} cumulative extension days on this client — ${remaining} remaining.`
              : `Your extensions on this client are capped at ${ONBOARDER_TRIAL_EXTENSION_CAP_DAYS} cumulative days.`}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="extend-days">Extra days</Label>
            <Input id="extend-days" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extend-reason">Reason</Label>
            <Textarea id="extend-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. client asked for another week to finish setup" />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Extending…" : "Extend Trial"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
