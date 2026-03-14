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
  last_webhook_received_at: string | null;
  created_at: string;
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
  owner_password: string;
  owner_full_name: string;
}

export interface UpdateBusinessRequest {
  name?: string;
  timezone?: string;
  plan?: string;
  whatsapp_phone_number_id?: string;
  whatsapp_business_account_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
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
  password: string;
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
