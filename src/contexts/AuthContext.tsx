import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi } from "@/api/auth";
import { TOKEN_KEY } from "@/lib/constants";
import type { AdminMe } from "@/types/auth";

interface AuthContextValue {
  /** null while loading, or when there is no valid admin session. */
  me: AdminMe | null;
  loading: boolean;
  /** Set only when the /admin/me call itself failed (not just "no token"). */
  error: string;
  isSuperAdmin: boolean;
  isOnboarder: boolean;
  /** Re-fetch /admin/me -- call after login, and offered as a Retry action. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Loads GET /admin/me once on mount (and whenever refresh() is called) and
 * exposes the admin's role for nav/route gating.
 *
 * /admin/me is re-validated against the DB on every request (see
 * admin_api/app/core/deps.py::get_current_admin), so this is a safe source
 * of truth: a demoted/deactivated admin's role/is_active here is always
 * current, never stale token-claim data. The server enforces every
 * permission regardless -- this context only drives what the UI shows;
 * hiding a nav item is a convenience, not a security boundary.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setMe(null);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await authApi.me();
      setMe(result);
    } catch (err: unknown) {
      setMe(null);
      setError(err instanceof Error ? err.message : "Failed to load admin session");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value: AuthContextValue = {
    me,
    loading,
    error,
    isSuperAdmin: me?.role === "SUPER_ADMIN",
    isOnboarder: me?.role === "ONBOARDER",
    refresh: load,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
