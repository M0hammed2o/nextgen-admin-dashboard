import { useState } from "react";
import { businessesApi } from "@/api/businesses";
import type { Business } from "@/types/business";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  businessId: string;
  onSuccess: (b: Business) => void;
}

export function SuspendModal({ open, onClose, businessId, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const res = await businessesApi.suspend(businessId, { reason });
      toast.success("Business suspended");
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to suspend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Suspend Business</DialogTitle>
          <DialogDescription>This will deactivate the business. Please provide a reason.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Non-payment" required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={loading || !reason.trim()}>{loading ? "Suspending…" : "Suspend"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
