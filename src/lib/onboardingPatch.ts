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
 * of the fields they're allowed to touch, which every key this function can
 * produce already is, by construction of OnboardingBusinessUpdate's type).
 */
export function buildOnboardingBasicsPatch(
  form: OnboardingBasicsForm,
  business: OnboardingBusiness,
  moduleChanges: Partial<Record<ModuleFlagKey, boolean>>
): OnboardingBusinessUpdate {
  const payload: OnboardingBusinessUpdate = { ...moduleChanges };

  if (form.name !== business.name) payload.name = form.name;
  if (form.timezone !== business.timezone) payload.timezone = form.timezone;
  if (form.plan !== business.plan) payload.plan = form.plan;

  const whatsappVal = form.whatsapp_phone_number_id.trim() || null;
  if (whatsappVal !== (business.whatsapp_phone_number_id ?? null)) {
    payload.whatsapp_phone_number_id = whatsappVal;
  }

  return payload;
}
