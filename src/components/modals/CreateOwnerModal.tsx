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
}

export function CreateOwnerModal({ open, onClose, businessId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role: "OWNER" as "OWNER" | "MANAGER" });
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await businessesApi.createOwner(businessId, form);
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
        <DialogHeader><DialogTitle>Create Owner / Manager</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "OWNER" | "MANAGER" }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="OWNER">Owner</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
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
