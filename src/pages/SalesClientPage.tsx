import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { commercialApi } from "@/api/commercial";
import { businessesApi } from "@/api/businesses";
import type { ClientRow, CommercialInvoice, PriceCatalogueEntry } from "@/types/commercial";
import type { OnboardingBusiness } from "@/types/business";
import type { OnboardingStatusResponse } from "@/types/onboarding";
import { AccountStatusBadge } from "@/components/AccountStatusBadge";
import { formatCentsAsRands } from "@/lib/money";
import { deriveStatusBanner, BANNER_STYLES } from "@/lib/accountStatus";
import { formatDate } from "@/lib/format";
import { MODULE_FLAGS } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExtendTrialDialog } from "@/components/modals/ExtendTrialDialog";
import { InvoiceEditorDialog } from "@/components/modals/InvoiceEditorDialog";
import { RecordPaymentDialog } from "@/components/modals/RecordPaymentDialog";
import { CancelInvoiceDialog } from "@/components/modals/CancelInvoiceDialog";
import { ArrowLeft, Download, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Action failed";
}

function isScopeLost(err: unknown): boolean {
  // BUSINESS_NOT_FOUND from get_business_scoped -- for an ONBOARDER this
  // means "handed over, CONFIGURATION access ended" (see
  // admin_api/app/core/deps.py::get_business_scoped's docstring), never a
  // real failure to surface as an error banner. Distinguishing this from
  // an actual failure is exactly why client.ts now attaches `.code`.
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "BUSINESS_NOT_FOUND";
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  AWAITING_PAYMENT: "Awaiting payment",
  SENT: "Sent",
  OVERDUE: "Overdue",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

const INVOICE_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  AWAITING_PAYMENT: "bg-warning/10 text-warning",
  SENT: "bg-primary/10 text-primary",
  OVERDUE: "bg-destructive/10 text-destructive",
  PAID: "bg-success/10 text-success",
  CANCELLED: "bg-muted text-muted-foreground",
};

export default function SalesClientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, isOnboarder } = useAuth();

  const [clientRow, setClientRow] = useState<ClientRow | null>(null);
  const [clientLoading, setClientLoading] = useState(true);
  const [clientError, setClientError] = useState("");

  const [invoices, setInvoices] = useState<CommercialInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState("");

  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusResponse | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [onboardingError, setOnboardingError] = useState("");
  const [onboardingScopeLost, setOnboardingScopeLost] = useState(false);

  const [configDetails, setConfigDetails] = useState<OnboardingBusiness | null>(null);
  const [configScopeLost, setConfigScopeLost] = useState(false);

  const [priceCatalogue, setPriceCatalogue] = useState<PriceCatalogueEntry[]>([]);
  const [trialExtensionDaysUsed, setTrialExtensionDaysUsed] = useState<number | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);

  const [extendOpen, setExtendOpen] = useState(false);
  const [invoiceEditor, setInvoiceEditor] = useState<{ open: boolean; invoice: CommercialInvoice | null }>({ open: false, invoice: null });
  const [paymentDialog, setPaymentDialog] = useState<CommercialInvoice | null>(null);
  const [cancelDialog, setCancelDialog] = useState<CommercialInvoice | null>(null);

  const fetchClient = () => {
    if (!id) return;
    setClientLoading(true);
    setClientError("");
    commercialApi.getClient(id)
      .then(setClientRow)
      .catch((e: unknown) => setClientError(errorMessage(e)))
      .finally(() => setClientLoading(false));
  };

  const fetchInvoices = () => {
    if (!id) return;
    setInvoicesLoading(true);
    setInvoicesError("");
    commercialApi.listInvoices({ business_id: id })
      .then(setInvoices)
      .catch((e: unknown) => setInvoicesError(errorMessage(e)))
      .finally(() => setInvoicesLoading(false));
  };

  const fetchOnboardingStatus = () => {
    if (!id) return;
    setOnboardingLoading(true);
    setOnboardingError("");
    businessesApi.getOnboardingStatus(id)
      .then((s) => { setOnboardingStatus(s); setOnboardingScopeLost(false); })
      .catch((e: unknown) => {
        if (isScopeLost(e)) { setOnboardingScopeLost(true); setOnboardingStatus(null); }
        else setOnboardingError(errorMessage(e));
      })
      .finally(() => setOnboardingLoading(false));
  };

  const fetchConfigDetails = () => {
    if (!id) return;
    businessesApi.getOnboarding(id)
      .then((b) => { setConfigDetails(b); setConfigScopeLost(false); })
      .catch((e: unknown) => {
        if (isScopeLost(e)) { setConfigScopeLost(true); setConfigDetails(null); }
        // A real error here is non-fatal to the whole page -- plan/status
        // still render from clientRow; modules just won't show.
      });
  };

  useEffect(() => {
    fetchClient();
    fetchInvoices();
    fetchOnboardingStatus();
    fetchConfigDetails();
    commercialApi.getPriceCatalogue().then(setPriceCatalogue).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStartTrial = async () => {
    if (!id) return;
    setStartingTrial(true);
    try {
      const result = await businessesApi.startTrial(id);
      toast.success(result.trial_ends_at ? `Trial started — ends ${formatDate(result.trial_ends_at)}` : "Trial started");
      setTrialExtensionDaysUsed(0);
      fetchClient();
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      setStartingTrial(false);
    }
  };

  // Only show the full-page skeleton/error state on the FIRST load, before
  // clientRow has ever been populated. A background refetch (e.g. after
  // InvoiceEditorDialog's onSaved calls fetchClient() to refresh trial/plan
  // info) sets clientLoading back to true, but must not unmount the page
  // tree -- doing so unmounts any open dialog and wipes its in-progress
  // state, even though the save itself succeeded server-side. See
  // KNOWN_BUGS.md BUG-0068.
  if (clientLoading && !clientRow) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!clientRow) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{clientError || "This client isn't in your scope, or doesn't exist."}</p>
        <Button variant="outline" onClick={() => navigate("/sales/clients")}>Back to Clients</Button>
      </div>
    );
  }

  const banner = deriveStatusBanner(clientRow);
  const hasTrial = !!clientRow.trial_ends_at;
  const showOnboardingLink = configDetails ? configDetails.onboarding_completed_at === null : true;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/sales/clients")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{clientRow.business_name}</h2>
          <p className="text-xs text-muted-foreground font-mono">{clientRow.business_id}</p>
        </div>
        <AccountStatusBadge status={clientRow.account_status} />
      </div>

      {banner && (
        <div className={`border rounded-lg px-4 py-2.5 text-sm font-medium ${BANNER_STYLES[banner.urgency]}`}>
          {banner.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Plan & Modules */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">Plan &amp; Modules</h3>
          <p className="text-sm">Plan: <span className="font-medium">{clientRow.plan}</span></p>
          {configDetails ? (
            <ul className="text-xs space-y-1 text-muted-foreground">
              {MODULE_FLAGS.map((f) => (
                <li key={f.key} className="flex items-center justify-between">
                  <span>{f.label}</span>
                  <span className={configDetails[f.key] ? "text-success font-medium" : "text-muted-foreground"}>
                    {configDetails[f.key] ? "Enabled" : "Off"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              {configScopeLost
                ? "Module configuration isn't available here anymore — this restaurant has already been handed over. A Super Admin can still view/edit modules."
                : "Module configuration isn't available right now."}
            </p>
          )}
        </div>

        {/* Trial */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold">Trial</h3>
          {hasTrial ? (
            <>
              <p className="text-sm">
                Ends: <span className="font-medium">{formatDate(clientRow.trial_ends_at)}</span>
                {clientRow.days_remaining !== null && (
                  <span className="text-muted-foreground"> ({clientRow.days_remaining}d left)</span>
                )}
              </p>
              <Button variant="outline" size="sm" onClick={() => setExtendOpen(true)}>Extend Trial</Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">No trial has been started for this client.</p>
              <Button size="sm" disabled={startingTrial} onClick={handleStartTrial}>
                {startingTrial ? "Starting…" : "Start 14-Day Free Trial"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Onboarding readiness */}
      {onboardingLoading ? (
        <Skeleton className="h-16 rounded-xl" />
      ) : onboardingScopeLost ? null : onboardingError ? (
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-sm text-destructive mb-2">{onboardingError}</p>
          <Button variant="outline" size="sm" onClick={fetchOnboardingStatus}>Retry</Button>
        </div>
      ) : onboardingStatus ? (
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold">{onboardingStatus.go_live.readiness.label}</h3>
            <p className="text-xs text-muted-foreground">{onboardingStatus.go_live.readiness.percent}% of go-live checks complete</p>
          </div>
          {showOnboardingLink && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/onboarding/${clientRow.business_id}`)}>
              <ExternalLink className="w-3.5 h-3.5" /> Open Onboarding Workspace
            </Button>
          )}
        </div>
      ) : null}

      {/* Invoices */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold">Invoices</h3>
          <Button size="sm" className="gap-1.5" onClick={() => setInvoiceEditor({ open: true, invoice: null })}>
            <Plus className="w-3.5 h-3.5" /> New Invoice
          </Button>
        </div>

        {invoicesLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : invoicesError ? (
          <div className="text-center py-4">
            <p className="text-sm text-destructive mb-2">{invoicesError}</p>
            <Button variant="outline" size="sm" onClick={fetchInvoices}>Retry</Button>
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet. Click "New Invoice" to create the first draft.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Number</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Due</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Total</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const canCancel = inv.status === "DRAFT" || isSuperAdmin;
                  return (
                    <tr key={inv.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{inv.invoice_number ?? "(draft)"}</td>
                      <td className="py-2 pr-4">{formatDate(inv.invoice_date)}</td>
                      <td className="py-2 pr-4">{formatDate(inv.due_date)}</td>
                      <td className="py-2 pr-4 text-right">{formatCentsAsRands(inv.total_cents)}</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INVOICE_STATUS_STYLES[inv.status]}`}>
                          {INVOICE_STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td className="py-2 text-right space-x-1 whitespace-nowrap">
                        {inv.status === "DRAFT" && (
                          <Button variant="ghost" size="sm" onClick={() => setInvoiceEditor({ open: true, invoice: inv })}>Edit</Button>
                        )}
                        {inv.status !== "DRAFT" && (
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => commercialApi.downloadInvoicePdf(inv.id, inv.invoice_number ?? undefined).catch((e) => toast.error(errorMessage(e)))}>
                            <Download className="w-3 h-3" /> PDF
                          </Button>
                        )}
                        {(inv.status === "AWAITING_PAYMENT" || inv.status === "SENT" || inv.status === "OVERDUE") && (
                          <Button variant="ghost" size="sm" onClick={() => setPaymentDialog(inv)}>Record Payment</Button>
                        )}
                        {inv.status === "AWAITING_PAYMENT" && (
                          <Button
                            variant="ghost" size="sm"
                            onClick={() =>
                              commercialApi.markSent(inv.id)
                                .then((updated) => setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i))))
                                .catch((e) => toast.error(errorMessage(e)))
                            }
                          >
                            Mark Sent
                          </Button>
                        )}
                        {canCancel && inv.status !== "PAID" && inv.status !== "CANCELLED" && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setCancelDialog(inv)}>Cancel</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExtendTrialDialog
        open={extendOpen}
        onClose={() => setExtendOpen(false)}
        businessId={clientRow.business_id}
        isOnboarder={isOnboarder}
        extensionDaysUsed={trialExtensionDaysUsed}
        onSuccess={(result) => { setTrialExtensionDaysUsed(result.trial_extension_days_total); fetchClient(); }}
      />

      <InvoiceEditorDialog
        open={invoiceEditor.open}
        onClose={() => setInvoiceEditor({ open: false, invoice: null })}
        businessId={clientRow.business_id}
        businessPlan={clientRow.plan}
        priceCatalogue={priceCatalogue}
        existingInvoice={invoiceEditor.invoice}
        onSaved={(updated) => {
          setInvoices((prev) => {
            const exists = prev.some((i) => i.id === updated.id);
            return exists ? prev.map((i) => (i.id === updated.id ? updated : i)) : [updated, ...prev];
          });
          fetchClient();
        }}
      />

      <RecordPaymentDialog
        open={!!paymentDialog}
        onClose={() => setPaymentDialog(null)}
        invoice={paymentDialog}
        onSuccess={(updated) => {
          setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          fetchClient();
        }}
      />

      <CancelInvoiceDialog
        open={!!cancelDialog}
        onClose={() => setCancelDialog(null)}
        invoice={cancelDialog}
        onSuccess={(updated) => setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
      />
    </div>
  );
}
