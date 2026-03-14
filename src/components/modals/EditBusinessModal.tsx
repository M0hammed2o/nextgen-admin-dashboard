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

export function EditBusinessModal({ open, onClose, business, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: business.name,
    timezone: business.timezone,
    plan: business.plan,
    whatsapp_phone_number_id: business.whatsapp_phone_number_id,
    stripe_customer_id: business.stripe_customer_id,
    stripe_subscription_id: business.stripe_subscription_id,
    billing_status: business.billing_status,
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await businessesApi.update(business.id, form);
      toast.success("Business updated");
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Business</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Name", key: "name" },
            { label: "Timezone", key: "timezone" },
            { label: "Plan", key: "plan" },
            { label: "WhatsApp Phone ID", key: "whatsapp_phone_number_id" },
            { label: "Stripe Customer ID", key: "stripe_customer_id" },
            { label: "Stripe Subscription ID", key: "stripe_subscription_id" },
            { label: "Billing Status", key: "billing_status" },
          ].map(({ label, key }) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input value={(form as Record<string, string>)[key]} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
