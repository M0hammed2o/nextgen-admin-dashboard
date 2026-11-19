import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, Store, Upload } from "lucide-react";
import { eventsApi } from "@/api/events";
import type { EventDetail, EventSubscription, EventVendorItem } from "@/types/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/EmptyState";
import { NativeSelect } from "./fields";
import { BulkOnboardDialog } from "./BulkOnboardDialog";
import { eventErrorMessage, formatRands } from "@/lib/events";
import { toast } from "sonner";

export const VENDOR_PAGE_SIZE = 25;
export const FLAGGED_OFFLINE_DESCRIPTION =
  "Offline sales flagged for review (e.g. synced on an unpaid day, synced late, cashier differs from syncer). The vendor's owner acknowledges them in their dashboard.";
export const SHARED_CLAIM_WARNING = "Same reference claimed by another vendor � verify before marking paid.";
const VENDOR_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "CANCELLED"];

type Dialog_ =
  | { kind: "quote"; vendor: EventVendorItem }
  | { kind: "pay"; vendor: EventVendorItem; sub: EventSubscription }
  | { kind: "suspend"; vendor: EventVendorItem }
  | { kind: "cancel"; vendor: EventVendorItem }
  | { kind: "void"; vendor: EventVendorItem; sub: EventSubscription }
  | null;

function StallCell({ eventId, vendor, onSaved }: { eventId: string; vendor: EventVendorItem; onSaved: () => void }) {
  const [value, setValue] = useState(vendor.stall_code ?? "");
  const [error, setError] = useState("");
  useEffect(() => setValue(vendor.stall_code ?? ""), [vendor.stall_code]);
  const mut = useMutation({
    mutationFn: () => eventsApi.setStall(eventId, vendor.vendor_id, value.trim()),
    onSuccess: () => { setError(""); toast.success("Stall saved"); onSaved(); },
    onError: (err) => setError(eventErrorMessage(err, "Failed to save stall")),
  });
  const changed = value.trim() !== (vendor.stall_code ?? "");
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => { e.preventDefault(); if (changed && value.trim()) mut.mutate(); }}
    >
      <Input
        aria-label={`Stall for ${vendor.business_name}`}
        className="h-8 w-24"
        value={value}
        maxLength={64}
        onChange={(e) => setValue(e.target.value)}
      />
      {changed && value.trim() && (
        <Button type="submit" size="sm" variant="outline" disabled={mut.isPending}>Save</Button>
      )}
      {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
    </form>
  );
}

function SubscriptionRow({ sub, onPay, onVoid }: { sub: EventSubscription; onPay: () => void; onVoid: () => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <span className="text-sm">
        {sub.starts_on} to {sub.ends_on}, {sub.billable_days} billable day{sub.billable_days === 1 ? "" : "s"},{" "}
        <strong>{formatRands(sub.amount_cents)}</strong>{" "}
        <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{sub.status}</span>
        {sub.status === "UNPAID" && sub.payment_claim_reference && (
          <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700">
            Claimed: {sub.payment_claim_reference}
            {sub.payment_claimed_at ? ` (${new Date(sub.payment_claimed_at).toLocaleString()})` : ""}
          </span>
        )}
        {sub.payment_claim_shared === true && (
          <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
            {SHARED_CLAIM_WARNING}
          </span>
        )}
      </span>
      <span className="flex gap-1">
        {sub.status === "UNPAID" && (
          <>
            <Button size="sm" variant="outline" onClick={onPay}>Mark paid</Button>
            <Button size="sm" variant="ghost" onClick={onVoid}>Void</Button>
          </>
        )}
      </span>
    </li>
  );
}

export function EventVendorsTab({ event }: { event: EventDetail }) {
  const qc = useQueryClient();
  const eventId = event.id;
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog_>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [claimsOnly, setClaimsOnly] = useState(false);

  // Debounce the search term; a new search always restarts at the first page.
  useEffect(() => {
    const next = search.trim();
    if (next === q) return;
    const t = setTimeout(() => { setQ(next); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search, q]);

  const params = { status: status || undefined, category: category || undefined, q: q || undefined, limit: VENDOR_PAGE_SIZE, offset: page * VENDOR_PAGE_SIZE };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["event-vendors", eventId, params],
    queryFn: () => eventsApi.listVendors(eventId, params),
    placeholderData: (prev) => prev,
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["event-vendors", eventId] });
    qc.invalidateQueries({ queryKey: ["event", eventId] });
    qc.invalidateQueries({ queryKey: ["event-revenue", eventId] });
  };

  const reinstateMut = useMutation({
    mutationFn: (v: EventVendorItem) => eventsApi.reinstateVendor(eventId, v.vendor_id),
    onSuccess: () => { toast.success("Vendor reinstated"); refreshAll(); },
    onError: (err) => toast.error(eventErrorMessage(err, "Failed to reinstate vendor")),
  });

  const total = data?.total ?? 0;
  const allItems = data?.items ?? [];
  // Client-side over the current page only: the API has no claim filter.
  const items = claimsOnly
    ? allItems.filter((v) => v.subscriptions.some((s) => s.status === "UNPAID" && s.payment_claim_reference))
    : allItems;
  const lastPage = Math.max(0, Math.ceil(total / VENDOR_PAGE_SIZE) - 1);
  const filtered = !!(status || category || q || claimsOnly);

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative">
            <Label htmlFor="vf-q" className="sr-only">Search vendors</Label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="vf-q" placeholder="Search name, code or stall…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
          <div>
            <Label htmlFor="vf-status" className="sr-only">Status</Label>
            <NativeSelect id="vf-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
              <option value="">All statuses</option>
              {VENDOR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="vf-cat" className="sr-only">Category</Label>
            <NativeSelect id="vf-cat" value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }}>
              <option value="">All categories</option>
              <option value="FOOD">Food</option>
              <option value="CLOTHING">Clothing</option>
            </NativeSelect>
          </div>
          <label className="flex items-center gap-1.5 text-sm h-9">
            <input type="checkbox" checked={claimsOnly} onChange={(e) => setClaimsOnly(e.target.checked)} />
            Has unconfirmed claim (this page)
          </label>
        </div>
        <Button onClick={() => setBulkOpen(true)} className="gap-1.5" disabled={event.status === "CANCELLED"}>
          <Upload className="w-4 h-4" /> Onboard vendors
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">Vendor</th>
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">Stall</th>
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Access</th>
                <th scope="col" className="text-right px-4 py-3 font-medium text-muted-foreground"><span className="sr-only">Manage</span></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>)}
                  </tr>
                ))
              ) : error ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <p className="text-sm text-destructive mb-3">{error instanceof Error ? error.message : "Failed to load vendors"}</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState
                    icon={Store}
                    title={filtered ? "No vendors match these filters." : "No vendors yet."}
                    description={filtered ? "Try a different search or filter." : "Onboard vendors from a CSV or the row editor."}
                    action={filtered ? undefined : { label: "Onboard vendors", onClick: () => setBulkOpen(true) }}
                  />
                </td></tr>
              ) : items.map((v) => (
                <VendorRows
                  key={v.vendor_id}
                  v={v}
                  eventId={eventId}
                  open={expanded === v.vendor_id}
                  onToggle={() => setExpanded((cur) => (cur === v.vendor_id ? null : v.vendor_id))}
                  onDialog={setDialog}
                  onReinstate={() => reinstateMut.mutate(v)}
                  reinstating={reinstateMut.isPending}
                  onSaved={refreshAll}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
          <span aria-live="polite">
            {total === 0 ? "0 vendors" : `${page * VENDOR_PAGE_SIZE + 1}–${Math.min(total, (page + 1) * VENDOR_PAGE_SIZE)} of ${total}`}
            {isFetching && !isLoading ? " (updating…)" : ""}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} aria-label="Previous page">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))} aria-label="Next page">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {dialog?.kind === "quote" && <QuoteDialog eventId={eventId} vendor={dialog.vendor} event={event} onClose={() => setDialog(null)} onDone={refreshAll} />}
      {dialog?.kind === "pay" && <MarkPaidDialog eventId={eventId} vendor={dialog.vendor} sub={dialog.sub} onClose={() => setDialog(null)} onDone={refreshAll} />}
      {dialog?.kind === "suspend" && <SuspendDialog eventId={eventId} vendor={dialog.vendor} onClose={() => setDialog(null)} onDone={refreshAll} />}
      {dialog?.kind === "void" && (
        <ConfirmAction
          title="Void this subscription?"
          body={`The ${formatRands(dialog.sub.amount_cents)} quote for ${dialog.vendor.business_name} (${dialog.sub.starts_on} to ${dialog.sub.ends_on}) will be voided. You can quote a new one afterwards.`}
          confirmLabel="Void subscription"
          action={() => eventsApi.voidSubscription(eventId, dialog.sub.id)}
          successMessage="Subscription voided"
          onClose={() => setDialog(null)}
          onDone={refreshAll}
        />
      )}
      {dialog?.kind === "cancel" && (
        <ConfirmAction
          title={`Cancel ${dialog.vendor.business_name}?`}
          body="Cancelling a vendor ends their access to this event straight away and stops new subscriptions being quoted for them. Paid subscriptions are not refunded automatically."
          confirmLabel="Cancel vendor"
          action={() => eventsApi.cancelVendor(eventId, dialog.vendor.vendor_id)}
          successMessage="Vendor cancelled"
          onClose={() => setDialog(null)}
          onDone={refreshAll}
        />
      )}
      <BulkOnboardDialog eventId={eventId} open={bulkOpen} onClose={() => setBulkOpen(false)} onImported={refreshAll} />
    </div>
  );
}

function VendorRows(props: {
  v: EventVendorItem; eventId: string; open: boolean; onToggle: () => void;
  onDialog: (d: Dialog_) => void; onReinstate: () => void; reinstating: boolean; onSaved: () => void;
}) {
  const { v, eventId, open, onToggle, onDialog, onReinstate, reinstating, onSaved } = props;
  const cancelled = v.status === "CANCELLED";
  const suspended = !!v.suspended_reason || v.status === "SUSPENDED";
  return (
    <>
      <tr className="border-b border-border hover:bg-muted/30">
        <td className="px-4 py-3">
          <div className="font-medium">{v.business_name}</div>
          <div className="text-xs text-muted-foreground">{v.business_code}</div>
        </td>
        <td className="px-4 py-3">{v.category}</td>
        <td className="px-4 py-3"><StallCell eventId={eventId} vendor={v} onSaved={onSaved} /></td>
        <td className="px-4 py-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">{v.status}</span>
          {!v.business_active && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Business inactive</span>}
          {(v.flagged_offline_orders ?? 0) > 0 && (
            <span
              title={FLAGGED_OFFLINE_DESCRIPTION}
              className="ml-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-medium"
            >
              {v.flagged_offline_orders} flagged offline sale{v.flagged_offline_orders === 1 ? "" : "s"}
            </span>
          )}
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">{v.access_level ?? "—"}</td>
        <td className="px-4 py-3 text-right">
          <Button variant="outline" size="sm" aria-expanded={open} aria-label={`${open ? "Hide" : "Manage"} ${v.business_name}`} onClick={onToggle}>
            {open ? "Hide" : "Manage"}
          </Button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={6} className="px-4 py-3 space-y-3">
            {(v.flagged_offline_orders ?? 0) > 0 && (
              <p className="text-sm text-amber-700">{FLAGGED_OFFLINE_DESCRIPTION}</p>
            )}
            {suspended && v.suspended_reason && (
              <p className="text-sm text-destructive">Suspended: {v.suspended_reason}</p>
            )}
            <div>
              <h3 className="text-sm font-semibold">Subscriptions</h3>
              {v.subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-1">No subscriptions yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {v.subscriptions.map((s) => (
                    <SubscriptionRow
                      key={s.id}
                      sub={s}
                      onPay={() => onDialog({ kind: "pay", vendor: v, sub: s })}
                      onVoid={() => onDialog({ kind: "void", vendor: v, sub: s })}
                    />
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={cancelled} onClick={() => onDialog({ kind: "quote", vendor: v })}>Quote subscription</Button>
              {suspended ? (
                <Button size="sm" variant="outline" disabled={reinstating || cancelled} onClick={onReinstate}>Reinstate</Button>
              ) : (
                <Button size="sm" variant="outline" disabled={cancelled} onClick={() => onDialog({ kind: "suspend", vendor: v })}>Suspend</Button>
              )}
              <Button size="sm" variant="destructive" disabled={cancelled} onClick={() => onDialog({ kind: "cancel", vendor: v })}>Cancel vendor</Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function QuoteDialog({ eventId, vendor, event, onClose, onDone }: { eventId: string; vendor: EventVendorItem; event: EventDetail; onClose: () => void; onDone: () => void }) {
  const first = event.days[0]?.day ?? "";
  const [start, setStart] = useState(first);
  const [end, setEnd] = useState(first);
  const [error, setError] = useState("");
  const [quoted, setQuoted] = useState<{ amount_cents: number; billable_days: number } | null>(null);
  const mut = useMutation({
    mutationFn: () => eventsApi.quoteSubscription(eventId, vendor.vendor_id, start, end),
    onSuccess: (r) => { setQuoted(r); setError(""); toast.success(`Quoted ${formatRands(r.amount_cents)}`); onDone(); },
    onError: (err) => setError(eventErrorMessage(err, "Failed to quote subscription")),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Quote subscription</DialogTitle>
          <DialogDescription>{vendor.business_name}: the price is calculated by the server from the event calendar.</DialogDescription>
        </DialogHeader>
        {quoted ? (
          <div className="space-y-4">
            <p className="text-sm">Quoted <strong>{formatRands(quoted.amount_cents)}</strong> for {quoted.billable_days} billable day{quoted.billable_days === 1 ? "" : "s"} (unpaid).</p>
            <div className="flex justify-end"><Button onClick={onClose}>Done</Button></div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setError(""); if (!start || !end) return setError("Pick both dates"); if (end < start) return setError("The last day must not be before the first day"); mut.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="q-start">First day</Label>
                <Input id="q-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="q-end">Last day</Label>
                <Input id="q-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Quoting…" : "Get quote"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MarkPaidDialog({ eventId, vendor, sub, onClose, onDone }: { eventId: string; vendor: EventVendorItem; sub: EventSubscription; onClose: () => void; onDone: () => void }) {
  const [ref, setRef] = useState(sub.payment_claim_reference ?? "");
  const [error, setError] = useState("");
  const mut = useMutation({
    mutationFn: () => eventsApi.markPaid(eventId, sub.id, ref.trim()),
    onSuccess: () => { toast.success("Subscription marked paid"); onDone(); onClose(); },
    onError: (err) => { const m = eventErrorMessage(err, "Failed to mark paid"); setError(m); toast.error(m); },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark paid</DialogTitle>
          <DialogDescription>
            {vendor.business_name}: {formatRands(sub.amount_cents)} for {sub.starts_on} to {sub.ends_on}. Vendor access starts straight away.
          </DialogDescription>
        </DialogHeader>
        {sub.payment_claim_shared === true && (
          <p role="alert" className="text-sm text-destructive font-medium">{SHARED_CLAIM_WARNING}</p>
        )}
        <form onSubmit={(e) => { e.preventDefault(); setError(""); if (!ref.trim()) return setError("A payment reference is required"); mut.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pay-ref">Payment reference</Label>
            <Input id="pay-ref" value={ref} maxLength={255} onChange={(e) => setRef(e.target.value)} placeholder="e.g. EFT-20260118-0042" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Mark paid"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SuspendDialog({ eventId, vendor, onClose, onDone }: { eventId: string; vendor: EventVendorItem; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const mut = useMutation({
    mutationFn: () => eventsApi.suspendVendor(eventId, vendor.vendor_id, reason.trim()),
    onSuccess: () => { toast.success("Vendor suspended"); onDone(); onClose(); },
    onError: (err) => { const m = eventErrorMessage(err, "Failed to suspend vendor"); setError(m); toast.error(m); },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Suspend vendor</DialogTitle>
          <DialogDescription>{vendor.business_name} loses access until you reinstate them.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); setError(""); if (!reason.trim()) return setError("A reason is required"); mut.mutate(); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sus-reason">Reason</Label>
            <Input id="sus-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? "Suspending…" : "Suspend vendor"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmAction(props: {
  title: string; body: string; confirmLabel: string; successMessage: string;
  action: () => Promise<unknown>; onClose: () => void; onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open onOpenChange={(o) => !o && !busy && props.onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{props.title}</AlertDialogTitle>
          <AlertDialogDescription>{props.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Back</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await props.action();
                toast.success(props.successMessage);
                props.onDone();
                props.onClose();
              } catch (err) {
                toast.error(eventErrorMessage(err, "Action failed"));
                setBusy(false);
              }
            }}
          >
            {busy ? "Working…" : props.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
