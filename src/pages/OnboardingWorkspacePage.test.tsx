import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import OnboardingWorkspacePage from "./OnboardingWorkspacePage";
import { businessesApi } from "@/api/businesses";
import type { OnboardingBusiness } from "@/types/business";
import type { OnboardingStatusResponse } from "@/types/onboarding";

vi.mock("@/api/businesses", () => ({
  businessesApi: {
    getOnboarding: vi.fn(),
    getOnboardingStatus: vi.fn(),
    listUsers: vi.fn(),
    updateOnboardingBusiness: vi.fn(),
    completeOnboarding: vi.fn(),
    resetPassword: vi.fn(),
    createOwner: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ me: { id: "a1", email: "a@nextgen.co.za", display_name: "A", role: "ONBOARDER", is_active: true }, isSuperAdmin: false, isOnboarder: true }),
}));

const BUSINESS: OnboardingBusiness = {
  id: "biz-1", name: "Barn Owl", slug: "barn-owl", business_code: "ABC123",
  is_active: true, suspended_reason: null, timezone: "Africa/Johannesburg", plan: "STARTER",
  billing_status: "TRIAL", currency: "ZAR", whatsapp_phone_number_id: null,
  daily_message_limit: 800, daily_llm_call_limit: 400, daily_order_limit: 200,
  last_webhook_received_at: null, created_at: "2026-01-01T00:00:00Z",
  is_whatsapp_enabled: false, inventory_enabled: false,
  staff_live_orders_tab_enabled: true, staff_wastage_tab_enabled: true, staff_stocktake_tab_enabled: true,
  onboarded_by_admin_id: "a1", onboarding_completed_at: null,
};

function makeStatus(overrides: Partial<OnboardingStatusResponse["go_live"]>): OnboardingStatusResponse {
  const checks: OnboardingStatusResponse["go_live"]["checks"] = [
    { key: "owner_login", label: "Owner login", status: "fail", detail: "No active OWNER login exists yet" },
    { key: "staff_pin", label: "Staff PIN login", status: "warn", detail: "No staff member has a PIN yet" },
    { key: "menu", label: "Menu", status: "fail", detail: "0 active categories, 0 active items" },
    { key: "vat_receipt", label: "VAT & receipt settings", status: "pass", detail: "Configured" },
    { key: "pos_payment_method", label: "POS payment method", status: "fail", detail: "No till payment method enabled" },
    { key: "till_session", label: "Till opened", status: "fail", detail: "The till has never been opened" },
    { key: "pos_test_order", label: "POS test order", status: "fail", detail: "No POS order has been rung up yet" },
    { key: "ingredients", label: "Ingredients", status: "n/a", detail: "Inventory module is off" },
    { key: "recipe_coverage", label: "Recipe coverage", status: "n/a", detail: "Inventory module is off" },
    { key: "opening_stocktake", label: "Opening stocktake", status: "n/a", detail: "Inventory module is off" },
    { key: "whatsapp_phone_number", label: "WhatsApp phone number", status: "n/a", detail: "WhatsApp is off" },
    { key: "billing_status", label: "Billing status", status: "pass", detail: "Billing status is TRIAL" },
  ];
  const failed = checks.filter((c) => c.status === "fail").length;
  const passed = checks.filter((c) => c.status === "pass").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  return {
    business_id: BUSINESS.id, business_name: BUSINESS.name,
    setup: { business_name: BUSINESS.name, inventory_enabled: false, ready_to_trade: false, percent_complete: 10, steps: [] },
    go_live: { ready: failed === 0, passed, failed, warned, checks, ...overrides },
    ready: failed === 0,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/onboarding/biz-1"]}>
      <Routes>
        <Route path="/onboarding/:id" element={<OnboardingWorkspacePage />} />
        <Route path="/onboarding" element={<div>Onboarding List</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("OnboardingWorkspacePage go-live checklist + handover gating", () => {
  beforeEach(() => {
    vi.mocked(businessesApi.getOnboarding).mockReset().mockResolvedValue(BUSINESS);
    vi.mocked(businessesApi.listUsers).mockReset().mockResolvedValue([]);
    vi.mocked(businessesApi.getOnboardingStatus).mockReset();
    vi.mocked(businessesApi.completeOnboarding).mockReset();
  });

  it("renders pass/fail/warn/n-a badges for every check and disables Complete Handover while not ready", async () => {
    vi.mocked(businessesApi.getOnboardingStatus).mockResolvedValue(makeStatus({}));

    renderPage();

    await waitFor(() => expect(screen.getAllByText("Fail").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Pass").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Warn").length).toBeGreaterThan(0);
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);

    const handoverButton = screen.getByRole("button", { name: "Complete Handover" });
    expect(handoverButton).toBeDisabled();
    expect(screen.getByText(/Resolve every failing check above/)).toBeInTheDocument();

    // No force-complete button for an ONBOARDER, ever.
    expect(screen.queryByRole("button", { name: /Force Complete/ })).not.toBeInTheDocument();
  });

  it("enables Complete Handover once every check passes, and completes onboarding on confirm", async () => {
    const readyStatus = makeStatus({});
    readyStatus.go_live.checks = readyStatus.go_live.checks.map((c) =>
      c.status === "fail" ? { ...c, status: "pass" as const, detail: "OK" } : c
    );
    readyStatus.go_live.failed = 0;
    readyStatus.go_live.passed = readyStatus.go_live.checks.filter((c) => c.status === "pass").length;
    readyStatus.go_live.ready = true;
    readyStatus.ready = true;
    vi.mocked(businessesApi.getOnboardingStatus).mockResolvedValue(readyStatus);
    vi.mocked(businessesApi.completeOnboarding).mockResolvedValue({
      business_id: "biz-1", onboarding_completed_at: "2026-01-02T00:00:00Z", forced: false, deactivated_onboarding_accounts: 1,
    });

    renderPage();

    const handoverButton = await screen.findByRole("button", { name: "Complete Handover" });
    expect(handoverButton).not.toBeDisabled();

    fireEvent.click(handoverButton);
    expect(await screen.findByText(/deactivates your temporary/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Handover" }));

    await waitFor(() =>
      expect(businessesApi.completeOnboarding).toHaveBeenCalledWith("biz-1", { force: false })
    );
    await waitFor(() => expect(screen.getByText("Onboarding List")).toBeInTheDocument());
  });
});
