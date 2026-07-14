import { useState, useCallback } from "react";
import { businessesApi } from "@/api/businesses";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/** Slugify a business name: lowercase, replace non-alphanum with dashes, trim */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateBusinessModal({ open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    timezone: "Africa/Johannesburg",
    plan: "STARTER",
    whatsapp_phone_number_id: "",
    daily_message_limit: 800,
    daily_llm_call_limit: 400,
    daily_order_limit: 200,
    owner_email: "",
    owner_full_name: "",
  });
  const [slugManual, setSlugManual] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdOwnerPassword, setCreatedOwnerPassword] = useState<string | null>(null);
  const [createdOwnerEmail, setCreatedOwnerEmail] = useState("");

  const set = useCallback((key: string, value: string | number) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-generate slug from name unless user has manually edited it
      if (key === "name" && !slugManual) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }, [slugManual]);

  const handleSlugChange = useCallback((value: string) => {
    setSlugManual(true);
    setForm((prev) => ({ ...prev, slug: value }));
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.owner_email.trim()) e.owner_email = "Required";
    if (!form.owner_full_name.trim()) e.owner_full_name = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({
      name: "", slug: "", timezone: "Africa/Johannesburg", plan: "STARTER",
      whatsapp_phone_number_id: "", daily_message_limit: 800, daily_llm_call_limit: 400,
      daily_order_limit: 200, owner_email: "", owner_full_name: "",
    });
    setSlugManual(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      // Send slug only if non-empty, else backend auto-generates
      const payload = { ...form };
      if (!payload.slug.trim()) delete (payload as Record<string, unknown>).slug;
      const biz = await businessesApi.create(payload);
      toast.success("Business created successfully");
      onSuccess();
      if (biz.owner_temporary_password) {
        setCreatedOwnerEmail(form.owner_email);
        setCreatedOwnerPassword(biz.owner_temporary_password);
      } else {
        onClose();
        resetForm();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create business");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdOwnerPassword) return;
    navigator.clipboard.writeText(createdOwnerPassword);
    toast.success("Copied to clipboard");
  };

  const handleDone = () => {
    setCreatedOwnerPassword(null);
    setCreatedOwnerEmail("");
    onClose();
    resetForm();
  };

  // ── One-time owner temporary password reveal ──────────────────────────────
  if (createdOwnerPassword) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleDone()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Business & Owner Login Created</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this temporary password with <span className="font-medium text-foreground">{createdOwnerEmail}</span> now
              — it will not be shown again. They'll be asked to set a new password on first login.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm">
                {createdOwnerPassword}
              </code>
              <Button type="button" variant="outline" onClick={handleCopy}>Copy</Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleDone}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Business</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Business Name */}
          <div className="space-y-1.5">
            <Label>Business Name</Label>
            <Input
              placeholder="My Business"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Slug (auto-generated, editable) */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-2">
              Slug
              <span className="text-xs text-muted-foreground font-normal">(auto-generated from name)</span>
            </Label>
            <Input
              placeholder="auto-generated"
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Input value={form.plan} onChange={(e) => set("plan", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>WhatsApp Phone Number ID</Label>
            <Input
              value={form.whatsapp_phone_number_id}
              onChange={(e) => set("whatsapp_phone_number_id", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Msg Limit</Label>
              <Input type="number" value={form.daily_message_limit} onChange={(e) => set("daily_message_limit", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>LLM Limit</Label>
              <Input type="number" value={form.daily_llm_call_limit} onChange={(e) => set("daily_llm_call_limit", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Order Limit</Label>
              <Input type="number" value={form.daily_order_limit} onChange={(e) => set("daily_order_limit", Number(e.target.value))} />
            </div>
          </div>

          <hr className="border-border" />
          <p className="text-sm font-medium">Owner Account</p>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" placeholder="owner@example.com" value={form.owner_email} onChange={(e) => set("owner_email", e.target.value)} />
            {errors.owner_email && <p className="text-xs text-destructive">{errors.owner_email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input placeholder="John Doe" value={form.owner_full_name} onChange={(e) => set("owner_full_name", e.target.value)} />
            {errors.owner_full_name && <p className="text-xs text-destructive">{errors.owner_full_name}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            A temporary password will be generated automatically and shown once after creation.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create Business"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
