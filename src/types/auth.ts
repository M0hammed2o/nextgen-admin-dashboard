export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// Matches admin_api/app/core/deps.py's require_admin_role allow-list --
// the only two admin-plane roles that exist today.
export type AdminRole = "SUPER_ADMIN" | "ONBOARDER";

// GET /admin/me -- re-validated against the DB on every request server-side
// (see admin_api/app/core/deps.py::get_current_admin), so a demoted/
// deactivated admin's role/is_active here is always current, never stale
// token-claim data.
export interface AdminMe {
  id: string;
  email: string;
  display_name: string;
  role: AdminRole;
  is_active: boolean;
}
