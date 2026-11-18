import type { EventDay, EventStatus } from "@/types/events";

/** Cents -> "R 1 900.00". Display only; the API is always the source of truth for amounts. */
export function formatRands(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  const neg = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const frac = (abs % 100).toString().padStart(2, "0");
  return `${neg ? "-" : ""}R ${whole}.${frac}`;
}

/** "100" / "100.5" -> cents; null when not a valid non-negative rand amount. */
export function randsToCents(input: string): number | null {
  const t = input.trim().replace(/\s/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}

/** Inclusive list of YYYY-MM-DD between two dates (UTC arithmetic: no DST/timezone drift). */
export function dayRange(start: string, end: string): string[] {
  const s = Date.parse(`${start}T00:00:00Z`);
  const e = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return [];
  const out: string[] = [];
  for (let t = s; t <= e; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** Merge a generated range into existing days; existing days keep their billable flag. */
export function mergeRange(existing: EventDay[], start: string, end: string): EventDay[] {
  const map = new Map(existing.map((d) => [d.day, d.is_billable]));
  for (const d of dayRange(start, end)) if (!map.has(d)) map.set(d, true);
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, is_billable]) => ({ day, is_billable }));
}

export const STATUS_STYLES: Record<EventStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  OPEN: "bg-green-500/10 text-green-700",
  CLOSED: "bg-amber-500/10 text-amber-700",
  CANCELLED: "bg-destructive/10 text-destructive",
};

/** CSV cell: always quoted, embedded quotes doubled. Values are not altered: a temporary password must stay exact. */
export function csvCell(v: string | null | undefined): string {
  return `"${(v ?? "").replace(/"/g, '""')}"`;
}

/** Message for an API error, with friendlier copy for the known event-money / calendar codes. */
export function eventErrorMessage(err: unknown, fallback: string): string {
  const e = err as (Error & { code?: string }) | undefined;
  switch (e?.code) {
    case "PAYMENT_REFERENCE_USED":
      return "That payment reference has already been used for another subscription. Check the reference and try again.";
    case "QUOTE_STALE":
      return "The event calendar changed since this subscription was quoted. Void it and quote it again.";
    case "ALREADY_PAID":
      return "This subscription is already paid under a different reference.";
    case "SUBSCRIPTION_VOID":
      return "A void subscription cannot be paid.";
    case "STALL_TAKEN":
      return "That stall is already allocated to another vendor at this event.";
    case "PAID_DAY_REMOVED":
      return `${e.message} (a vendor has paid for this day, so it cannot be removed or made non-billable)`;
    case "PAID_RANGE_GAINS_DAY":
      return `${e.message} (the day would be added to a range a vendor already paid for)`;
    default:
      return e?.message || fallback;
  }
}
