import { apiClient } from "./client";
import type { LoginRequest, LoginResponse } from "@/types/auth";

export const authApi = {
  login(data: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>("/v1/admin/admin/login", data);
  },
};
