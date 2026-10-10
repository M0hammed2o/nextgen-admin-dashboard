// Single source of truth for the per-tenant module switches accepted by the
// backend's BusinessUpdate schema (admin_api/app/api/v1/routes_businesses.py).
// Used by CreateBusinessModal, EditBusinessModal, BusinessDetailsPage, and
// the onboarding workspace so the list of switches, their labels, and their
// descriptions can't drift apart between those places.
//
// BusinessAdminResponse AND BusinessOnboarderResponse now both return these
// fields (verified by reading the backend schema, 2026-09-22 -- previously
// they didn't, see the now-fixed KNOWN_BUGS.md entries, including BUG-0072
// for digital_receipts_enabled specifically). ModuleTogglesFieldset renders
// a normal on/off Switch when a caller passes the real current value via its
// `current` prop, and falls back to the old write-only tri-state control
// only when it genuinely doesn't have one (e.g. at business-creation time,
// before the business exists).
export type ModuleFlagKey =
  | "is_whatsapp_enabled"
  | "inventory_enabled"
  | "digital_receipts_enabled"
  | "delivery_platforms_enabled"
  | "uber_eats_enabled"
  | "mrd_enabled"
  | "delivery_reconciliation_enabled"
  | "advanced_analytics_enabled"
  | "loyalty_enabled"
  | "staff_live_orders_tab_enabled"
  | "staff_wastage_tab_enabled"
  | "staff_stocktake_tab_enabled";

export interface ModuleFlagDef {
  key: ModuleFlagKey;
  label: string;
  description: string;
  /**
   * delivery_platforms_enabled/uber_eats_enabled/mrd_enabled (migration 0044)
   * are deliberately NOT in admin_api's ONBOARDER_PATCH_ALLOWED_FIELDS --
   * enabling a live delivery integration carries real contractual weight
   * with Uber that a sales partner shouldn't be able to flip unilaterally
   * (see docs/DELIVERY_PLATFORM_ARCHITECTURE.md §7). ModuleTogglesFieldset
   * renders a flag with this set to true as a locked, read-only row unless
   * its caller explicitly passes isSuperAdmin -- see that component's own
   * doc comment for exactly which call sites opt in.
   */
  superAdminOnly?: boolean;
}

export const MODULE_FLAGS: ModuleFlagDef[] = [
  {
    key: "is_whatsapp_enabled",
    label: "WhatsApp Ordering",
    description: "Customers can place orders by chatting with the AI bot on WhatsApp.",
  },
  {
    key: "inventory_enabled",
    label: "Inventory",
    description: "Turns on ingredients, recipes, stock levels, stocktake, and wastage tracking for this restaurant.",
  },
  {
    key: "digital_receipts_enabled",
    label: "Digital Receipts",
    description: "Lets customers receive a WhatsApp copy of their receipt after a sale. Printing is unaffected by this switch.",
  },
  {
    key: "delivery_platforms_enabled",
    label: "Delivery Marketplace",
    description: "Commercial entitlement only -- lets this restaurant use delivery-platform integrations (Uber Eats, Mr D) at all. Does NOT mean any provider has approved or connected the restaurant yet -- see the per-provider flags below and the connection status shown in the Manager Dashboard.",
    superAdminOnly: true,
  },
  {
    key: "uber_eats_enabled",
    label: "Uber Eats",
    description: "Commercial entitlement only. Live Uber Eats order injection additionally requires Uber's own written partner approval for this specific restaurant -- this flag alone never turns on live orders. Until Uber approves, the restaurant's connection stays SANDBOX or AWAITING_APPROVAL; the existing CSV import remains the live Uber Eats reconciliation path.",
    superAdminOnly: true,
  },
  {
    key: "mrd_enabled",
    label: "Mr D",
    description: "Commercial entitlement only. No live Mr D order-injection API exists today -- Mr D stays CSV file reconciliation regardless of this flag. Never implies a live Mr D connection.",
    superAdminOnly: true,
  },
  {
    key: "delivery_reconciliation_enabled",
    label: "Delivery Reconciliation",
    description: "CSV/manual reconciliation for Uber Eats, Mr D and other delivery channels. This does NOT enable live delivery-platform API connections -- that is Delivery Marketplace (and the per-provider Uber Eats/Mr D flags) above, a separate entitlement. A restaurant can have reconciliation, marketplace integrations, both, or neither.",
    superAdminOnly: true,
  },
  {
    key: "advanced_analytics_enabled",
    label: "Advanced Analytics",
    description: "Commercial entitlement only -- unlocks the NextGen Complete tier's Advanced Analytics views (average order value, payment-method split, delivery-channel performance) in the Manager Dashboard.",
    superAdminOnly: true,
  },
  {
    key: "loyalty_enabled",
    label: "Loyalty",
    description: "Commercial entitlement only -- unlocks the Loyalty module (points programme + till reward redemption) sold in NextGen Complete (from R2,499) and above. A POS-only plan cannot self-enable this.",
    superAdminOnly: true,
  },
  {
    key: "staff_live_orders_tab_enabled",
    label: "Staff App: Live Orders tab",
    description: "Shows the Live Orders tab in the staff till/kitchen app.",
  },
  {
    key: "staff_wastage_tab_enabled",
    label: "Staff App: Wastage tab",
    description: "Shows the Wastage tab in the staff till/kitchen app.",
  },
  {
    key: "staff_stocktake_tab_enabled",
    label: "Staff App: Stocktake tab",
    description: "Shows the Stocktake tab in the staff till/kitchen app.",
  },
];

// digital_receipts_enabled (Commercial V1 gate, migration 0039) used to live
// here as a separate, deliberately non-writable PENDING_MODULE_FLAGS entry:
// admin_api's BusinessUpdate/ONBOARDER_PATCH_ALLOWED_FIELDS/
// BusinessAdminResponse/BusinessOnboarderResponse didn't accept or return it
// (BUG-0072), so a real Switch/tri-state control would have silently no-op'd
// on save. Fixed in admin_api commit 264aac4 (2026-09-22, verified by
// reading the current admin_api/app/api/v1/routes_businesses.py -- all four
// schemas now carry a plain `digital_receipts_enabled: bool`, matching
// inventory_enabled's exact shape) -- promoted into MODULE_FLAGS above like
// every other real module flag. PENDING_MODULE_FLAGS itself is removed
// rather than left as empty scaffolding for a hypothetical future gap; a
// future gap of this kind should get its own entry when it actually exists.
