import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsApi } from "@/api/events";
import type { EventDay, EventDetail } from "@/types/events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventErrorMessage, mergeRange, dayRange } from "@/lib/events";
import { toast } from "sonner";

const MAX_DAYS = 366;

function sameDays(a: EventDay[], b: EventDay[]) {
  return a.length === b.length && a.every((d, i) => d.day === b[i].day && d.is_billable === b[i].is_billable);
}

export function EventCalendarTab({ event }: { event: EventDetail }) {
  const qc = useQueryClient();
  const server = [...event.days].sort((a, b) => a.day.localeCompare(b.day));
  const [days, setDays] = useState<EventDay[]>(server);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [saveError, setSaveError] = useState("");

  const mut = useMutation({
    mutationFn: () => eventsApi.replaceCalendar(event.id, days),
    onSuccess: (updated) => {
      qc.setQueryData(["event", event.id], updated);
      setDays([...updated.days].sort((a, b) => a.day.localeCompare(b.day)));
      setSaveError("");
      toast.success("Calendar saved");
    },
    onError: (err) => setSaveError(eventErrorMessage(err, "Failed to save calendar")),
  });

  const generate = () => {
    setRangeError("");
    if (!start || !end) return setRangeError("Pick both a first and a last day");
    const n = dayRange(start, end).length;
    if (n === 0) return setRangeError("The last day must not be before the first day");
    const merged = mergeRange(days, start, end);
    if (merged.length > MAX_DAYS) return setRangeError(`A calendar can have at most ${MAX_DAYS} days`);
    setDays(merged);
  };

  const dirty = !sameDays(days, server);
  const billable = days.filter((d) => d.is_billable).length;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">Add a date range</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cal-start">First day</Label>
            <Input id="cal-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cal-end">Last day</Label>
            <Input id="cal-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <Button type="button" variant="outline" onClick={generate}>Add days</Button>
        </div>
        <p className="text-xs text-muted-foreground">New days are billable. Days already in the calendar keep their setting.</p>
        {rangeError && <p role="alert" className="text-sm text-destructive">{rangeError}</p>}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm text-muted-foreground">{days.length} days, {billable} billable</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!dirty || mut.isPending} onClick={() => { setDays(server); setSaveError(""); }}>Discard changes</Button>
            <Button size="sm" disabled={!dirty || mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? "Saving…" : "Save calendar"}
            </Button>
          </div>
        </div>
        {saveError && <p role="alert" className="text-sm text-destructive px-4 py-3 border-b border-border">{saveError}</p>}
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No days yet. Add a date range above.</p>
        ) : (
          <ul className="divide-y divide-border max-h-[28rem] overflow-y-auto">
            {days.map((d) => (
              <li key={d.day} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="text-sm tabular-nums">{d.day}</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={d.is_billable}
                      onChange={(e) => setDays((cur) => cur.map((x) => (x.day === d.day ? { ...x, is_billable: e.target.checked } : x)))}
                    />
                    Billable <span className="sr-only">on {d.day}</span>
                  </label>
                  <Button variant="ghost" size="sm" aria-label={`Remove ${d.day}`} onClick={() => setDays((cur) => cur.filter((x) => x.day !== d.day))}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        A day inside a paid vendor subscription cannot be removed or made non-billable, and a paid range cannot gain a day. The server rejects those changes with a clear message.
      </p>
    </div>
  );
}
