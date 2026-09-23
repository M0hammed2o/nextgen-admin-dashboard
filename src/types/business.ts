export interface Business {
  id: string;
  name: string;
  slug: string;
  business_code: string;
  is_active: boolean;
  suspended_reason: string | null;
  timezone: string;
  plan: string;
  billing_status: string;
  currency: string;
  whatsapp_phone_number_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  daily_message_limit: number;
  daily_llm_call_limit: number;
  daily_order_limit: number;
  // Trial/quota/usage fields -- present on the backend's BusinessAdminResponse
  // since 2026-07-24 but never surfaced here until now (found while writing
  // the admin-portal browser test: the API returns these, the UI never showed
  // them to a real admin).
  trial_ends_at: string | null;
  monthly_order_quota: number;
  order_pack_credits: number;
  monthly_orders_used: number;
  monthly_orders_remaining: number;
  last_webhook_received_at: string | null;
  created_at: string;
  // Present only in the response right after creation (owner_email was set) —
  // shown once, never returned by GET/PATCH.
  owner_temporary_password?: string | null;
  // ── Module switches: now real, read/write ───────────────────────────────
  // BusinessAdminResponse (admin_api/app/api/v1/routes_businesses.py) now
  // returns these -- verified by reading the schema during the sales-partner
  // onboarding build (2026-09-21). Previously write-only (see KNOWN_BUGS.md
  // for the fixed entry); ModuleTogglesFieldset now renders a normal on/off
  // Switch using these as the known "current" state instead of a tri-state
  // Leave/On/Off guess.
  is_whatsapp_enabled: boolean;
  inventory_enabled: boolean;
  // digital_receipts_enabled (migration 0039) had the same gap the comment
  // above describes -- admin_api didn't return it until BUG-0072 was fixed
  // (commit 264aac4, 2026-09-22, verified by reading the current
  // routes_businesses.py). Now returned by BusinessAdminResponse, so it's a
  // real ModuleFlagKey, not the write-only tri-state fallback.
  digital_receipts_enabled: boolean;
  // Delivery marketplace entitlements (migration 0044, admin_api commits
  // ca95867/82e0143) -- SUPER_ADMIN-writable only (see UpdateBusinessRequest
  // below and lib/modules.ts's ModuleFlagDef.superAdminOnly), but read here
  // for every viewer of this full Business shape. A true value is
  // commercial permission only -- it does NOT mean Uber/Mr D has approved
  // or connected this restaurant; see the Manager Dashboard's delivery
  // connection status for the real live/sandbox/awaiting-approval state.
  delivery_platforms_enabled: boolean;
  uber_eats_enabled: boolean;
  mrd_enabled: boolean;
  // Advanced Analytics entitlement (migration 0047, admin_api schemas verified
  // 2026-09-23) -- Commercial V1 tier gate (NextGen Complete and above) for
  // the average-order-value/payment-method-split/delivery-channel-performance
  // views. SUPER_ADMIN-writable only (see UpdateBusinessRequest below and
  // lib/modules.ts's ModuleFlagDef.superAdminOnly), same "platform decision,
  // not a tenant toggle" rationale as delivery_platforms_enabled above, but
  // read here for every viewer of this full Business shape.
  advanced_analytics_enabled: boolean;
  staff_live_orders_tab_enabled: boolean;
  staff_wastage_tab_enabled: boolean;
  staff_stocktake_tab_enabled: boolean;
  onboarded_by_admin_id: string | null;
  onboarding_completed_at: string | null;
}

export interface CreateBusinessRequest {
  name: string;
  slug: string;
  timezone: string;
  plan: string;
  whatsapp_phone_number_id: string;
  daily_message_limit: number;
  daily_llm_call_limit: number;
  daily_order_limit: number;
  owner_email: string;
  owner_full_name: string;
  // BusinessCreate.start_trial (admin_api/app/api/v1/routes_businesses.py) --
  // starts a TRIAL_DEFAULT_DAYS commercial trial immediately when true
  // (the default server-side too). When false, the business is created
  // ACTIVE with no trial -- for a client invoiced/paying from day one.
  start_trial?: boolean;
}

// The subset of BusinessCreate fields an ONBOARDER may send (see
// admin_api/app/api/v1/routes_businesses.py -- daily limits must stay at
// their defaults for that role, and owner_email/owner_full_name are
// deliberately left out here: the onboarding workspace creates the owner
// login as its own separate step, not bundled into business creation).
// Used for the "New restaurant" action on the Onboarding page for BOTH
// roles, since it's a strict subset of what SUPER_ADMIN may also send.
export interface CreateOnboardingBusinessRequest {
  name: string;
  slug?: string;
  timezone: string;
  plan: string;
  whatsapp_phone_number_id?: string | null;
  // BusinessCreate.start_trial -- same field as CreateBusinessRequest, an
  // ONBOARDER may send this too (the create-business route body is the
  // full BusinessCreate for both roles; only plan/limits are restricted for
  // ONBOARDER -- see routes_businesses.py::create_business).
  start_trial?: boolean;
}

// The reduced view of a business returned to an ONBOARDER (and the shape
// every field SUPER_ADMIN's fuller BusinessAdminResponse also carries) --
// admin_api/app/api/v1/routes_businesses.py::BusinessOnboarderResponse.
// Used by the Onboarding list + workspace pages so they work identically
// for both roles.
export interface OnboardingBusiness {
  id: string;
  name: string;
  slug: string;
  business_code: string;
  is_active: boolean;
  suspended_reason: string | null;
  timezone: string;
  plan: string;
  billing_status: string;
  currency: string;
  whatsapp_phone_number_id: string | null;
  daily_message_limit: number;
  daily_llm_call_limit: number;
  daily_order_limit: number;
  last_webhook_received_at: string | null;
  created_at: string;
  is_whatsapp_enabled: boolean;
  inventory_enabled: boolean;
  digital_receipts_enabled: boolean;
  // Read-only here (BusinessOnboarderResponse returns these, but they're
  // deliberately absent from OnboardingBusinessUpdate below/
  // ONBOARDER_PATCH_ALLOWED_FIELDS server-side) -- an onboarder setting up a
  // restaurant that wants delivery integrations still needs to see current
  // entitlement status to know whether to escalate to a SUPER_ADMIN. See
  // OnboardingWorkspacePage's read-only "Delivery entitlements" panel.
  delivery_platforms_enabled: boolean;
  uber_eats_enabled: boolean;
  mrd_enabled: boolean;
  // Read-only here too, same rationale as delivery_platforms_enabled above
  // (visible so an onboarder knows to escalate, not onboarder-actionable --
  // deliberately absent from OnboardingBusinessUpdate below/
  // ONBOARDER_PATCH_ALLOWED_FIELDS server-side).
  advanced_analytics_enabled: boolean;
  staff_live_orders_tab_enabled: boolean;
  staff_wastage_tab_enabled: boolean;
  staff_stocktake_tab_enabled: boolean;
  onboarded_by_admin_id: string | null;
  onboarding_completed_at: string | null;
  owner_temporary_password?: string | null;
}

export interface UpdateBusinessRequest {
  name?: string;
  timezone?: string;
  plan?: string;
  // Nullable at the backend/DB level (unique-but-optional columns) -- a
  // caller must be able to explicitly clear these back to "not set" rather
  // than being forced into an empty string, which is a real, distinct value
  // that can collide with another business's own empty string.
  whatsapp_phone_number_id?: string | null;
  whatsapp_business_account_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  billing_status?: string;

  // ── Per-tenant module switches (Ciao Pizza P0) ──────────────────────────
  // Accepted by the backend's BusinessUpdate schema but not surfaced here
  // until now -- selling e.g. the Inventory module previously required a
  // hand-made API call outside this UI. Only include a key here when the
  // admin has actually chosen to change it (see EditBusinessModal's
  // dirty-tracking) -- the backend applies PATCH with exclude_unset=True,
  // so omitting a key leaves its current value untouched, but explicitly
  // sending `false` would actively disable a module whose real current
  // state this UI cannot see (BusinessAdminResponse doesn't return these
  // fields yet -- see the note on the Business interface above).
  is_whatsapp_enabled?: boolean;
  inventory_enabled?: boolean;
  // digital_receipts_enabled (migration 0039): same gap as the comment above
  // describes, fixed in BusinessUpdate by BUG-0072 (admin_api commit
  // 264aac4, 2026-09-22, verified by reading the current
  // routes_businesses.py).
  digital_receipts_enabled?: boolean;
  // Delivery marketplace entitlements (migration 0044) -- deliberately NOT
  // added to OnboardingBusinessUpdate/ONBOARDER_PATCH_ALLOWED_FIELDS below:
  // enabling a live delivery integration carries real contractual weight
  // with Uber that a sales partner shouldn't be able to flip unilaterally
  // (see docs/DELIVERY_PLATFORM_ARCHITECTURE.md §7). Only reachable via
  // EditBusinessModal/CreateBusinessModal (SUPER_ADMIN-gated routes), which
  // pass ModuleTogglesFieldset's isSuperAdmin prop explicitly.
  delivery_platforms_enabled?: boolean;
  uber_eats_enabled?: boolean;
  mrd_enabled?: boolean;
  // Advanced Analytics entitlement (migration 0047) -- Commercial V1 tier
  // gate (NextGen Complete and above), same "platform decision, not a
  // tenant toggle" rationale as the delivery entitlements above --
  // deliberately NOT added to OnboardingBusinessUpdate/
  // ONBOARDER_PATCH_ALLOWED_FIELDS below: a sales partner should not be able
  // to unilaterally unlock a paid tier's analytics for a POS-only deal. Only
  // reachable via EditBusinessModal/CreateBusinessModal (SUPER_ADMIN-gated
  // routes), which pass ModuleTogglesFieldset's isSuperAdmin prop explicitly.
  advanced_analytics_enabled?: boolean;
  staff_live_orders_tab_enabled?: boolean;
  staff_wastage_tab_enabled?: boolean;
  staff_stocktake_tab_enabled?: boolean;
}

// The PATCH allow-list an ONBOARDER may send (ONBOARDER_PATCH_ALLOWED_FIELDS
// in admin_api/app/api/v1/routes_businesses.py) -- anything else 403s with
// FIELD_NOT_ALLOWED. Used by OnboardingWorkspacePage's inline edit so it's
// structurally impossible to build a payload with a forbidden field.
// Deliberately does NOT include delivery_platforms_enabled/uber_eats_enabled/
// mrd_enabled/advanced_analytics_enabled -- those stay SUPER_ADMIN-only (see
// UpdateBusinessRequest above), and OnboardingWorkspacePage/
// CreateOnboardingBusinessModal never
// let ANY role toggle them from here (both are reachable by ONBOARDER, and
// the reduced onboarding-workspace edit surface is deliberately narrower
// than full BusinessUpdate for both roles already -- e.g. Suspend/Limits/
// OrderPack are also only editable from the fuller /businesses page). A real
// SUPER_ADMIN who wants to set these uses that fuller page instead.
export type OnboardingBusinessUpdate = Pick<
  UpdateBusinessRequest,
  | "name"
  | "timezone"
  | "plan"
  | "whatsapp_phone_number_id"
  | "is_whatsapp_enabled"
  | "inventory_enabled"
  | "digital_receipts_enabled"
  | "staff_live_orders_tab_enabled"
  | "staff_wastage_tab_enabled"
  | "staff_stocktake_tab_enabled"
>;

export interface OrderPackRequest {
  pack_size: number;
}

export interface SuspendRequest {
  reason: string;
}

export interface SetLimitsRequest {
  daily_message_limit: number;
  daily_llm_call_limit: number;
  daily_order_limit: number;
}

export interface CreateOwnerRequest {
  email: string;
  full_name: string;
  role: "OWNER" | "MANAGER";
  // Marks this as the onboarder's own temporary working login ("NextGen
  // Onboarding"), not a real restaurant staff member. Must be role=MANAGER
  // (enforced server-side). Deactivated automatically on onboarding
  // complete. See OnboardingWorkspacePage's "Logins" section.
  is_onboarding_account?: boolean;
}

export interface CreateOwnerResponse {
  id: string;
  email: string;
  staff_name: string;
  role: string;
  business_id: string;
  is_active: boolean;
  created_at: string;
  // Shown once, in this response only.
  temporary_password: string;
}

export interface BusinessUserSummary {
  id: string;
  email: string | null;
  staff_name: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface ResetPasswordResponse {
  id: string;
  email: string | null;
  // Shown once, in this response only.
  temporary_password: string;
}

export interface WhatsAppTestRequest {
  to: string;
  text: string;
}

export interface WhatsAppTestResponse {
  success: boolean;
  wa_message_id: string;
  error: string;
  phone_number_id: string;
}

// ── Trial start/extend + go-live manual confirmations (Wave 0A) ────────────
// All three routes use get_business_commercial_scoped -- an ONBOARDER keeps
// access for their own clients even after handover (unlike the CONFIGURATION
// routes above, which use get_business_scoped and 404 post-handover).

export interface TrialStartResponse {
  business_id: string;
  billing_status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
}

export interface TrialExtendRequest {
  days: number;
  reason: string;
}

export interface TrialExtendResponse {
  business_id: string;
  billing_status: string;
  trial_ends_at: string | null;
  trial_extension_days_total: number;
}

export type OnboardingConfirmItem = "modules" | "receipt_print" | "whatsapp_test";

export interface OnboardingConfirmRequest {
  item: OnboardingConfirmItem;
  note?: string | null;
}

export interface OnboardingConfirmation {
  confirmed_by: string;
  confirmed_at: string;
  note: string | null;
}

export interface OnboardingConfirmResponse {
  business_id: string;
  onboarding_confirmations: Record<string, OnboardingConfirmation>;
}
