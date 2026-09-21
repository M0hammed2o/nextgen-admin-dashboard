// Mirrors backend/app/billing/account_status.py's derived AccountStatus and
// alert vocabulary EXACTLY -- these are the only values the API ever sends,
// so anything not in this list is a contract mismatch, not a value this UI
// needs to gracefully degrade for.
import type { AccountStatusValue, AccountAlert } from "@/types/commercial";
import { formatCentsAsRands } from "@/lib/money";

export const ACCOUNT_STATUS_LABELS: Record<AccountStatusValue, string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  PAYMENT_DUE: "Payment due",
  OVERDUE: "Overdue",
  EXPIRED: "Expired",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
};

// Trial blue, Active green, Payment due amber, Overdue red, Expired
// grey/red, Suspended dark -- per this task's brief.
export const ACCOUNT_STATUS_STYLES: Record<AccountStatusValue, string> = {
  TRIAL: "bg-primary/10 text-primary",
  ACTIVE: "bg-success/10 text-success",
  PAYMENT_DUE: "bg-warning/10 text-warning",
  OVERDUE: "bg-destructive/10 text-destructive",
  EXPIRED: "bg-muted text-muted-foreground",
  SUSPENDED: "bg-foreground/10 text-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
};

export type AlertUrgency = "critical" | "warning" | "info";

// Most-urgent-first -- account_status.py only ever emits ONE TRIAL_ENDS_*
// alert (the most urgent that applies), but this ranking is also used to
// pick the loudest style when a row could theoretically carry more than one
// alert in the same list (e.g. dashboard buckets group by alert type, not
// by row).
const ALERT_URGENCY: Record<AccountAlert, AlertUrgency> = {
  TRIAL_ENDS_1D: "critical",
  TRIAL_EXPIRED: "critical",
  SUSPENDED: "critical",
  INVOICE_OVERDUE: "critical",
  TRIAL_ENDS_3D: "warning",
  PAYMENT_AWAITING: "warning",
  TRIAL_ENDS_7D: "info",
};

export const ALERT_LABELS: Record<AccountAlert, string> = {
  TRIAL_ENDS_7D: "Trial ends in 7 days or less",
  TRIAL_ENDS_3D: "Trial ends in 3 days or less",
  TRIAL_ENDS_1D: "Trial ends tomorrow or today",
  TRIAL_EXPIRED: "Trial has expired",
  INVOICE_OVERDUE: "Invoice overdue",
  PAYMENT_AWAITING: "Payment awaiting confirmation",
  SUSPENDED: "Account suspended",
};

/** The single most urgent alert in a list, or null when there are none. */
export function mostUrgentAlert(alerts: AccountAlert[]): AccountAlert | null {
  if (alerts.length === 0) return null;
  const rank: Record<AlertUrgency, number> = { critical: 0, warning: 1, info: 2 };
  return [...alerts].sort((a, b) => rank[ALERT_URGENCY[a]] - rank[ALERT_URGENCY[b]])[0];
}

export function alertUrgency(alert: AccountAlert): AlertUrgency {
  return ALERT_URGENCY[alert];
}

/** Days-remaining -> urgency, for colouring the "Trials ending soon" panel
 * (7/3/1/expired) per this task's brief -- independent of whether a
 * TRIAL_ENDS_* alert is present, so it also works for a plain days count. */
export function trialDaysUrgency(daysRemaining: number | null): AlertUrgency {
  if (daysRemaining === null) return "critical"; // no end date at all reads as most urgent
  if (daysRemaining <= 1) return "critical";
  if (daysRemaining <= 3) return "warning";
  return "info";
}

export const URGENCY_STYLES: Record<AlertUrgency, string> = {
  critical: "text-destructive",
  warning: "text-warning",
  info: "text-muted-foreground",
};

export const BANNER_STYLES: Record<AlertUrgency, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-primary/10 text-primary border-primary/20",
};

export interface StatusBanner {
  urgency: AlertUrgency;
  text: string;
}

/**
 * DOC NOTE: neither DashboardRow nor ClientRow (routes_commercial.py)
 * returns AccountStatus.alerts -- only `.status` and `.trial_days_remaining`
 * ever cross the wire, even though account_status.py computes a real alerts
 * list server-side. This derives an equivalent banner purely from the
 * fields the API DOES return (account_status, days_remaining,
 * outstanding_cents) -- it doesn't invent new business logic, it just picks
 * display copy for a status the server already computed authoritatively,
 * so it can't drift from compute_account_status()'s own precedence. Worth
 * adding `alerts: list[str]` to both response models directly in a future
 * backend change so this client-side re-derivation isn't needed.
 */
export function deriveStatusBanner(row: {
  account_status: AccountStatusValue;
  days_remaining: number | null;
  outstanding_cents: number;
}): StatusBanner | null {
  switch (row.account_status) {
    case "TRIAL":
      if (row.days_remaining !== null && row.days_remaining <= 7) {
        return {
          urgency: trialDaysUrgency(row.days_remaining),
          text: row.days_remaining <= 0 ? "Trial ends today." : `Trial ends in ${row.days_remaining} day(s).`,
        };
      }
      return null;
    case "EXPIRED":
      return { urgency: "critical", text: "Trial has expired." };
    case "PAYMENT_DUE":
      return { urgency: "warning", text: `Payment awaiting confirmation — ${formatCentsAsRands(row.outstanding_cents)} outstanding.` };
    case "OVERDUE":
      return { urgency: "critical", text: `Invoice overdue — ${formatCentsAsRands(row.outstanding_cents)} outstanding.` };
    case "SUSPENDED":
      return { urgency: "critical", text: "This account is suspended." };
    default:
      return null;
  }
}
