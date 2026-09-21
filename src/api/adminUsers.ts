import { apiClient } from "./client";
import type { AdminUserCreateRequest, AdminUserPatchRequest, AdminUserRecord } from "@/types/adminUsers";

// SUPER_ADMIN only -- every route here 403s for ONBOARDER server-side (see
// admin_api/app/api/v1/routes_admin_users.py). This is what makes
// sales-partner onboarding self-service: previously the only way to create
// an ONBOARDER login was scripts/seed.py, a local script with no production
// path.
export const adminUsersApi = {
  list(): Promise<AdminUserRecord[]> {
    return apiClient.get<AdminUserRecord[]>("/v1/admin/admin/admin-users");
  },

  create(data: AdminUserCreateRequest): Promise<AdminUserRecord> {
    return apiClient.post<AdminUserRecord>("/v1/admin/admin/admin-users", data);
  },

  update(id: string, data: AdminUserPatchRequest): Promise<AdminUserRecord> {
    return apiClient.patch<AdminUserRecord>(`/v1/admin/admin/admin-users/${id}`, data);
  },

  resetPassword(id: string): Promise<AdminUserRecord> {
    return apiClient.post<AdminUserRecord>(`/v1/admin/admin/admin-users/${id}/reset-password`);
  },
};
