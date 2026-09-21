// Plan values the platform's own code actually treats as meaningful today.
// `Business.plan` is a free-text DB column (shared/models/business.py), but
// these three are the only values any billing code path recognizes:
//   - backend/app/billing/stripe_client.py `_PLAN_PRICE_IDS` (STARTER, GROWTH)
//   - backend/app/billing/payfast_billing.py `_PLAN_MONTHLY_AMOUNT_RANDS` (STARTER, GROWTH)
//   - ENTERPRISE is explicitly named in both files as the deliberately-excluded,
//     sales-assisted/custom-contract tier (not self-service checkout)
// PRODUCT_ROADMAP.md §9 (Revenue & Packaging) uses different marketing-facing
// tier names (Starter/Standard/Premium/Enterprise) for feature packaging, but
// those aren't what `Business.plan` actually stores anywhere in code -- per
// CLAUDE.md's standing rule, code is the source of truth when the two
// disagree about what currently exists.
export const KNOWN_PLANS = ["STARTER", "GROWTH", "ENTERPRISE"] as const;

export type KnownPlan = (typeof KNOWN_PLANS)[number];

export function isKnownPlan(value: string): value is KnownPlan {
  return (KNOWN_PLANS as readonly string[]).includes(value);
}
