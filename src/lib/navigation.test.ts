import { describe, it, expect } from "vitest";
import { navItemsForRole, NAV_ITEMS } from "./navigation";

// The sales-partner onboarding brief requires ONBOARDER to see ONLY
// "Onboarding" in the nav -- no Dashboard metrics, Usage, Audit, AI
// Emails, Businesses, or Admin Users -- while SUPER_ADMIN keeps
// everything. This is a UI convenience only (every route is independently
// enforced server-side -- see RoleRoute.tsx), but it must not regress.
describe("navItemsForRole", () => {
  it("gives ONBOARDER only the Onboarding item", () => {
    const items = navItemsForRole("ONBOARDER");
    expect(items.map((i) => i.title)).toEqual(["Onboarding"]);
  });

  it("gives SUPER_ADMIN every nav item", () => {
    const items = navItemsForRole("SUPER_ADMIN");
    expect(items).toHaveLength(NAV_ITEMS.length);
    expect(items.map((i) => i.title)).toContain("Dashboard");
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
