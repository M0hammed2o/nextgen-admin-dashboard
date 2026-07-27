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
