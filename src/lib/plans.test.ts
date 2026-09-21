import { describe, it, expect } from "vitest";
import { KNOWN_PLANS, isKnownPlan } from "./plans";

describe("plans", () => {
  it("recognizes exactly the plan values the platform's billing code understands", () => {
    expect(KNOWN_PLANS).toEqual(["STARTER", "GROWTH", "ENTERPRISE"]);
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
