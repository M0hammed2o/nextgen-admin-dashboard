import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { businessesApi } from "@/api/businesses";
import type { OnboardingBusiness, BusinessUserSummary, OnboardingConfirmItem, OnboardingConfirmation } from "@/types/business";
import type { ModuleFlagKey } from "@/lib/modules";
import type { OnboardingStatusResponse } from "@/types/onboarding";
import { buildOnboardingBasicsPatch } from "@/lib/onboardingPatch";
import { GoLiveStatusBadge } from "@/components/GoLiveStatusBadge";
import { DASH_URL } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlanSelect } from "@/components/modals/PlanSelect";
import { ModuleTogglesFieldset } from "@/components/modals/ModuleTogglesFieldset";
import { CreateOwnerModal } from "@/components/modals/CreateOwnerModal";
import { ArrowLeft, ExternalLink, KeyRound, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Every bullet in the "Configure in the Manager Dashboard" panel maps to
// exactly one go-live check key -- see
// admin_api/app/services/onboarding.py::compute_go_live_checks for the
// authoritative list (owner_login through billing_status, 12 checks total).
// Badge + detail text for each bullet is always the live value from the
// GET .../onboarding response, never hand-maintained here.
const DASHBOARD_STEPS: { key: string; instruction: string }[] = [
  { key: "owner_login", instruction: "Sign in as the owner and set a real password (they'll be prompted automatically on first login)." },
  { key: "vat_receipt", instruction: "Set VAT registration/number and receipt paper width — Settings → Business Profile." },
  { key: "menu", instruction: "Import or build the menu — categories and items." },
  { key: "pos_payment_method", instruction: "Enable at least one POS payment method, table numbers, and any discount limit — Settings → POS." },
  { key: "staff_pin", instruction: "Add staff members and set their till PINs — Staff Management." },
  { key: "ingredients", instruction: "(If Inventory is on) add ingredients." },
  { key: "recipe_coverage", instruction: "(If Inventory is on) add recipes so every menu item has one." },
  { key: "opening_stocktake", instruction: "(If Inventory is on) do and approve an opening stocktake." },
  { key: "whatsapp_phone_number", instruction: "(If WhatsApp is on) confirm the WhatsApp phone number ID is set." },
  { key: "till_session", instruction: "On the staff till, open a till session." },
  { key: "pos_test_order", instruction: "Ring up one test POS order and confirm the receipt prints/renders." },
  { key: "billing_status", instruction: "Confirm billing status with NextGen (Trial or Active)." },
];

// The 3 items POST .../onboarding/confirm accepts (OnboardingConfirmRequest.item
// pattern in routes_businesses.py) -- each maps to exactly one go-live check
// key whose status flips once confirmed (see compute_go_live_checks's
// modules_confirmed/receipt_test/whatsapp_test checks).
const MANUAL_CONFIRM_ITEMS: { item: OnboardingConfirmItem; checkKey: string; label: string }[] = [
  { item: "modules", checkKey: "modules_confirmed", label: "Modules match what the client purchased" },
  { item: "receipt_print", checkKey: "receipt_test", label: "Test receipt printed correctly" },
  { item: "whatsapp_test", checkKey: "whatsapp_test", label: "WhatsApp test message received" },
];

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Action failed";
}

export default function OnboardingWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const [business, setBusiness] = useState<OnboardingBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState<OnboardingStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");

  const [users, setUsers] = useState<BusinessUserSummary[]>([]);
  const [usersError, setUsersError] = useState("");

  const [form, setForm] = useState({ name: "", timezone: "", plan: "", whatsapp_phone_number_id: "" });
  const [moduleChanges, setModuleChanges] = useState<Partial<Record<ModuleFlagKey, boolean>>>({});
  const [savingBasics, setSavingBasics] = useState(false);

  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [onboardingLoginModalOpen, setOnboardingLoginModalOpen] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string | null; password: string } | null>(null);

  const [completeOpen, setCompleteOpen] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);
  const [forceAck, setForceAck] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Go-live manual confirmations (modules / receipt_print / whatsapp_test).
  // `confirmedThisSession` only ever holds what THIS browser session itself
  // confirmed (the API has no endpoint that returns onboarding_confirmations
  // on its own -- see OnboardingConfirmResponse) -- "confirmed by X" shown
  // for anything confirmed before this session comes from the go-live
  // check's own `detail` text instead (see DASHBOARD_STEPS section, and
  // compute_go_live_checks's modules_confirmed detail string).
  const [confirmingItem, setConfirmingItem] = useState<OnboardingConfirmItem | null>(null);
  const [confirmNotes, setConfirmNotes] = useState<Partial<Record<OnboardingConfirmItem, string>>>({});
  const [confirmedThisSession, setConfirmedThisSession] = useState<Partial<Record<OnboardingConfirmItem, OnboardingConfirmation>>>({});

  const fetchBusiness = () => {
    if (!id) return;
    setLoading(true);
    setError("");
    businessesApi.getOnboarding(id)
      .then((b) => {
        setBusiness(b);
        setForm({ name: b.name, timezone: b.timezone, plan: b.plan, whatsapp_phone_number_id: b.whatsapp_phone_number_id ?? "" });
      })
      .catch((e: unknown) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  };

  const fetchStatus = () => {
    if (!id) return;
    setStatusLoading(true);
    setStatusError("");
    businessesApi.getOnboardingStatus(id)
      .then(setStatus)
      .catch((e: unknown) => setStatusError(errorMessage(e)))
      .finally(() => setStatusLoading(false));
  };

  const fetchUsers = () => {
    if (!id) return;
    setUsersError("");
    businessesApi.listUsers(id).then(setUsers).catch((e: unknown) => setUsersError(errorMessage(e)));
  };

  useEffect(() => { fetchBusiness(); fetchStatus(); fetchUsers(); }, [id]);

  const setModuleFlag = (key: ModuleFlagKey, value: boolean | undefined) => {
    setModuleChanges((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const basicsDirty =
    !!business &&
    (form.name !== business.name ||
      form.timezone !== business.timezone ||
      form.plan !== business.plan ||
      form.whatsapp_phone_number_id.trim() !== (business.whatsapp_phone_number_id ?? "") ||
      Object.keys(moduleChanges).length > 0);

  const handleSaveBasics = async () => {
    if (!business || !id) return;
    const payload = buildOnboardingBasicsPatch(form, business, moduleChanges, isSuperAdmin);
    if (Object.keys(payload).length === 0) return;
    setSavingBasics(true);
    try {
      const updated = await businessesApi.updateOnboardingBusiness(id, payload);
      setBusiness(updated);
      setModuleChanges({});
      toast.success("Saved");
      fetchStatus();
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      setSavingBasics(false);
    }
  };

  const handleResetPassword = async (u: BusinessUserSummary) => {
    if (!id) return;
    if (!window.confirm(`Reset ${u.staff_name || u.email}'s password? Their current sessions will be signed out immediately.`)) return;
    setResettingId(u.id);
    try {
      const res = await businessesApi.resetPassword(id, u.id);
      setResetResult({ email: res.email, password: res.temporary_password });
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      setResettingId(null);
    }
  };

  const handleConfirmItem = async (item: OnboardingConfirmItem) => {
    if (!id) return;
    setConfirmingItem(item);
    try {
      const note = confirmNotes[item]?.trim();
      const res = await businessesApi.confirmOnboardingItem(id, { item, note: note || undefined });
      const confirmation = res.onboarding_confirmations[item];
      if (confirmation) setConfirmedThisSession((prev) => ({ ...prev, [item]: confirmation }));
      toast.success("Confirmed");
      fetchStatus();
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      setConfirmingItem(null);
    }
  };

  const handleComplete = async (force: boolean) => {
    if (!id) return;
    setCompleting(true);
    try {
      await businessesApi.completeOnboarding(id, { force });
      toast.success(force ? "Onboarding force-completed — handed over." : "Onboarding complete — handed over.");
      navigate("/onboarding");
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      setCompleting(false);
      setCompleteOpen(false);
      setForceOpen(false);
      setForceAck(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error || "Business not found"}</p>
        <Button variant="outline" onClick={() => navigate("/onboarding")}>Back to Onboarding</Button>
      </div>
    );
  }

  const checksByKey = new Map((status?.go_live.checks ?? []).map((c) => [c.key, c]));
  const failingChecks = status?.go_live.checks.filter((c) => c.status === "fail") ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/onboarding")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{business.name}</h2>
          <p className="text-xs text-muted-foreground font-mono">{business.id}</p>
        </div>
        {status && !statusLoading && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.ready ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
            {status.go_live.passed}/{status.go_live.checks.length} checks passed{status.ready ? " · Ready" : ""}
          </span>
        )}
      </div>

      {/* Readiness label -- prominent, from the SAME GET .../onboarding
          response as the checks below, never hand-derived. */}
      {status && !statusLoading && (
        <div className={`rounded-xl border px-4 py-3 ${status.ready ? "bg-success/10 border-success/20" : "bg-warning/10 border-warning/20"}`}>
          <p className={`text-sm font-semibold ${status.ready ? "text-success" : "text-warning"}`}>{status.go_live.readiness.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{status.go_live.readiness.percent}% of go-live checks complete</p>
        </div>
      )}

      {/* (a) Restaurant, plan & modules */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold">Restaurant, Plan &amp; Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Input value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <PlanSelect value={form.plan} onChange={(v) => setForm((f) => ({ ...f, plan: v }))} />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp Phone Number ID</Label>
            <Input value={form.whatsapp_phone_number_id} onChange={(e) => setForm((f) => ({ ...f, whatsapp_phone_number_id: e.target.value }))} />
          </div>
        </div>

        <hr className="border-border" />
        <p className="text-sm font-medium">Modules</p>
        <ModuleTogglesFieldset
          changes={moduleChanges}
          onChange={setModuleFlag}
          // isSuperAdmin is read from the CURRENT caller's own session
          // (useAuth, above) -- this page is reachable by both roles, so who
          // is actually logged in decides whether delivery/Uber/Mr D/Advanced
          // Analytics/Loyalty render as editable or as locked read-only rows.
          // Fixed 2026-10-10 (confirmed frontend bug): this used to be
          // hardcoded to the ONBOARDER-locked view for every caller. See
          // lib/onboardingPatch.ts's isSuperAdmin parameter for the matching
          // fix on the save path -- the fieldset alone being correct here
          // would otherwise let a SUPER_ADMIN flip a switch that then gets
          // silently dropped on save.
          isSuperAdmin={isSuperAdmin}
          current={{
            is_whatsapp_enabled: business.is_whatsapp_enabled,
            inventory_enabled: business.inventory_enabled,
            digital_receipts_enabled: business.digital_receipts_enabled,
            delivery_platforms_enabled: business.delivery_platforms_enabled,
            uber_eats_enabled: business.uber_eats_enabled,
            mrd_enabled: business.mrd_enabled,
            advanced_analytics_enabled: business.advanced_analytics_enabled,
            loyalty_enabled: business.loyalty_enabled,
            staff_live_orders_tab_enabled: business.staff_live_orders_tab_enabled,
            staff_wastage_tab_enabled: business.staff_wastage_tab_enabled,
            staff_stocktake_tab_enabled: business.staff_stocktake_tab_enabled,
          }}
        />

        <div className="flex justify-end">
          <Button size="sm" disabled={!basicsDirty || savingBasics} onClick={handleSaveBasics}>
            {savingBasics ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* (b) Logins */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold">Logins</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOwnerModalOpen(true)}>Create Owner Login</Button>
            <Button variant="outline" size="sm" onClick={() => setOnboardingLoginModalOpen(true)}>Create My Onboarding Login</Button>
          </div>
        </div>
        {usersError ? (
          <div className="text-center py-4">
            <p className="text-sm text-destructive mb-2">{usersError}</p>
            <Button variant="outline" size="sm" onClick={fetchUsers}>Retry</Button>
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No owner/manager logins yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4">{u.staff_name || "—"}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{u.email}</td>
                    <td className="py-2 pr-4 capitalize">{u.role.toLowerCase()}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <Button variant="ghost" size="sm" className="gap-1.5" disabled={resettingId === u.id} onClick={() => handleResetPassword(u)}>
                        <KeyRound className="w-3.5 h-3.5" />
                        {resettingId === u.id ? "Resetting…" : "Reset Password"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* (c) Configure in the Manager Dashboard */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold">Configure in the Manager Dashboard</h3>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(DASH_URL, "_blank")}>
            <ExternalLink className="w-3.5 h-3.5" /> Open Manager Dashboard
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Sign in to the Manager Dashboard with the onboarding login above (or the owner's login) and work
          through each item below. Each row shows live status — click Refresh above after making changes there.
        </p>
        {statusError ? (
          <div className="text-center py-4">
            <p className="text-sm text-destructive mb-2">{statusError}</p>
            <Button variant="outline" size="sm" onClick={fetchStatus}>Retry</Button>
          </div>
        ) : statusLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="divide-y divide-border">
            {DASHBOARD_STEPS.map((step) => {
              const check = checksByKey.get(step.key);
              return (
                <div key={step.key} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{check?.label ?? step.key}</p>
                    <p className="text-xs text-muted-foreground">{step.instruction}</p>
                    {check && <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>}
                  </div>
                  {check && <GoLiveStatusBadge status={check.status} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* (c.5) Go-live manual confirmations -- things the system cannot
          observe automatically (POST .../onboarding/confirm). */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold">Go-Live Confirmations</h3>
        <p className="text-xs text-muted-foreground">
          Confirm each of these in person, once you've actually checked it — the system can't observe any of them on its own.
        </p>
        {statusError ? null : statusLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : (
          <div className="divide-y divide-border">
            {MANUAL_CONFIRM_ITEMS.map(({ item, checkKey, label }) => {
              const check = checksByKey.get(checkKey);
              if (check?.status === "n/a") return null;
              const sessionConfirmation = confirmedThisSession[item];
              return (
                <div key={item} className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      {check && <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>}
                      {sessionConfirmation && (
                        <p className="text-xs text-success mt-0.5">
                          Confirmed by you, {formatDateTime(sessionConfirmation.confirmed_at)}
                          {sessionConfirmation.note ? ` — "${sessionConfirmation.note}"` : ""}
                        </p>
                      )}
                    </div>
                    {check && <GoLiveStatusBadge status={check.status} />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 text-xs flex-1"
                      placeholder="Optional note"
                      value={confirmNotes[item] ?? ""}
                      onChange={(e) => setConfirmNotes((prev) => ({ ...prev, [item]: e.target.value }))}
                    />
                    <Button
                      size="sm" variant="outline"
                      disabled={confirmingItem === item}
                      onClick={() => handleConfirmItem(item)}
                    >
                      {confirmingItem === item ? "Confirming…" : check?.status === "pass" ? "Re-confirm" : "Confirm"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* (d) Go-live */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold">Go-Live</h3>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchStatus} disabled={statusLoading}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {statusError ? null : statusLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : status ? (
          <>
            <div className="flex items-center gap-2">
              {status.ready ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-warning" />}
              <p className="text-sm font-medium">
                {status.ready ? "Ready to hand over." : `${status.go_live.failed} check(s) still failing.`}
              </p>
            </div>

            {failingChecks.length > 0 && (
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                {failingChecks.map((c) => (
                  <li key={c.key}><span className="text-foreground font-medium">{c.label}:</span> {c.detail}</li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2 pt-2 flex-wrap">
              <Button disabled={!status.ready} onClick={() => setCompleteOpen(true)}>
                Complete Handover
              </Button>
              {!status.ready && (
                <p className="text-xs text-muted-foreground">
                  Resolve every failing check above before you can hand this restaurant over.
                </p>
              )}
              {isSuperAdmin && !status.ready && (
                <Button variant="destructive" onClick={() => setForceOpen(true)}>
                  Force Complete (Super Admin)
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>

      <CreateOwnerModal
        open={ownerModalOpen}
        onClose={() => setOwnerModalOpen(false)}
        businessId={business.id}
        onSuccess={() => { fetchUsers(); fetchStatus(); }}
      />
      <CreateOwnerModal
        open={onboardingLoginModalOpen}
        onClose={() => setOnboardingLoginModalOpen(false)}
        businessId={business.id}
        onboardingAccount
        onSuccess={() => { fetchUsers(); }}
      />

      <Dialog open={!!resetResult} onOpenChange={(v) => !v && setResetResult(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Password Reset</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this temporary password with <span className="font-medium text-foreground">{resetResult?.email}</span> now
              — it will not be shown again.
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

      <Dialog open={completeOpen} onOpenChange={(v) => !v && setCompleteOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Complete Handover</DialogTitle>
            <DialogDescription>
              This deactivates your temporary "NextGen Onboarding" login for this restaurant and you will lose
              access to it immediately. The owner keeps their own login. This cannot be undone from here.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>Cancel</Button>
            <Button disabled={completing} onClick={() => handleComplete(false)}>
              {completing ? "Completing…" : "Confirm Handover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={forceOpen}
        onOpenChange={(v) => {
          if (!v) {
            setForceOpen(false);
            setForceAck(false);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Force Complete Onboarding</DialogTitle>
            <DialogDescription>
              This hands this restaurant over even though {status?.go_live.failed ?? 0} go-live check(s) are still
              failing. Only do this if you know why — the tenant may not actually work end to end yet.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={forceAck} onChange={(e) => setForceAck(e.target.checked)} />
            I understand this bypasses failing go-live checks.
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setForceOpen(false); setForceAck(false); }}>Cancel</Button>
            <Button variant="destructive" disabled={completing || !forceAck} onClick={() => handleComplete(true)}>
              {completing ? "Completing…" : "Force Complete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
