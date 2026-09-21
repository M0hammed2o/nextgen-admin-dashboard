import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { AdminRole } from "@/types/auth";

interface Props {
  roles: AdminRole[];
  children: ReactNode;
}

/**
 * Client-side route gate for role-restricted pages. This is a convenience
 * (avoids a confusing blank/broken page on direct URL access) -- the server
 * enforces every one of these permissions independently and returns 403/404
 * regardless of what this component does (see admin_api/app/core/deps.py).
 * Never treat hiding a route here as a real security boundary.
 */
export function RoleRoute({ roles, children }: Props) {
  const { me, loading } = useAuth();

  // AdminLayout already blocks rendering its <Outlet> until the admin
  // session has loaded, so this is a defensive fallback, not the primary gate.
  if (loading) return null;

  if (!me || !roles.includes(me.role)) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold mb-2">Not available for your role</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Your account{me ? ` (${me.role})` : ""} doesn't have access to this page. If you believe this is
          wrong, contact a Super Admin.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
