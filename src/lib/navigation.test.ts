import { describe, it, expect } from "vitest";
import { navItemsForRole, NAV_ITEMS, resolvePageTitle } from "./navigation";

// The sales-partner onboarding brief requires ONBOARDER to see ONLY "Sales"
// and "Onboarding" in the nav -- no Dashboard metrics, Usage, Audit, AI
// Emails, Businesses, or Admin Users -- while SUPER_ADMIN keeps
// everything, INCLUDING Sales (Wave 0A commercial push, 2026-09-21 -- Sales
// is the one item with no `roles` restriction, visible to both). This is a
// UI convenience only (every route is independently enforced server-side --
// see RoleRoute.tsx), but it must not regress.
describe("navItemsForRole", () => {
  it("gives ONBOARDER only Sales and Onboarding", () => {
    const items = navItemsForRole("ONBOARDER");
    expect(items.map((i) => i.title)).toEqual(["Sales", "Onboarding"]);
  });

  it("gives SUPER_ADMIN every nav item", () => {
    const items = navItemsForRole("SUPER_ADMIN");
    expect(items).toHaveLength(NAV_ITEMS.length);
    expect(items.map((i) => i.title)).toContain("Dashboard");
    expect(items.map((i) => i.title)).toContain("Sales");
    expect(items.map((i) => i.title)).toContain("Businesses");
    expect(items.map((i) => i.title)).toContain("Onboarding");
    expect(items.map((i) => i.title)).toContain("AI Emails");
    expect(items.map((i) => i.title)).toContain("Usage");
    expect(items.map((i) => i.title)).toContain("Audit Log");
    expect(items.map((i) => i.title)).toContain("Admin Users");
  });

  it("returns nothing while the role hasn't loaded yet", () => {
    expect(navItemsForRole(undefined)).toEqual([]);
    expect(navItemsForRole(null)).toEqual([]);
  });
});

/**
 * Every route the admin suite actually serves (see App.tsx) must resolve to a
 * real title. The generic "Admin" fallback is reserved for genuinely unknown
 * paths -- it is NOT an acceptable title for a shipped route.
 *
 * This exists because /ai-emails/leads and /ai-emails/leads/:id DID render as
 * "Admin" in the topbar: title resolution was a ternary chain inside
 * AdminTopbar, so those two routes had neither an exact entry nor a prefix
 * rule, and nothing failed. The topbar is the ONLY place an admin page title
 * is rendered, so a wrong answer here is the whole page's heading.
 */
const ROUTES: Array<[string, string]> = [
  ["/", "Dashboard"],
  ["/sales", "Sales Dashboard"],
  ["/sales/clients", "Clients"],
  ["/sales/clients/abc-123", "Client"],
  ["/businesses", "Businesses"],
  ["/businesses/abc-123", "Business Details"],
  ["/onboarding", "Onboarding"],
  ["/onboarding/abc-123", "Onboarding Workspace"],
  ["/admin-users", "Admin Users"],
  ["/ai-emails", "AI Emails"],
  ["/ai-emails/leads", "Leads"],
  ["/ai-emails/leads/abc-123", "Lead"],
  ["/usage", "Usage Analytics"],
  ["/audit", "Audit Log"],
];

describe("resolvePageTitle", () => {
  it.each(ROUTES)("titles %s as %s", (path, expected) => {
    expect(resolvePageTitle(path)).toBe(expected);
  });

  it("never leaves a served route on the generic fallback", () => {
    const generic = ROUTES.filter(([p]) => resolvePageTitle(p) === "Admin").map(([p]) => p);
    expect(generic).toEqual([]);
  });

  it("prefers the longest matching prefix", () => {
    // "/ai-emails/leads/x" must not be swallowed by an "/ai-emails" rule.
    expect(resolvePageTitle("/ai-emails/leads/x")).toBe("Lead");
  });

  it("still falls back for a genuinely unknown path", () => {
    expect(resolvePageTitle("/nope")).toBe("Admin");
  });

  it("gives every nav destination a title", () => {
    for (const item of NAV_ITEMS) {
      expect(resolvePageTitle(item.path), item.path).not.toBe("Admin");
    }
  });
});
