import { apiClient } from "./client";
import type { AdminMe, LoginRequest, LoginResponse } from "@/types/auth";

export const authApi = {
  login(data: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>("/v1/admin/admin/login", data);
  },

  // Who am I, and what can I do -- re-validated against the DB on every call
  // (admin_api/app/core/deps.py::get_current_admin), so this is safe to use
  // as the source of truth for role-based nav/route gating.
  me(): Promise<AdminMe> {
    return apiClient.get<AdminMe>("/v1/admin/admin/me");
  },
};
