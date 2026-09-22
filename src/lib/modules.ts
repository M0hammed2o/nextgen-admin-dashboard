// Single source of truth for the per-tenant module switches accepted by the
// backend's BusinessUpdate schema (admin_api/app/api/v1/routes_businesses.py).
// Used by CreateBusinessModal, EditBusinessModal, BusinessDetailsPage, and
// the onboarding workspace so the list of switches, their labels, and their
// descriptions can't drift apart between those places.
//
// BusinessAdminResponse AND BusinessOnboarderResponse now both return these
// fields (verified by reading the backend schema, 2026-09-21 -- previously
// they didn't, see the now-fixed KNOWN_BUGS.md entry). ModuleTogglesFieldset
// renders a normal on/off Switch when a caller passes the real current value
// via its `current` prop, and falls back to the old write-only tri-state
// control only when it genuinely doesn't have one (e.g. at business-creation
// time, before the business exists).
export type ModuleFlagKey =
  | "is_whatsapp_enabled"
  | "inventory_enabled"
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

// ── Digital Receipts (Commercial V1 gate, migration 0039) ──────────────────
// `Business.digital_receipts_enabled` exists on the shared model (added
// 2026-09-22, same night as this entry) but, unlike every flag in
// MODULE_FLAGS above, the admin_api layer was never updated to match:
// verified by reading admin_api/app/api/v1/routes_businesses.py 2026-09-22 --
// it is in NEITHER `BusinessUpdate` NOR `ONBOARDER_PATCH_ALLOWED_FIELDS`
// (so PATCH silently drops it -- Pydantic's default `extra="ignore"` means
// sending it would return 200 while changing nothing), NOR
// `BusinessAdminResponse`/`BusinessOnboarderResponse` (so GET can't show its
// real state either). This is a strictly bigger gap than the old
// write-only/tri-state pattern MODULE_FLAGS's own history describes (see
// KNOWN_BUGS.md BUG-0072) -- that pattern assumed PATCH acceptance, which
// this flag doesn't have. Reusing it as-is here would produce a working-
// looking Leave/On/Off control whose "On"/"Off" clicks silently no-op on
// save, i.e. exactly the fake-success pattern this codebase treats as a bug
// class (see BUG-0004). So this flag is intentionally NOT a ModuleFlagKey --
// it must never be spread into a `changes`/PATCH payload until admin_api
// actually accepts and returns it. ModuleTogglesFieldset renders it as a
// disabled, informational row instead. Promote it to a real ModuleFlagDef
// (and to ModuleFlagKey) once BUG-0072 is fixed.
export interface PendingModuleFlagDef {
  key: "digital_receipts_enabled";
  label: string;
  description: string;
}

export const PENDING_MODULE_FLAGS: PendingModuleFlagDef[] = [
  {
    key: "digital_receipts_enabled",
    label: "Digital Receipts",
    description: "Lets customers receive a WhatsApp copy of their receipt after a sale. Printing is unaffected by this switch.",
  },
];
