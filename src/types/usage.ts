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

// GET /admin/businesses/{id}/usage. `whatsapp_messaging_cost_rand` is
// deliberately `null` in every real response -- Meta's own per-message
// messaging cost isn't tracked anywhere in this system. Never compute or
// display a substitute number for it; render the accompanying note instead
// (see BusinessUsageSection).
export interface BusinessUsageSummary {
  orders_used: number;
  orders_allowance: number;
  orders_remaining: number;
  pct_used: number;
  tier: UsageTier;
  ai_llm_calls: number;
  ai_llm_tokens: number;
  ai_llm_cost_cents: number;
  whatsapp_inbound_messages: number;
  whatsapp_outbound_messages: number;
  whatsapp_messaging_cost_rand: null;
}

// GET /admin/usage-alerts. Exact shape is an ASSUMPTION beyond what the task
// brief specified ("a list of businesses that have newly crossed an
// 80/90/100% usage threshold this billing period") -- business_id/name/tier/
// pct_used are the minimum fields a visible alert list needs; reconcile
// against the real backend response once that branch lands (flagged in this
// task's final report rather than guessed at silently).
export interface UsageAlert {
  business_id: string;
  business_name: string;
  tier: UsageTier;
  pct_used: number;
}
