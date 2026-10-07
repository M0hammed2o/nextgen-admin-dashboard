import {
  LayoutDashboard, Building2, Mail, BarChart3, ScrollText, ExternalLink,
  ClipboardCheck, ShieldCheck, DollarSign, type LucideIcon,
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
  // Sales/commercial UI (Wave 0A) -- visible to BOTH roles: ONBOARDER's
  // actual landing page (see HomeRoute), and SUPER_ADMIN's platform-wide
  // commercial view. Unlike Businesses/Dashboard/Usage/Audit above, this is
  // deliberately not SUPER_ADMIN-only.
  { title: "Sales", path: "/sales", icon: DollarSign },
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
  "/sales": "Sales Dashboard",
  "/sales/clients": "Clients",
  "/businesses": "Businesses",
  "/onboarding": "Onboarding",
  "/ai-emails": "AI Emails",
  "/ai-emails/leads": "Leads",
  "/usage": "Usage Analytics",
  "/audit": "Audit Log",
  "/admin-users": "Admin Users",
};

// Detail routes (/businesses/:id and friends) have no exact entry above, so
// they resolve by path prefix. LONGEST PREFIX FIRST: "/ai-emails/leads/" has
// to be tested before "/ai-emails" would ever match, or every lead detail page
// would be titled "AI Emails".
const PAGE_TITLE_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ["/businesses/", "Business Details"],
  ["/onboarding/", "Onboarding Workspace"],
  ["/sales/clients/", "Client"],
  ["/ai-emails/leads/", "Lead"],
];

/**
 * The topbar is the ONLY place an admin page title is rendered -- pages
 * deliberately do not repeat it as their own heading, so this function is the
 * single source of truth for "what page am I on".
 *
 * It previously lived inline in AdminTopbar as a chain of ternaries, which is
 * how /ai-emails/leads and /ai-emails/leads/:id came to fall through to the
 * generic "Admin": neither had an exact entry and neither had a prefix rule.
 * Pulled out here so the resolution is testable per route rather than only
 * observable by loading the app.
 */
export function resolvePageTitle(pathname: string): string {
  const exact = PAGE_TITLES[pathname];
  if (exact) return exact;
  for (const [prefix, title] of PAGE_TITLE_PREFIXES) {
    if (pathname.startsWith(prefix)) return title;
  }
  return "Admin";
}
