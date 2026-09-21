import { useState } from "react";
import { businessesApi } from "@/api/businesses";
import type { Business } from "@/types/business";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  business: Business;
  onSuccess: (b: Business) => void;
}

export function OrderPackModal({ open, onClose, business, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [packSize, setPackSize] = useState(500);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(packSize) || packSize < 1) return;
    setLoading(true);
    try {
      const res = await businessesApi.orderPack(business.id, { pack_size: packSize });
      toast.success(`Granted ${packSize.toLocaleString()} order-pack credits`);
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to grant order pack");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Grant Order Pack</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Extra orders for the current billing period</Label>
            <Input type="number" min={1} value={packSize} onChange={(e) => setPackSize(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">
              Common sizes are 500 / 1000 / 2500 / 5000, but any positive number is accepted. Credits are added on
              top of the business's existing order-pack balance, not replaced.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Granting…" : "Grant Pack"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
