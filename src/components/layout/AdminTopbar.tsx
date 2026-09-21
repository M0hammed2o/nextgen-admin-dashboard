import { useLocation, NavLink } from "react-router-dom";
import { Menu, LogOut, Moon, Sun } from "lucide-react";
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/constants";
import { useState, useEffect } from "react";
import { Zap, X } from "lucide-react";
import { navItemsForRole, PAGE_TITLES as pageTitles } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ONBOARDER: "Onboarder",
};

export function AdminTopbar() {
  const location = useLocation();
  const { me } = useAuth();
  const navItems = navItemsForRole(me?.role);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const title =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith("/businesses/") ? "Business Details" :
     location.pathname.startsWith("/onboarding/") ? "Onboarding Workspace" :
     location.pathname.startsWith("/sales/clients/") ? "Client" : "Admin");

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.location.href = "/login";
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 lg:px-6 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-1.5 rounded-md hover:bg-muted"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDark(!dark)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {me && (
            <span className="hidden sm:inline text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {ROLE_LABELS[me.role] ?? me.role}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary/20">
                  <Zap className="w-4 h-4 text-sidebar-primary" />
                </div>
                <span className="text-base font-semibold text-sidebar-accent-foreground">NextGen AI</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-sidebar-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.title}
                  </NavLink>
                );
              })}
            </nav>
            <div className="px-3 pb-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-sidebar-muted hover:bg-sidebar-accent hover:text-destructive transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
