import { LayoutDashboard, Building2, Mail, BarChart3, ScrollText, ExternalLink, type LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

// Single source of truth for the primary nav, used by BOTH the desktop
// sidebar (AdminSidebar) and the mobile drawer (AdminTopbar) so the two
// cannot silently drift apart again -- they previously did: "AI Emails" was
// only ever added to the desktop sidebar, never to the mobile drawer's own
// separate copy of this list (see PRODUCT_MAP.md's AI Email Outreach
// "Missing components" note / KNOWN_BUGS.md).
export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Businesses", path: "/businesses", icon: Building2 },
  { title: "AI Emails", path: "/ai-emails", icon: Mail },
  { title: "Usage", path: "/usage", icon: BarChart3 },
  { title: "Audit Log", path: "/audit", icon: ScrollText },
];

export interface ExternalNavLink {
  title: string;
  url: string;
  icon: LucideIcon;
}

export const EXTERNAL_NAV_LINKS: ExternalNavLink[] = [
  { title: "Business Portal", url: "https://app.nextgenintelligence.co.za", icon: ExternalLink },
  { title: "Staff Login", url: "https://staff.nextgenintelligence.co.za", icon: ExternalLink },
];

// Topbar header title per path. Intentionally a separate map from NAV_ITEMS'
// `title` (not derived) -- some header labels differ from the nav label on
// purpose (e.g. "Usage Analytics" vs. "Usage"), and detail pages like
// /businesses/:id have no 1:1 nav item at all (handled separately in
// AdminTopbar via a startsWith check).
export const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/businesses": "Businesses",
  "/ai-emails": "AI Emails",
  "/usage": "Usage Analytics",
  "/audit": "Audit Log",
};
