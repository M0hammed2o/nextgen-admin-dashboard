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

export function SetLimitsModal({ open, onClose, business, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [limits, setLimits] = useState({
    daily_message_limit: business.daily_message_limit,
    daily_llm_call_limit: business.daily_llm_call_limit,
    daily_order_limit: business.daily_order_limit,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await businessesApi.setLimits(business.id, limits);
      toast.success("Limits updated");
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
        <DialogHeader><DialogTitle>Set Business Limits</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {([
            ["Daily Messages", "daily_message_limit"],
            ["Daily LLM Calls", "daily_llm_call_limit"],
            ["Daily Orders", "daily_order_limit"],
          ] as const).map(([label, key]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input type="number" value={limits[key]} onChange={(e) => setLimits((l) => ({ ...l, [key]: Number(e.target.value) }))} />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save Limits"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
