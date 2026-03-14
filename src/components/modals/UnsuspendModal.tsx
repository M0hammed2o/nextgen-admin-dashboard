import { useState } from "react";
import { businessesApi } from "@/api/businesses";
import type { Business } from "@/types/business";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  onSuccess: (b: Business) => void;
}

export function UnsuspendModal({ open, onClose, businessId, businessName, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const res = await businessesApi.unsuspend(businessId);
      toast.success("Business unsuspended");
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Unsuspend Business</DialogTitle>
          <DialogDescription>Re-activate "{businessName}"?</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handle} disabled={loading}>{loading ? "Processing…" : "Unsuspend"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
