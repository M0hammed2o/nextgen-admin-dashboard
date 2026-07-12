import { apiClient } from "./client";
import { ADMIN_API_BASE, TOKEN_KEY } from "@/lib/constants";
import type {
  ImportConfirmRequest,
  ImportConfirmResponse,
  ImportPreviewResponse,
  Lead,
  LeadDetail,
  LeadListParams,
  LeadListResponse,
} from "@/types/aiEmails";

const BASE = "/v1/admin/admin/ai-emails";

export const aiEmailsApi = {
  // multipart/form-data upload — apiClient.post always JSON-stringifies its
  // body, so this needs a bespoke fetch (same precedent as businessesApi.billingPdf).
  async previewImport(file: File): Promise<ImportPreviewResponse> {
    const token = localStorage.getItem(TOKEN_KEY);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${ADMIN_API_BASE}${BASE}/import/preview`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || `Import preview failed: ${res.status}`);
    }
    return res.json();
  },

  confirmImport(data: ImportConfirmRequest): Promise<ImportConfirmResponse> {
    return apiClient.post<ImportConfirmResponse>(`${BASE}/import/confirm`, data);
  },

  listLeads(params: LeadListParams = {}): Promise<LeadListResponse> {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.per_page) q.set("per_page", String(params.per_page));
    if (params.lead_status) q.set("lead_status", params.lead_status);
    if (params.city) q.set("city", params.city);
    if (params.search) q.set("search", params.search);
    if (params.assigned_admin_user_id) q.set("assigned_admin_user_id", params.assigned_admin_user_id);
    if (params.do_not_contact !== undefined && params.do_not_contact !== null) {
      q.set("do_not_contact", String(params.do_not_contact));
    }
    const qs = q.toString();
    return apiClient.get<LeadListResponse>(`${BASE}/leads${qs ? `?${qs}` : ""}`);
  },

  getLead(id: string): Promise<LeadDetail> {
    return apiClient.get<LeadDetail>(`${BASE}/leads/${id}`);
  },
};

export type { Lead, LeadDetail };
