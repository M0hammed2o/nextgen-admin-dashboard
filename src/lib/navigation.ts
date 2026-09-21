import {
  LayoutDashboard, Building2, Mail, BarChart3, ScrollText, ExternalLink,
  ClipboardCheck, ShieldCheck, type LucideIcon,
} from "lucide-react";
import type { AdminRole } from "@/types/auth";

export interface NavItem {
  title: string;
  path: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Omitted = visible to every admin role. */
  roles?: AdminRole[];
}

// Single source of truth for the primary nav, used by BOTH the desktop
// sidebar (AdminSidebar) and the mobile drawer (AdminTopbar) so the two
// cannot silently drift apart again -- they previously did: "AI Emails" was
// only ever added to the desktop sidebar, never to the mobile drawer's own
// separate copy of this list (see PRODUCT_MAP.md's AI Email Outreach
// "Missing components" note / KNOWN_BUGS.md).
//
// ONBOARDER is restricted to "Onboarding" only -- everything else here is
// either SUPER_ADMIN-only server-side (Admin Users) or shows platform-wide
// commercial data an ONBOARDER has no business need for (Dashboard, Usage,
// Audit, AI Emails, the full Businesses list). This list is a UI
// convenience only; every route it points at is independently enforced
// server-side (see admin_api/app/core/deps.py) and RoleRoute below.
export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["SUPER_ADMIN"] },
  { title: "Businesses", path: "/businesses", icon: Building2, roles: ["SUPER_ADMIN"] },
  { title: "Onboarding", path: "/onboarding", icon: ClipboardCheck },
  { title: "AI Emails", path: "/ai-emails", icon: Mail, roles: ["SUPER_ADMIN"] },
  { title: "Usage", path: "/usage", icon: BarChart3, roles: ["SUPER_ADMIN"] },
  { title: "Audit Log", path: "/audit", icon: ScrollText, roles: ["SUPER_ADMIN"] },
  { title: "Admin Users", path: "/admin-users", icon: ShieldCheck, roles: ["SUPER_ADMIN"] },
];

/** Filters NAV_ITEMS down to what a given role may see. No role (still loading) = nothing. */
export function navItemsForRole(role: AdminRole | undefined | null): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

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
  "/onboarding": "Onboarding",
  "/ai-emails": "AI Emails",
  "/usage": "Usage Analytics",
  "/audit": "Audit Log",
  "/admin-users": "Admin Users",
};
