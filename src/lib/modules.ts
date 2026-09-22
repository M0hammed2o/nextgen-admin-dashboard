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
  | "staff_live_orders_tab_enabled"
  | "staff_wastage_tab_enabled"
  | "staff_stocktake_tab_enabled";

export interface ModuleFlagDef {
  key: ModuleFlagKey;
  label: string;
  description: string;
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
