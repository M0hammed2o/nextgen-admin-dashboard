import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/constants";

function AdminLayoutInner() {
  const { me, loading, error, refresh } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.location.href = "/login";
  };

  // Block rendering the shell/Outlet until we know the admin's role --
  // prevents a flash of the wrong nav (e.g. Dashboard/Businesses for an
  // ONBOARDER) before /admin/me resolves.
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-sm text-destructive">{error || "Could not load your admin session."}</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>Retry</Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>Log out</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <AuthProvider>
      <AdminLayoutInner />
    </AuthProvider>
  );
}
