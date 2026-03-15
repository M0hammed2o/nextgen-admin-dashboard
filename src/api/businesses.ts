import { apiClient } from "./client";
import type {
  Business,
  CreateBusinessRequest,
  UpdateBusinessRequest,
  SuspendRequest,
  SetLimitsRequest,
  CreateOwnerRequest,
  CreateOwnerResponse,
  WhatsAppTestRequest,
  WhatsAppTestResponse,
} from "@/types/business";

export const businessesApi = {
  list(params?: { is_active?: boolean | null; page?: number; per_page?: number }): Promise<Business[]> {
    const q = new URLSearchParams();
    if (params?.is_active !== undefined && params.is_active !== null) {
      q.set("is_active", String(params.is_active));
    }
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    const qs = q.toString();
    return apiClient.get<Business[]>(`/v1/admin/admin/businesses${qs ? `?${qs}` : ""}`);
  },

  get(id: string): Promise<Business> {
    return apiClient.get<Business>(`/v1/admin/admin/businesses/${id}`);
  },

  create(data: CreateBusinessRequest): Promise<Business> {
    return apiClient.post<Business>("/v1/admin/admin/businesses", data);
  },

  update(id: string, data: UpdateBusinessRequest): Promise<Business> {
    return apiClient.patch<Business>(`/v1/admin/admin/businesses/${id}`, data);
  },

  suspend(id: string, data: SuspendRequest): Promise<Business> {
    return apiClient.post<Business>(`/v1/admin/admin/businesses/${id}/suspend`, data);
  },

  unsuspend(id: string): Promise<Business> {
    return apiClient.post<Business>(`/v1/admin/admin/businesses/${id}/unsuspend`);
  },

  setLimits(id: string, data: SetLimitsRequest): Promise<Business> {
    return apiClient.post<Business>(`/v1/admin/admin/businesses/${id}/limits`, data);
  },

  createOwner(id: string, data: CreateOwnerRequest): Promise<CreateOwnerResponse> {
    return apiClient.post<CreateOwnerResponse>(`/v1/admin/admin/businesses/${id}/owner`, data);
  },

  whatsappTestSend(id: string, data: WhatsAppTestRequest): Promise<WhatsAppTestResponse> {
    return apiClient.post<WhatsAppTestResponse>(`/v1/admin/admin/businesses/${id}/whatsapp/test-send`, data);
  },

  async billingPdf(id: string): Promise<void> {
    const token = localStorage.getItem("nextgen_admin_token");
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "https://admin-api.nextgenintelligence.co.za"}/v1/admin/admin/businesses/${id}/billing/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to generate billing PDF");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
