// Types for the sales/commercial UI -- backed by
// admin_api/app/api/v1/routes_commercial.py and
// backend/app/billing/{account_status,commercial_invoices,trials}.py.
// Field names/shapes are taken directly from those Pydantic models, not
// guessed -- see this task's DOC NOTES for anything that doesn't have a
// matching backend field.

// backend/app/billing/account_status.py STATUS_* constants.
export type AccountStatusValue =
  | "TRIAL"
  | "ACTIVE"
  | "PAYMENT_DUE"
  | "OVERDUE"
  | "EXPIRED"
  | "SUSPENDED"
  | "CANCELLED";

// backend/app/billing/account_status.py ALERT_* constants. The API only
// ever returns the SINGLE most urgent TRIAL_ENDS_* alert at a time (see
// _trial_status), never more than one of those three together.
export type AccountAlert =
  | "TRIAL_ENDS_7D"
  | "TRIAL_ENDS_3D"
  | "TRIAL_ENDS_1D"
  | "TRIAL_EXPIRED"
  | "INVOICE_OVERDUE"
  | "PAYMENT_AWAITING"
  | "SUSPENDED";

export interface PriceCatalogueEntry {
  plan: string;
  monthly_amount_cents: number;
  monthly_amount_display: string;
}

export type InvoiceLineKind = "SETUP" | "SUBSCRIPTION" | "MODULE" | "OTHER";

export interface InvoiceLineIn {
  kind: InvoiceLineKind;
  description: string;
  quantity: number;
  unit_amount_cents: number;
}

export interface InvoiceLineOut extends InvoiceLineIn {
  id: string;
  sort_order: number;
  line_total_cents: number;
}

// CommercialInvoice.status values -- shared/models/commercial_invoice.py.
export type InvoiceStatus = "DRAFT" | "AWAITING_PAYMENT" | "SENT" | "OVERDUE" | "PAID" | "CANCELLED";

export interface CommercialInvoice {
  id: string;
  business_id: string;
  invoice_number: string | null;
  status: InvoiceStatus;
  invoice_date: string | null;
  due_date: string | null;
  currency: string;
  subtotal_cents: number;
  vat_cents: number;
  vat_rate_basis_points: number;
  total_cents: number;
  payment_method: "EFT" | "CASH" | null;
  paid_at: string | null;
  payment_reference: string | null;
  internal_note: string | null;
  payment_note: string | null;
  issued_at: string | null;
  sent_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  lines: InvoiceLineOut[];
}

export interface InvoiceDraftCreate {
  business_id: string;
  lines: InvoiceLineIn[];
  internal_note?: string | null;
}

export interface InvoiceDraftUpdate {
  lines?: InvoiceLineIn[];
  internal_note?: string | null;
}

export interface MarkPaidRequest {
  payment_date: string; // YYYY-MM-DD
  payment_method: "EFT" | "CASH";
  reference?: string | null;
  internal_note?: string | null;
}

export interface CancelInvoiceRequest {
  reason: string;
}

export interface DashboardRow {
  business_id: string;
  business_name: string;
  account_status: AccountStatusValue;
  plan: string;
  trial_ends_at: string | null;
  days_remaining: number | null;
  outstanding_cents: number;
  onboarding_readiness: string; // "x/y"
  onboarded_by: string | null; // SUPER_ADMIN only
}

export interface CommercialDashboardResponse {
  counts: Record<string, number>;
  trials_ending_soon: DashboardRow[];
  payments_awaiting_confirmation: DashboardRow[];
  overdue_clients: DashboardRow[];
  recently_created_trials: DashboardRow[];
  recently_converted: DashboardRow[];
  expired_trials: DashboardRow[];
}

export interface ClientRow {
  business_id: string;
  business_name: string;
  account_status: AccountStatusValue;
  plan: string;
  trial_ends_at: string | null;
  days_remaining: number | null;
  outstanding_cents: number;
  onboarded_by: string | null; // SUPER_ADMIN only
}
