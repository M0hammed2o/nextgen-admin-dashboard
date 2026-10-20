import { describe, it, expect } from "vitest";
import { KNOWN_PLANS, isKnownPlan } from "./plans";

describe("plans", () => {
  it("recognizes exactly the plan values the platform's billing/admin code understands", () => {
    // WHATSAPP_ONLY added for the no-POS WhatsApp-only subscription package
    // (see this value's own comment in plans.ts) -- must stay paired with
    // `pos_enabled: false` on the business, not a plan-string-only switch.
    expect(KNOWN_PLANS).toEqual(["STARTER", "GROWTH", "ENTERPRISE", "WHATSAPP_ONLY"]);
  });

  it("isKnownPlan is true for each known plan", () => {
    for (const plan of KNOWN_PLANS) {
      expect(isKnownPlan(plan)).toBe(true);
    }
  });

  it("isKnownPlan is false for an arbitrary/legacy free-text value", () => {
    expect(isKnownPlan("LEGACY_CUSTOM_PLAN")).toBe(false);
    expect(isKnownPlan("")).toBe(false);
  });
});
