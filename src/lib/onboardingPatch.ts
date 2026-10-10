import type { OnboardingBusiness, OnboardingBusinessUpdate } from "@/types/business";
import type { ModuleFlagKey } from "@/lib/modules";

export interface OnboardingBasicsForm {
  name: string;
  timezone: string;
  plan: string;
  whatsapp_phone_number_id: string;
}

/**
 * Builds the PATCH payload for OnboardingWorkspacePage's "Restaurant, Plan
 * & Modules" section -- a pure function specifically so it can be unit
 * tested against the ONBOARDER_PATCH_ALLOWED_FIELDS allow-list in
 * admin_api/app/api/v1/routes_businesses.py without needing to render the
 * whole page.
 *
 * Only include a key when its value actually differs from `business`'s
 * current value (the backend applies PATCH with exclude_unset=True, so
 * omitting a key leaves it untouched -- sending an unchanged value is
 * harmless but noisy, and for an ONBOARDER every key sent must ALSO be one
 * of the fields they're allowed to touch).
 *
 * `isSuperAdmin` is the real enforcement point for the role split -- not a
 * convenience flag. An ONBOARDER caller must ALWAYS produce a payload drawn
 * only from ONBOARDER_MODULE_KEYS, regardless of what the UI happened to
 * show them; the explicit key-by-key copy below (never a raw
 * `{ ...moduleChanges }` spread) is what makes that a structural guarantee
 * rather than something the caller has to remember.
 */
// The exact key set ONBOARDER_PATCH_ALLOWED_FIELDS accepts, for module
// flags -- every caller gets these, SUPER_ADMIN or not.
const ONBOARDER_MODULE_KEYS = [
  "is_whatsapp_enabled",
  "inventory_enabled",
  "digital_receipts_enabled",
  "staff_live_orders_tab_enabled",
  "staff_wastage_tab_enabled",
  "staff_stocktake_tab_enabled",
] as const satisfies readonly ModuleFlagKey[];

// The five commercial entitlement keys `routes_businesses.py::update_business`
// only accepts from a SUPER_ADMIN caller (its ONBOARDER allow-list check is
// skipped entirely when `user.role != ONBOARDER`, so these reach the backend
// unconditionally once sent by a SUPER_ADMIN -- there is no separate backend
// gate per-field). Forwarded here ONLY when `isSuperAdmin` is true, so an
// ONBOARDER's payload can never include one even if `moduleChanges`
// somehow did (it shouldn't -- ModuleTogglesFieldset renders these as a
// locked, onChange-free row for a non-SUPER_ADMIN caller).
const SUPER_ADMIN_ONLY_MODULE_KEYS = [
  "delivery_platforms_enabled",
  "uber_eats_enabled",
  "mrd_enabled",
  "delivery_reconciliation_enabled",
  "advanced_analytics_enabled",
  "loyalty_enabled",
] as const satisfies readonly ModuleFlagKey[];

export function buildOnboardingBasicsPatch(
  form: OnboardingBasicsForm,
  business: OnboardingBusiness,
  moduleChanges: Partial<Record<ModuleFlagKey, boolean>>,
  isSuperAdmin: boolean
): OnboardingBusinessUpdate {
  const payload: OnboardingBusinessUpdate = {};
  for (const key of ONBOARDER_MODULE_KEYS) {
    const value = moduleChanges[key];
    if (value !== undefined) payload[key] = value;
  }
  if (isSuperAdmin) {
    for (const key of SUPER_ADMIN_ONLY_MODULE_KEYS) {
      const value = moduleChanges[key];
      if (value !== undefined) payload[key] = value;
    }
  }

  if (form.name !== business.name) payload.name = form.name;
  if (form.timezone !== business.timezone) payload.timezone = form.timezone;
  if (form.plan !== business.plan) payload.plan = form.plan;

  const whatsappVal = form.whatsapp_phone_number_id.trim() || null;
  if (whatsappVal !== (business.whatsapp_phone_number_id ?? null)) {
    payload.whatsapp_phone_number_id = whatsappVal;
  }

  return payload;
}
