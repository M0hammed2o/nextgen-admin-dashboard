import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsApi } from "@/api/events";
import type { EventDetail, EventStatus } from "@/types/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EventStatusBadge } from "./fields";
import { EventRegistrationSection } from "./EventRegistrationSection";
import { eventErrorMessage, formatRands } from "@/lib/events";
import { toast } from "sonner";

const STATUSES: EventStatus[] = ["DRAFT", "OPEN", "CLOSED", "CANCELLED"];

const CONFIRM_COPY: Partial<Record<EventStatus, { title: string; body: string }>> = {
  CLOSED: {
    title: "Close this event?",
    body: "Closing the event ends trading access for vendors once the event is over. Vendors keep their data. This can be changed back by an admin.",
  },
  CANCELLED: {
    title: "Cancel this event?",
    body: "Cancelling ends vendor access: every vendor at this event loses access to their event account straight away. Paid subscriptions are not refunded automatically.",
  },
};

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

export function EventOverviewTab({ event }: { event: EventDetail }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<EventStatus | null>(null);
  const [name, setName] = useState(event.name);
  const [venue, setVenue] = useState(event.venue ?? "");
  const [notes, setNotes] = useState(event.notes ?? "");
  const [prepDays, setPrepDays] = useState(String(event.prep_days ?? 14));
  const [formError, setFormError] = useState("");

  const refreshed = (updated: EventDetail) => {
    qc.setQueryData(["event", event.id], updated);
    qc.invalidateQueries({ queryKey: ["events"] });
  };

  const statusMut = useMutation({
    mutationFn: (s: EventStatus) => eventsApi.setStatus(event.id, s),
    onSuccess: (updated) => { refreshed(updated); toast.success(`Event is now ${updated.status}`); },
    onError: (err) => toast.error(eventErrorMessage(err, "Failed to change status")),
    onSettled: () => setPending(null),
  });

  const saveMut = useMutation({
    mutationFn: (body: Parameters<typeof eventsApi.update>[1]) => eventsApi.update(event.id, body),
    onSuccess: (updated) => { refreshed(updated); toast.success("Event details saved"); },
    onError: (err) => {
      const m = eventErrorMessage(err, "Failed to save event");
      setFormError(m);
      toast.error(m);
    },
  });

  const requestStatus = (s: EventStatus) => {
    if (CONFIRM_COPY[s]) setPending(s);
    else statusMut.mutate(s);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const prep = Number(prepDays);
    if (!Number.isInteger(prep) || prep < 0 || prep > 90) return setFormError("Prep days must be a whole number from 0 to 90");
    if (name.trim().length < 2) return setFormError("Event name must be at least 2 characters");
    saveMut.mutate({ name: name.trim(), venue: venue.trim() || null, notes: notes.trim() || null, prep_days: prep });
  };

  const counts = Object.entries(event.vendor_counts ?? {});

  return (
    <div className="space-y-6">
      <section aria-labelledby="status-h" className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h2 id="status-h" className="text-sm font-semibold">Status</h2>
          <EventStatusBadge status={event.status} />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Set event status">
          {STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === event.status ? "default" : "outline"}
              disabled={s === event.status || statusMut.isPending}
              onClick={() => requestStatus(s)}
            >
              {s === "OPEN" ? "Open" : s === "DRAFT" ? "Draft" : s === "CLOSED" ? "Close" : "Cancel event"}
            </Button>
          ))}
        </div>
      </section>

      <EventRegistrationSection event={event} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Paid" value={formatRands(event.revenue_paid_cents)} hint="VAT-inclusive" />
        <StatCard label="Outstanding" value={formatRands(event.revenue_outstanding_cents)} hint="Quoted, not yet paid" />
        <StatCard label="Active vendors" value={String(event.active_vendors)} hint={counts.map(([k, v]) => `${v} ${k.toLowerCase()}`).join(", ") || undefined} />
        <StatCard label="Billable days" value={String(event.billable_day_count)} hint={`Food ${formatRands(event.food_day_rate_cents)} / Clothing ${formatRands(event.clothing_day_rate_cents)} per day`} />
      </div>

      <form onSubmit={save} className="bg-card border border-border rounded-xl p-4 space-y-4" aria-label="Event details">
        <h2 className="text-sm font-semibold">Details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ov-name">Name</Label>
            <Input id="ov-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ov-venue">Venue</Label>
            <Input id="ov-venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ov-prep">Prep days</Label>
            <Input id="ov-prep" type="number" min={0} max={90} value={prepDays} onChange={(e) => setPrepDays(e.target.value)} />
            <p className="text-xs text-muted-foreground">Days before the first event day that vendors can set up their stall (0 to 90).</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ov-notes">Notes</Label>
          <Textarea id="ov-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={saveMut.isPending}>{saveMut.isPending ? "Saving…" : "Save details"}</Button>
        </div>
      </form>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending ? CONFIRM_COPY[pending]?.title : ""}</AlertDialogTitle>
            <AlertDialogDescription>{pending ? CONFIRM_COPY[pending]?.body : ""}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep as {event.status.toLowerCase()}</AlertDialogCancel>
            <AlertDialogAction onClick={() => pending && statusMut.mutate(pending)}>
              {pending === "CANCELLED" ? "Cancel event" : "Close event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
