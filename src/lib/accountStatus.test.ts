import { describe, it, expect } from "vitest";
import { mostUrgentAlert, alertUrgency, trialDaysUrgency, deriveStatusBanner } from "./accountStatus";
import type { AccountAlert } from "@/types/commercial";

describe("alertUrgency", () => {
  it("ranks the 1-day/expired/suspended/overdue alerts as critical", () => {
    const critical: AccountAlert[] = ["TRIAL_ENDS_1D", "TRIAL_EXPIRED", "SUSPENDED", "INVOICE_OVERDUE"];
    for (const alert of critical) expect(alertUrgency(alert)).toBe("critical");
  });

  it("ranks the 3-day and payment-awaiting alerts as warning", () => {
    expect(alertUrgency("TRIAL_ENDS_3D")).toBe("warning");
    expect(alertUrgency("PAYMENT_AWAITING")).toBe("warning");
  });

  it("ranks the 7-day alert as info", () => {
    expect(alertUrgency("TRIAL_ENDS_7D")).toBe("info");
  });
});

describe("mostUrgentAlert", () => {
  it("returns null for an empty list", () => {
    expect(mostUrgentAlert([])).toBeNull();
  });

  it("picks the single most urgent alert when several are present", () => {
    expect(mostUrgentAlert(["TRIAL_ENDS_7D", "TRIAL_ENDS_1D"])).toBe("TRIAL_ENDS_1D");
    expect(mostUrgentAlert(["PAYMENT_AWAITING", "TRIAL_ENDS_7D"])).toBe("PAYMENT_AWAITING");
  });
});

describe("trialDaysUrgency", () => {
  it("colours 7/3/1/expired per the task brief", () => {
    expect(trialDaysUrgency(7)).toBe("info");
    expect(trialDaysUrgency(4)).toBe("info");
    expect(trialDaysUrgency(3)).toBe("warning");
    expect(trialDaysUrgency(2)).toBe("warning");
    expect(trialDaysUrgency(1)).toBe("critical");
    expect(trialDaysUrgency(0)).toBe("critical");
    expect(trialDaysUrgency(null)).toBe("critical");
  });
});

describe("deriveStatusBanner", () => {
  it("shows nothing for a healthy TRIAL far from expiry", () => {
    expect(deriveStatusBanner({ account_status: "TRIAL", days_remaining: 10, outstanding_cents: 0 })).toBeNull();
  });

  it("shows a critical banner for OVERDUE with the outstanding amount", () => {
    const banner = deriveStatusBanner({ account_status: "OVERDUE", days_remaining: null, outstanding_cents: 123450 });
    expect(banner?.urgency).toBe("critical");
    expect(banner?.text).toContain("R 1 234.50");
  });

  it("shows nothing for a healthy ACTIVE account", () => {
    expect(deriveStatusBanner({ account_status: "ACTIVE", days_remaining: null, outstanding_cents: 0 })).toBeNull();
  });
});
