import { apiClient } from "./client";
import type { AuditRecord } from "@/types/audit";

export const auditApi = {
  list(params?: { scope?: string; business_id?: string; page?: number; per_page?: number }): Promise<AuditRecord[]> {
    const q = new URLSearchParams();
    if (params?.scope) q.set("scope", params.scope);
    if (params?.business_id) q.set("business_id", params.business_id);
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    const qs = q.toString();
    return apiClient.get<AuditRecord[]>(`/v1/admin/admin/audit${qs ? `?${qs}` : ""}`);
  },
};
