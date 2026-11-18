// Contract: admin_api/app/api/v1/routes_events.py (souk / temporary events).
// All money is VAT-inclusive integer cents.
export type EventStatus = "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
export type VendorCategory = "FOOD" | "CLOTHING";
export type VendorStatus = string; // PENDING | ACTIVE | ... | CANCELLED (server-owned)
export type AccessLevel = "NONE" | "CONFIGURE" | "TRADE";
export type SubscriptionStatus = "UNPAID" | "PAID" | "VOID";

export interface EventDay {
  day: string; // YYYY-MM-DD
  is_billable: boolean;
}

export interface EventSummary {
  id: string;
  name: string;
  slug: string;
  status: EventStatus;
  venue: string | null;
}

export interface EventDetail extends EventSummary {
  timezone: string;
  food_day_rate_cents: number;
  clothing_day_rate_cents: number;
  days: EventDay[];
  billable_day_count: number;
  vendor_counts: Record<string, number>;
  active_vendors: number;
  revenue_paid_cents: number;
  revenue_outstanding_cents: number;
  prep_days?: number; // NEW (backend PATCH work); default 14 when absent
  notes?: string | null; // not returned by GET today; edited write-only
}

export interface CreateEventRequest {
  name: string;
  venue?: string | null;
  timezone: string;
  food_day_rate_cents: number;
  clothing_day_rate_cents: number;
  days: EventDay[];
  notes?: string | null;
}

export interface UpdateEventRequest {
  name?: string;
  venue?: string | null;
  notes?: string | null;
  prep_days?: number;
}

export interface EventSubscription {
  id: string;
  starts_on: string;
  ends_on: string;
  billable_days: number;
  amount_cents: number;
  status: SubscriptionStatus;
  paid_at: string | null;
}

export interface EventVendorItem {
  vendor_id: string;
  business_id: string;
  business_name: string;
  business_code: string;
  business_active: boolean;
  suspended_reason?: string | null;
  category: VendorCategory;
  stall_code: string | null;
  status: VendorStatus;
  access_level?: AccessLevel;
  subscriptions: EventSubscription[];
}

export interface VendorListParams {
  status?: string;
  category?: string;
  q?: string;
  limit: number;
  offset: number;
}

export interface VendorListResponse {
  items: EventVendorItem[];
  total: number;
}

export interface BulkVendorRow {
  category: VendorCategory;
  stall_code?: string;
  existing_business_id?: string;
  business_name?: string;
  owner_email?: string;
  owner_full_name?: string;
  starts_on?: string;
  ends_on?: string;
}

export interface BulkVendorResult {
  category: VendorCategory;
  stall_code: string | null;
  amount_cents: number | null;
  billable_days: number | null;
  // Present only on a real (non dry-run) import:
  vendor_id?: string;
  business_id?: string;
  business_code?: string;
  owner_email?: string | null;
  owner_temporary_password?: string | null;
}

export interface BulkVendorResponse {
  dry_run: boolean;
  vendors: BulkVendorResult[];
}

export interface BulkRowProblem {
  row: number;
  errors: string[];
}

export interface EventRevenue {
  paid_cents: number;
  outstanding_cents: number;
  by_category: Record<string, { paid_cents: number; outstanding_cents: number; vendors: number }>;
  by_day: { day: string; vendors_covered: number; paid_cents_attributed: number }[];
}
