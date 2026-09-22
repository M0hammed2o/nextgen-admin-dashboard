import { describe, it, expect } from "vitest";
import { buildOnboardingBasicsPatch, type OnboardingBasicsForm } from "./onboardingPatch";
import type { OnboardingBusiness } from "@/types/business";

// Mirrors ONBOARDER_PATCH_ALLOWED_FIELDS in
// admin_api/app/api/v1/routes_businesses.py -- this function must never be
// able to produce a key outside that allow-list (enforced structurally by
// OnboardingBusinessUpdate's type), and must never send a field whose value
// hasn't actually changed (the backend's exclude_unset=True already handles
// "don't touch untouched fields", but sending noise defeats the same
// safety property this UI relies on elsewhere -- see ModuleTogglesFieldset).
const BUSINESS: OnboardingBusiness = {
  id: "biz-1",
  name: "Barn Owl",
  slug: "barn-owl",
  business_code: "ABC123",
  is_active: true,
  suspended_reason: null,
  timezone: "Africa/Johannesburg",
  plan: "STARTER",
  billing_status: "TRIAL",
  currency: "ZAR",
  whatsapp_phone_number_id: "1234567890",
  daily_message_limit: 800,
  daily_llm_call_limit: 400,
  daily_order_limit: 200,
  last_webhook_received_at: null,
  created_at: "2026-01-01T00:00:00Z",
  is_whatsapp_enabled: true,
  inventory_enabled: false,
  digital_receipts_enabled: false,
  delivery_platforms_enabled: false,
  uber_eats_enabled: false,
  mrd_enabled: false,
  staff_live_orders_tab_enabled: true,
  staff_wastage_tab_enabled: true,
  staff_stocktake_tab_enabled: true,
  onboarded_by_admin_id: "admin-1",
  onboarding_completed_at: null,
};

const FORM: OnboardingBasicsForm = {
  name: BUSINESS.name,
  timezone: BUSINESS.timezone,
  plan: BUSINESS.plan,
  whatsapp_phone_number_id: BUSINESS.whatsapp_phone_number_id ?? "",
};

describe("buildOnboardingBasicsPatch", () => {
  it("sends nothing when nothing changed", () => {
    expect(buildOnboardingBasicsPatch(FORM, BUSINESS, {})).toEqual({});
  });

  it("sends only the field that actually changed", () => {
    const payload = buildOnboardingBasicsPatch({ ...FORM, name: "Barn Owl Renamed" }, BUSINESS, {});
    expect(payload).toEqual({ name: "Barn Owl Renamed" });
  });

  it("sends multiple changed fields together, and only those", () => {
    const payload = buildOnboardingBasicsPatch(
      { ...FORM, timezone: "Europe/London", plan: "GROWTH" },
      BUSINESS,
      {}
    );
    expect(payload).toEqual({ timezone: "Europe/London", plan: "GROWTH" });
  });

  it("clears whatsapp_phone_number_id to null when blanked, not to an empty string", () => {
    const payload = buildOnboardingBasicsPatch({ ...FORM, whatsapp_phone_number_id: "" }, BUSINESS, {});
    expect(payload).toEqual({ whatsapp_phone_number_id: null });
  });

  it("merges in module changes untouched (already dirty-tracked by ModuleTogglesFieldset)", () => {
    const payload = buildOnboardingBasicsPatch(FORM, BUSINESS, { inventory_enabled: true });
    expect(payload).toEqual({ inventory_enabled: true });
  });

  it("never produces a key outside the ONBOARDER PATCH allow-list", () => {
    const payload = buildOnboardingBasicsPatch(
      { name: "New Name", timezone: "UTC", plan: "GROWTH", whatsapp_phone_number_id: "999" },
      BUSINESS,
      { inventory_enabled: true, is_whatsapp_enabled: false }
    );
    const allowed = new Set([
      "name", "timezone", "plan", "whatsapp_phone_number_id",
      "is_whatsapp_enabled", "inventory_enabled", "digital_receipts_enabled",
      "staff_live_orders_tab_enabled", "staff_wastage_tab_enabled", "staff_stocktake_tab_enabled",
    ]);
    for (const key of Object.keys(payload)) {
      expect(allowed.has(key)).toBe(true);
    }
  });

  // Delivery entitlements (delivery_platforms_enabled/uber_eats_enabled/
  // mrd_enabled, migration 0044) are SUPER_ADMIN-writable only -- absent from
  // ONBOARDER_PATCH_ALLOWED_FIELDS server-side. Even if moduleChanges somehow
  // contained one (it shouldn't -- ModuleTogglesFieldset never emits it for
  // a non-SUPER_ADMIN caller), this function must still never forward it.
  it("never forwards a delivery-entitlement key even if present in moduleChanges", () => {
    const payload = buildOnboardingBasicsPatch(FORM, BUSINESS, {
      inventory_enabled: true,
      delivery_platforms_enabled: true,
      uber_eats_enabled: true,
      mrd_enabled: true,
    });
    expect(payload).toEqual({ inventory_enabled: true });
    expect(payload).not.toHaveProperty("delivery_platforms_enabled");
    expect(payload).not.toHaveProperty("uber_eats_enabled");
    expect(payload).not.toHaveProperty("mrd_enabled");
  });
});
