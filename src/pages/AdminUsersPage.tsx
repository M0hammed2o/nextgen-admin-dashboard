import { useEffect, useState } from "react";
import { adminUsersApi } from "@/api/adminUsers";
import type { AdminUserRecord } from "@/types/adminUsers";
import type { AdminRole } from "@/types/auth";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_LABELS: Record<AdminRole, string> = { SUPER_ADMIN: "Super Admin", ONBOARDER: "Onboarder" };

function CreateAdminUserModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", display_name: "", role: "ONBOARDER" as AdminRole });
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminUsersApi.create(form);
      setCreated({ email: res.email, password: res.temporary_password ?? "" });
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create admin user");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ email: "", display_name: "", role: "ONBOARDER" });
    setCreated(null);
    onClose();
  };

  if (created) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Admin User Created</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this temporary password with <span className="font-medium text-foreground">{created.email}</span> now
              — it will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm">{created.password}</code>
              <Button
                type="button"
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(created.password); toast.success("Copied to clipboard"); }}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: unlike owner/manager accounts, this platform doesn't yet force a password change on first
              admin login — ask them to change it manually after signing in.
            </p>
            <div className="flex justify-end pt-2">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Admin User</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Display Name</Label>
            <Input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminRole }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ONBOARDER">Onboarder (sales partner)</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            A temporary password will be generated automatically and shown once after creation.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const { me } = useAuth();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    setError("");
    adminUsersApi.list()
      .then(setUsers)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load admin users"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleActive = async (u: AdminUserRecord) => {
    setBusyId(u.id);
    try {
      const updated = await adminUsersApi.update(u.id, { is_active: !u.is_active });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleChangeRole = async (u: AdminUserRecord, role: AdminRole) => {
    if (role === u.role) return;
    setBusyId(u.id);
    try {
      const updated = await adminUsersApi.update(u.id, { role });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async (u: AdminUserRecord) => {
    if (!window.confirm(`Reset ${u.display_name}'s password? Their current sessions will be signed out immediately.`)) return;
    setBusyId(u.id);
    try {
      const res = await adminUsersApi.resetPassword(u.id);
      setResetResult({ email: res.email, password: res.temporary_password ?? "" });
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Admin Users</h2>
          <p className="text-sm text-muted-foreground">
            Super Admins and sales-partner Onboarder logins. A demoted or deactivated account loses access
            immediately, on its very next request.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Admin User
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchUsers}>Retry</Button>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No admin users yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Last Login</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === me?.id;
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {u.display_name} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          disabled={busy || isSelf}
                          onChange={(e) => handleChangeRole(u, e.target.value as AdminRole)}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs disabled:opacity-50"
                        >
                          <option value="ONBOARDER">{ROLE_LABELS.ONBOARDER}</option>
                          <option value="SUPER_ADMIN">{ROLE_LABELS.SUPER_ADMIN}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {u.is_active ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{formatDateTime(u.last_login_at)}</td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Button variant="ghost" size="sm" className="gap-1" disabled={busy} onClick={() => handleResetPassword(u)}>
                          <KeyRound className="w-3.5 h-3.5" /> Reset
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy || isSelf}
                          className={u.is_active ? "text-destructive hover:text-destructive" : ""}
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.is_active ? "Deactivate" : "Reactivate"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateAdminUserModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={fetchUsers} />

      <Dialog open={!!resetResult} onOpenChange={(v) => !v && setResetResult(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Password Reset</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this temporary password with <span className="font-medium text-foreground">{resetResult?.email}</span> now
              — it will not be shown again. Their sessions have been signed out.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm">{resetResult?.password}</code>
              <Button
                type="button"
                variant="outline"
                onClick={() => { if (resetResult) { navigator.clipboard.writeText(resetResult.password); toast.success("Copied to clipboard"); } }}
              >
                Copy
              </Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setResetResult(null)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// CANNOT_MODIFY_SELF / LAST_SUPER_ADMIN come through as the backend's
// AppError.message (see apiClient.request's error-body parsing) -- surfaced
// as-is here since both are already written in plain, readable language
// server-side (admin_api/app/api/v1/routes_admin_users.py).
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Action failed";
}
