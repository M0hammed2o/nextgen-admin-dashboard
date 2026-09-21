import { useState } from "react";
import { businessesApi } from "@/api/businesses";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  businessId: string;
  onSuccess?: () => void;
  /**
   * When true, this creates the onboarder's OWN temporary working login
   * ("NextGen Onboarding") instead of a real restaurant staff member's
   * login -- role is forced to MANAGER and full_name is ignored server-side
   * (reserved staff_name, see ONBOARDING_ACCOUNT_STAFF_NAME in
   * routes_businesses.py), so this mode hides the Role and Full Name
   * fields entirely rather than showing inputs that don't do anything.
   */
  onboardingAccount?: boolean;
}

export function CreateOwnerModal({ open, onClose, businessId, onSuccess, onboardingAccount }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role: "OWNER" as "OWNER" | "MANAGER" });
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = onboardingAccount
        ? { email: form.email, full_name: "NextGen Onboarding", role: "MANAGER" as const, is_onboarding_account: true }
        : form;
      const res = await businessesApi.createOwner(businessId, payload);
      setCreatedEmail(res.email);
      setCreatedPassword(res.temporary_password);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!createdPassword) return;
    navigator.clipboard.writeText(createdPassword);
    toast.success("Copied to clipboard");
  };

  const handleDone = () => {
    setForm({ email: "", full_name: "", role: "OWNER" });
    setCreatedPassword(null);
    setCreatedEmail("");
    onClose();
  };

  // ── One-time temporary password reveal ────────────────────────────────────
  if (createdPassword) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleDone()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Login Created</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this temporary password with <span className="font-medium text-foreground">{createdEmail}</span> now
              — it will not be shown again. They'll be asked to set a new password on first login.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm">
                {createdPassword}
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{onboardingAccount ? "Create Your Onboarding Login" : "Create Owner / Manager"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {onboardingAccount && (
            <p className="text-xs text-muted-foreground">
              This is a temporary MANAGER login for YOU to configure this restaurant in the Manager Dashboard.
              It's automatically deactivated once you complete handover below.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="owner-email">Email</Label>
            <Input id="owner-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          {!onboardingAccount && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="owner-full-name">Full Name</Label>
                <Input id="owner-full-name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner-role">Role</Label>
                <select
                  id="owner-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "OWNER" | "MANAGER" }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="OWNER">Owner</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            A temporary password will be generated automatically and shown once after creation.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
