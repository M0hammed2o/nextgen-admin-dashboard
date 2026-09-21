// Single source of truth for the per-tenant module switches accepted by the
// backend's BusinessUpdate schema (admin_api/app/api/v1/routes_businesses.py).
// Used by CreateBusinessModal, EditBusinessModal, and BusinessDetailsPage so
// the list of switches, their labels, and their descriptions can't drift
// apart between those three places.
//
// IMPORTANT: BusinessAdminResponse (the GET/PATCH response shape) does NOT
// return any of these fields today -- verified by reading the backend schema,
// not assumed. That means this UI can set them but cannot currently show
// their real current value. Every consumer of MODULE_FLAGS must treat them
// as write-only until a backend engineer adds them to the response model
// (tracked in KNOWN_BUGS.md).
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
