import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Building2, BarChart3, ScrollText, LogOut, Zap, ExternalLink } from "lucide-react";
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Businesses", path: "/businesses", icon: Building2 },
  { title: "Usage", path: "/usage", icon: BarChart3 },
  { title: "Audit Log", path: "/audit", icon: ScrollText },
];

const externalLinks = [
  { title: "Business Portal", url: "https://app.nextgenintelligence.co.za", icon: ExternalLink },
  { title: "Staff Login", url: "https://staff.nextgenintelligence.co.za", icon: ExternalLink },
];

export function AdminSidebar() {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.location.href = "/login";
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border min-h-screen">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary/20">
          <Zap className="w-4 h-4 text-sidebar-primary" />
        </div>
        <span className="text-base font-semibold text-sidebar-accent-foreground tracking-tight">
          NextGen AI
        </span>
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

      <div className="px-3 py-3 border-t border-sidebar-border">
        <p className="px-3 mb-1.5 text-[10px] uppercase tracking-widest text-sidebar-muted font-semibold">Portals</p>
        {externalLinks.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <link.icon className="w-3.5 h-3.5" />
            {link.title}
          </a>
        ))}
      </div>

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
  );
}
