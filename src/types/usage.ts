export interface UsageRecord {
  business_id: string;
  total_messages: number;
  total_llm_calls: number;
  total_llm_cost_cents: number;
  total_orders: number;
  total_revenue_cents: number;
}

// ── Per-business usage summary + platform-wide usage alerts ────────────────
// Backend contract for both of these (parallel branch, not yet landed as of
// 2026-10-20 -- see WORKLOG.md's entry for this task): built against the
// CONTRACT given, to be reconciled against the real admin_api schemas once
// that branch lands, not against a verified live response.

export type UsageTier = "ok" | "warning_80" | "warning_90" | "exceeded";

// GET /admin/businesses/{id}/usage. Reconciled 2026-10-20 against the real
// backend response (admin_api/app/api/v1/routes_businesses.py::
// BusinessUsageResponse) -- the earlier version of this type used
// orders_used/orders_allowance/pct_used/tier (bare), which don't exist on
// the real response (it's whatsapp_orders_used/whatsapp_orders_allowance/
// etc., all `whatsapp_`-prefixed) and rendered "NaN / NaN" in production
// (BUG-0149, found via real browser testing). The allowance-related fields
// are nullable: a business with no `whatsapp_order_allowance` configured
// gets `null` for all four, NOT zero -- BusinessUsageSection must render a
// "no allowance configured" state for that case, never NaN or 0%.
// `whatsapp_messaging_cost_rand` is deliberately always `null` -- Meta's
// own per-message messaging cost isn't tracked anywhere in this system.
// Never compute or display a substitute number for it; render
// `whatsapp_messaging_cost_note` instead.
export interface BusinessUsageSummary {
  business_id: string;
  period_start: string;
  whatsapp_orders_used: number;
  whatsapp_orders_total_all_statuses: number;
  whatsapp_orders_allowance: number | null;
  whatsapp_orders_remaining: number | null;
  whatsapp_orders_pct_used: number | null;
  whatsapp_orders_tier: UsageTier | null;
  ai_llm_calls: number;
  ai_llm_tokens: number;
  ai_llm_cost_cents: number;
  whatsapp_inbound_messages: number;
  whatsapp_outbound_messages: number;
  whatsapp_messaging_cost_rand: null;
  whatsapp_messaging_cost_note: string;
}

// GET /admin/usage-alerts. Reconciled 2026-10-20 against the real backend
// response (admin_api/app/api/v1/routes_usage.py::UsageAlertResponse) --
// one row per (business, billing period, threshold crossed), so a single
// business can have MULTIPLE rows in the same period (e.g. both 80% and
// 90% recorded separately, confirmed by the backend's own integration
// test). tier/pct_used are NOT returned by the API -- the backend
// deliberately derives neither server-side twice (once here, once in
// get_whatsapp_order_usage) to avoid the two ever disagreeing. Compute
// them client-side via deriveAlertTier()/derivePctUsed() below instead of
// expecting them on the object.
export interface UsageAlert {
  id: string;
  business_id: string;
  business_name: string;
  billing_period_started_at: string;
  threshold_crossed: number;
  orders_used: number;
  orders_allowance: number;
  created_at: string;
}

/** threshold_crossed is always exactly 80, 90, or 100 per the backend's own
 * column comment -- this is a direct mapping, not a range check. */
export function deriveAlertTier(thresholdCrossed: number): UsageTier {
  if (thresholdCrossed >= 100) return "exceeded";
  if (thresholdCrossed >= 90) return "warning_90";
  if (thresholdCrossed >= 80) return "warning_80";
  return "ok";
}

export function derivePctUsed(alert: UsageAlert): number {
  if (alert.orders_allowance <= 0) return 0;
  return (alert.orders_used / alert.orders_allowance) * 100;
}
