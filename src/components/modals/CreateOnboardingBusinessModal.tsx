import { useCallback, useState } from "react";
import { businessesApi } from "@/api/businesses";
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
  onSuccess: (businessId: string) => void;
}

/** Slugify a business name: lowercase, replace non-alphanum with dashes, trim */
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * "New restaurant" action on the Onboarding page -- reachable by BOTH roles.
 * Deliberately a SEPARATE, smaller modal from CreateBusinessModal: it only
 * sends the fields CreateOnboardingBusinessRequest models (the subset an
 * ONBOARDER may send -- see admin_api/app/api/v1/routes_businesses.py's
 * ONBOARDER daily-limit-default check and PATCH allow-list). No owner
 * email/full name here -- the owner login is a separate step in the
 * onboarding workspace's "Logins" section, and no limits fields at all
 * (ONBOARDER cannot set non-default limits at creation; SUPER_ADMIN doesn't
 * need to for a brand-new tenant either -- Set Limits stays on the fuller
 * Businesses page for SUPER_ADMIN if it's ever needed).
 */
export function CreateOnboardingBusinessModal({ open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    timezone: "Africa/Johannesburg",
    plan: "STARTER",
    whatsapp_phone_number_id: "",
  });
  const [slugManual, setSlugManual] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [moduleChanges, setModuleChanges] = useState<Partial<Record<ModuleFlagKey, boolean>>>({});

  const setModuleFlag = (key: ModuleFlagKey, value: boolean | undefined) => {
    setModuleChanges((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const set = useCallback((key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && !slugManual) next.slug = slugify(value);
      return next;
    });
  }, [slugManual]);

  const handleSlugChange = useCallback((value: string) => {
    setSlugManual(true);
    setForm((prev) => ({ ...prev, slug: value }));
  }, []);

  const resetForm = () => {
    setForm({ name: "", slug: "", timezone: "Africa/Johannesburg", plan: "STARTER", whatsapp_phone_number_id: "" });
    setSlugManual(false);
    setModuleChanges({});
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrors({ name: "Required" });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        timezone: form.timezone,
        plan: form.plan,
        ...(form.slug.trim() ? { slug: form.slug } : {}),
        ...(form.whatsapp_phone_number_id.trim() ? { whatsapp_phone_number_id: form.whatsapp_phone_number_id } : {}),
      };
      const biz = await businessesApi.createOnboardingBusiness(payload);

      if (Object.keys(moduleChanges).length > 0) {
        try {
          await businessesApi.updateOnboardingBusiness(biz.id, moduleChanges);
        } catch (moduleErr: unknown) {
          toast.error(
            `Restaurant created, but module settings failed to save${moduleErr instanceof Error ? `: ${moduleErr.message}` : ""}. Open its onboarding workspace to set them.`
          );
        }
      }

      toast.success("Restaurant created — continue setting it up below.");
      resetForm();
      onSuccess(biz.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create restaurant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Restaurant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Business Name</Label>
            <Input placeholder="My Business" value={form.name} onChange={(e) => set("name", e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              Slug
              <span className="text-xs text-muted-foreground font-normal">(auto-generated from name)</span>
            </Label>
            <Input value={form.slug} onChange={(e) => handleSlugChange(e.target.value)} className="font-mono text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <PlanSelect value={form.plan} onChange={(v) => set("plan", v)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>WhatsApp Phone Number ID <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={form.whatsapp_phone_number_id} onChange={(e) => set("whatsapp_phone_number_id", e.target.value)} />
          </div>

          <hr className="border-border" />
          <p className="text-sm font-medium">Modules</p>
          <ModuleTogglesFieldset changes={moduleChanges} onChange={setModuleFlag} />

          <p className="text-xs text-muted-foreground">
            Owner and staff logins are created in the next step, after this restaurant exists.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create Restaurant"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
