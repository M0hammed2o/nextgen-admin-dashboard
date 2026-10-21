// Plan values the platform's own code actually treats as meaningful today.
// `Business.plan` is a free-text DB column (shared/models/business.py), but
// these are the only values any billing/admin code path recognizes:
//   - backend/app/billing/stripe_client.py `_PLAN_PRICE_IDS` (STARTER, GROWTH)
//   - backend/app/billing/payfast_billing.py `_PLAN_MONTHLY_AMOUNT_RANDS` (STARTER, GROWTH)
//   - ENTERPRISE is explicitly named in both files as the deliberately-excluded,
//     sales-assisted/custom-contract tier (not self-service checkout)
//   - WHATSAPP_ONLY (added here against the backend agent's parallel,
//     not-yet-landed contract -- see WORKLOG.md's 2026-10-20 entry): the
//     "WhatsApp-only, no POS" package sold to the two prospective customers
//     this feature was built for. Pair this plan value with `pos_enabled:
//     false` on the same business (see BusinessDetailsPage's Subscription
//     card) -- the plan string alone does not disable POS; `pos_enabled` is
//     the actual enforcement point server-side.
// PRODUCT_ROADMAP.md §9 (Revenue & Packaging) uses different marketing-facing
// tier names (Starter/Standard/Premium/Enterprise) for feature packaging, but
// those aren't what `Business.plan` actually stores anywhere in code -- per
// CLAUDE.md's standing rule, code is the source of truth when the two
// disagree about what currently exists.
export const KNOWN_PLANS = ["STARTER", "GROWTH", "ENTERPRISE", "WHATSAPP_ONLY"] as const;

export type KnownPlan = (typeof KNOWN_PLANS)[number];

export function isKnownPlan(value: string): value is KnownPlan {
  return (KNOWN_PLANS as readonly string[]).includes(value);
}
