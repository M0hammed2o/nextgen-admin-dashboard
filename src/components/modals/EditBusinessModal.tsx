import { useState } from "react";
import { businessesApi } from "@/api/businesses";
import type { Business } from "@/types/business";
import type { ModuleFlagKey } from "@/lib/modules";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanSelect } from "@/components/modals/PlanSelect";
import { ModuleTogglesFieldset } from "@/components/modals/ModuleTogglesFieldset";
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
    name: business.name ?? "",
    timezone: business.timezone ?? "",
    plan: business.plan ?? "",
    // A fresh/demo tenant (e.g. Barn Owl on the MOCK payment provider) has no
    // WhatsApp/Stripe IDs configured yet, so these are legitimately null from
    // the API -- passing null straight into a controlled <Input value={...}>
    // makes React warn that the component "should not be null" (found by
    // running the admin-portal browser test against real Barn Owl data, not
    // by guessing). "" keeps the input controlled and empty, matching what
    // the field actually shows.
    whatsapp_phone_number_id: business.whatsapp_phone_number_id ?? "",
    stripe_customer_id: business.stripe_customer_id ?? "",
    stripe_subscription_id: business.stripe_subscription_id ?? "",
    billing_status: business.billing_status ?? "",
  });
  // Module switches: see ModuleTogglesFieldset -- a key only appears here
  // once the admin explicitly chooses On/Off for it; "Leave" removes the key.
  const [moduleChanges, setModuleChanges] = useState<Partial<Record<ModuleFlagKey, boolean>>>({});

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const setModuleFlag = (key: ModuleFlagKey, value: boolean | undefined) => {
    setModuleChanges((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // whatsapp_phone_number_id/stripe_customer_id/stripe_subscription_id
      // are UNIQUE-but-nullable columns (a real business only ever needs one
      // WhatsApp number, but many businesses can share "not set yet").
      // "" above only exists to keep the <Input> controlled -- submitting it
      // as a literal empty string instead of null is a real, concrete value
      // that collides with any OTHER business that also has "" set, which
      // failed with a raw 500 the first time this was tried against the
      // real Barn Owl demo tenant (a different pre-existing business in the
      // shared dev database already had "" from an earlier fix attempt).
      // Convert blank values back to null on submit, but ONLY for the
      // nullable identifier fields above -- name/timezone/plan/billing_status
      // are required, non-nullable columns, and blanking those is a separate,
      // pre-existing form-validation concern this fix isn't meant to touch.
      const nullableKeys = ["whatsapp_phone_number_id", "stripe_customer_id", "stripe_subscription_id"] as const;
      const payload: Record<string, string | null | boolean> = { ...form, ...moduleChanges };
      for (const key of nullableKeys) {
        if (payload[key] === "") payload[key] = null;
      }
      const res = await businessesApi.update(business.id, payload);
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Business</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Name", key: "name" },
            { label: "Timezone", key: "timezone" },
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
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <PlanSelect value={form.plan} onChange={(v) => set("plan", v)} />
          </div>

          <hr className="border-border" />
          <p className="text-sm font-medium">Modules</p>
          <ModuleTogglesFieldset
            changes={moduleChanges}
            onChange={setModuleFlag}
            // Safe to opt in here: this modal is only reachable via
            // /businesses and /businesses/:id, both RoleRoute-gated to
            // SUPER_ADMIN in App.tsx.
            isSuperAdmin
            current={{
              is_whatsapp_enabled: business.is_whatsapp_enabled,
              inventory_enabled: business.inventory_enabled,
              digital_receipts_enabled: business.digital_receipts_enabled,
              delivery_platforms_enabled: business.delivery_platforms_enabled,
              uber_eats_enabled: business.uber_eats_enabled,
              mrd_enabled: business.mrd_enabled,
              delivery_reconciliation_enabled: business.delivery_reconciliation_enabled,
              advanced_analytics_enabled: business.advanced_analytics_enabled,
              loyalty_enabled: business.loyalty_enabled,
              staff_live_orders_tab_enabled: business.staff_live_orders_tab_enabled,
              staff_wastage_tab_enabled: business.staff_wastage_tab_enabled,
              staff_stocktake_tab_enabled: business.staff_stocktake_tab_enabled,
            }}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
