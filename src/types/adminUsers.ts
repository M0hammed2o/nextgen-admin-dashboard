import type { AdminRole } from "@/types/auth";

export interface AdminUserRecord {
  id: string;
  email: string;
  display_name: string;
  role: AdminRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  // Shown once, only in the response right after POST / .../reset-password.
  temporary_password?: string | null;
}

export interface AdminUserCreateRequest {
  email: string;
  display_name: string;
  role: AdminRole;
}

export interface AdminUserPatchRequest {
  display_name?: string;
  role?: AdminRole;
  is_active?: boolean;
}
