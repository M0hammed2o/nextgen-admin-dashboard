export interface Lead {
  id: string;
  business_name: string;
  category: string | null;
  city: string | null;
  suburb: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  preferred_contact_method: string;
  verification_status: string;
  lead_status: string;
  do_not_contact: boolean;
  assigned_admin_user_id: string | null;
  last_contacted_date: string | null;
  next_follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadDetail extends Lead {
  address: string | null;
  source_url: string | null;
  research_notes: string | null;
  ai_research_summary: string | null;
  tags: string[];
  unsubscribed_at: string | null;
  unsubscribe_reason: string | null;
  import_batch_id: string | null;
}

export interface PaginationMeta {
  total: number | null;
  page: number | null;
  per_page: number;
  next_cursor: string | null;
  has_more: boolean;
}

export interface LeadListResponse {
  data: Lead[];
  pagination: PaginationMeta;
}

export interface ImportPreviewRow {
  row_number: number;
  status: "valid" | "invalid" | "duplicate";
  data: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  duplicate_reason: string | null;
  existing_lead_id: string | null;
}

export interface ImportPreviewResponse {
  batch_id: string;
  filename: string;
  file_type: string;
  detected_headers: string[];
  suggested_mapping: Record<string, string | null>;
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  rejected_rows: number;
  preview_rows: ImportPreviewRow[];
}

export interface ImportConfirmRequest {
  batch_id: string;
  skip_row_numbers: number[];
  duplicate_strategy: "skip" | "update" | "create_anyway";
}

export interface ImportConfirmResponse {
  batch_id: string;
  status: string;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  created_lead_ids: string[];
}

export interface LeadListParams {
  page?: number;
  per_page?: number;
  lead_status?: string | null;
  city?: string | null;
  search?: string | null;
  assigned_admin_user_id?: string | null;
  do_not_contact?: boolean | null;
}
