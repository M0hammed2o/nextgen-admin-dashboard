import { apiClient } from "./client";
import type { UsageRecord, UsageAlert } from "@/types/usage";

export const usageApi = {
  get(params: { start_date: string; end_date: string; business_id?: string }): Promise<UsageRecord[]> {
    const q = new URLSearchParams();
    q.set("start_date", params.start_date);
    q.set("end_date", params.end_date);
    if (params.business_id) q.set("business_id", params.business_id);
    return apiClient.get<UsageRecord[]>(`/v1/admin/admin/usage?${q.toString()}`);
  },

  // GET /admin/usage-alerts (see types/usage.ts's UsageAlert comment for the
  // contract-assumption note). SUPER_ADMIN-only -- every call site for this
  // lives on DashboardPage, only reachable for SUPER_ADMIN via HomeRoute.
  getAlerts(): Promise<UsageAlert[]> {
    return apiClient.get<UsageAlert[]>("/v1/admin/admin/usage-alerts");
  },
};
