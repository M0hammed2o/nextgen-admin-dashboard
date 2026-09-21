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
  staff_live_orders_tab_enabled?: boolean;
  staff_wastage_tab_enabled?: boolean;
  staff_stocktake_tab_enabled?: boolean;
}

// The PATCH allow-list an ONBOARDER may send (ONBOARDER_PATCH_ALLOWED_FIELDS
// in admin_api/app/api/v1/routes_businesses.py) -- anything else 403s with
// FIELD_NOT_ALLOWED. Used by OnboardingWorkspacePage's inline edit so it's
// structurally impossible to build a payload with a forbidden field.
export type OnboardingBusinessUpdate = Pick<
  UpdateBusinessRequest,
  | "name"
  | "timezone"
  | "plan"
  | "whatsapp_phone_number_id"
  | "is_whatsapp_enabled"
  | "inventory_enabled"
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
