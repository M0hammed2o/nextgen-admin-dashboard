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
    confirmOnboardingItem: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// A plain vi.fn() (not a fixed object) so individual tests can override the
// caller's role via mockReturnValue -- needed to cover the SUPER_ADMIN path
// added 2026-10-10 (Part C1/C2 fix) alongside the pre-existing ONBOARDER one.
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));

const ONBOARDER_AUTH = {
  me: { id: "a1", email: "a@nextgen.co.za", display_name: "A", role: "ONBOARDER", is_active: true },
  isSuperAdmin: false,
  isOnboarder: true,
};
const SUPER_ADMIN_AUTH = {
  me: { id: "s1", email: "s@nextgen.co.za", display_name: "S", role: "SUPER_ADMIN", is_active: true },
  isSuperAdmin: true,
  isOnboarder: false,
};

const BUSINESS: OnboardingBusiness = {
  id: "biz-1", name: "Barn Owl", slug: "barn-owl", business_code: "ABC123",
  is_active: true, suspended_reason: null, timezone: "Africa/Johannesburg", plan: "STARTER",
  billing_status: "TRIAL", currency: "ZAR", whatsapp_phone_number_id: null,
  daily_message_limit: 800, daily_llm_call_limit: 400, daily_order_limit: 200,
  last_webhook_received_at: null, created_at: "2026-01-01T00:00:00Z",
  is_whatsapp_enabled: false, inventory_enabled: false, digital_receipts_enabled: false,
  delivery_platforms_enabled: true, uber_eats_enabled: false, mrd_enabled: false,
  delivery_reconciliation_enabled: false,
  advanced_analytics_enabled: false,
  loyalty_enabled: false,
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
  const applicable = checks.filter((c) => c.status !== "n/a");
  const readiness = {
    passed, total: applicable.length,
    percent: applicable.length ? Math.round((100 * passed) / applicable.length) : 100,
    label: `Restaurant Ready — ${passed}/${applicable.length} checks complete`,
  };
  return {
    business_id: BUSINESS.id, business_name: BUSINESS.name,
    setup: { business_name: BUSINESS.name, inventory_enabled: false, ready_to_trade: false, percent_complete: 10, steps: [] },
    go_live: { ready: failed === 0, passed, failed, warned, checks, readiness, ...overrides },
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
    vi.mocked(businessesApi.updateOnboardingBusiness).mockReset().mockResolvedValue(BUSINESS);
    // Default every test to the existing ONBOARDER fixture -- only the new
    // SUPER_ADMIN test below overrides this, so every pre-existing test's
    // behaviour is completely unchanged by this restructuring.
    mockUseAuth.mockReturnValue(ONBOARDER_AUTH);
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

  // Delivery entitlements (delivery_platforms_enabled/uber_eats_enabled/
  // mrd_enabled) are SUPER_ADMIN-writable only -- this workspace (reachable
  // by ONBOARDER per the mocked useAuth above) must show them read-only via
  // ModuleTogglesFieldset's locked-row rendering, never as an editable
  // control that would 403 on save.
  it("shows delivery entitlements read-only, with no editable control, for an ONBOARDER", async () => {
    vi.mocked(businessesApi.getOnboardingStatus).mockResolvedValue(makeStatus({}));
    renderPage();

    await screen.findByText("Delivery Marketplace");
    // BUSINESS fixture has delivery_platforms_enabled: true, the other two false.
    const marketplaceRow = screen.getByText("Delivery Marketplace").closest("div")!.parentElement!;
    expect(marketplaceRow.textContent).toContain("On");
    const uberRow = screen.getByText("Uber Eats").closest("div")!.parentElement!;
    expect(uberRow.textContent).toContain("Off");

    expect(screen.getAllByText("Only a NextGen super admin can change this.").length).toBeGreaterThan(0);
    // No Switch/On/Off/Leave controls for the locked delivery rows. The row's
    // "More info" disclosure button (2026-10-10, Part C5) is excluded here --
    // it only expands/collapses the description text and never calls
    // onChange, so it is not one of the state-changing controls this
    // assertion exists to rule out.
    const stateChangingButtons = Array.from(marketplaceRow.querySelectorAll("button")).filter(
      (b) => b.textContent !== "More info" && b.textContent !== "Less info"
    );
    expect(stateChangingButtons).toHaveLength(0);
  });

  // Fixed 2026-10-10 (confirmed frontend bug, Part C1/C2): a real SUPER_ADMIN
  // using THIS exact page (reachable by both roles) used to see delivery/
  // Uber/Mr D/Advanced Analytics/Loyalty as locked "Unknown" rows they could
  // not set -- even though the backend already allows a SUPER_ADMIN caller
  // to set these fields via this same PATCH endpoint. This is the
  // end-to-end proof, through the real page (not just the two unit-tested
  // pieces in isolation): the fieldset renders an editable Switch, AND the
  // resulting save actually includes the field in the request.
  it("SUPER_ADMIN sees delivery entitlements as editable Switches, and saving actually sends a change", async () => {
    mockUseAuth.mockReturnValue(SUPER_ADMIN_AUTH);
    vi.mocked(businessesApi.getOnboardingStatus).mockResolvedValue(makeStatus({}));
    renderPage();

    await screen.findByText("Delivery Marketplace");
    // No "locked" messaging at all for a SUPER_ADMIN.
    expect(screen.queryByText("Only a NextGen super admin can change this.")).not.toBeInTheDocument();

    const uberRow = screen.getByText("Uber Eats").closest("div")!.parentElement!;
    const uberSwitch = uberRow.querySelector('[role="switch"]');
    expect(uberSwitch).not.toBeNull(); // a real Switch, not a locked badge
    expect(uberSwitch).toHaveAttribute("aria-checked", "false"); // BUSINESS fixture: uber_eats_enabled: false

    fireEvent.click(uberSwitch!);

    const saveButton = screen.getByRole("button", { name: "Save Changes" });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(businessesApi.updateOnboardingBusiness).toHaveBeenCalledWith(
        "biz-1",
        expect.objectContaining({ uber_eats_enabled: true })
      )
    );
  });
});
