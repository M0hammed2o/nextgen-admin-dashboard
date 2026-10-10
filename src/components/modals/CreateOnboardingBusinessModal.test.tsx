import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateOnboardingBusinessModal } from "./CreateOnboardingBusinessModal";
import { businessesApi } from "@/api/businesses";

// jsdom doesn't implement ResizeObserver, which PlanSelect's underlying
// Radix Select primitive needs (@radix-ui/react-use-size) -- without this,
// rendering this modal open throws "ResizeObserver is not defined" before
// any assertion runs. Scoped to this file only, not a global test-setup
// change; a minimal stub is all `use-size` actually calls.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).ResizeObserver = ResizeObserverStub;

vi.mock("@/api/businesses", () => ({
  businessesApi: {
    createOnboardingBusiness: vi.fn(),
    updateOnboardingBusiness: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// A plain vi.fn() so each test can set the caller's role independently --
// same pattern as OnboardingWorkspacePage.test.tsx, covering the same
// 2026-10-10 fix (Part C1/C2) from this modal's own side.
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));

const ONBOARDER_AUTH = { me: { id: "a1", role: "ONBOARDER" }, isSuperAdmin: false, isOnboarder: true };
const SUPER_ADMIN_AUTH = { me: { id: "s1", role: "SUPER_ADMIN" }, isSuperAdmin: true, isOnboarder: false };

describe("CreateOnboardingBusinessModal — SUPER_ADMIN module access (Part C1/C2 fix)", () => {
  beforeEach(() => {
    vi.mocked(businessesApi.createOnboardingBusiness).mockReset().mockResolvedValue({ id: "new-biz-1" });
    vi.mocked(businessesApi.updateOnboardingBusiness).mockReset().mockResolvedValue({ id: "new-biz-1" });
    mockUseAuth.mockReturnValue(ONBOARDER_AUTH);
  });

  it("ONBOARDER sees delivery/Loyalty entitlements as locked, read-only rows (unchanged behaviour)", () => {
    render(<CreateOnboardingBusinessModal open onClose={() => {}} onSuccess={() => {}} />);
    expect(screen.getAllByText("Only a NextGen super admin can change this.").length).toBeGreaterThan(0);
    const loyaltyRow = screen.getByText("Loyalty").closest("div")!.parentElement!;
    expect(loyaltyRow.querySelector('[role="switch"]')).toBeNull();
  });

  it("SUPER_ADMIN sees delivery/Loyalty entitlements as real, editable Switches -- the confirmed bug, fixed", () => {
    mockUseAuth.mockReturnValue(SUPER_ADMIN_AUTH);
    render(<CreateOnboardingBusinessModal open onClose={() => {}} onSuccess={() => {}} />);
    expect(screen.queryByText("Only a NextGen super admin can change this.")).not.toBeInTheDocument();
    const loyaltyRow = screen.getByText("Loyalty").closest("div")!.parentElement!;
    // Tri-state Leave/On/Off, since there is genuinely no `current` value yet
    // at creation time -- per C2, this must NOT be locked just because the
    // business doesn't exist yet.
    expect(screen.getAllByText("On").length).toBeGreaterThan(0);
    expect(loyaltyRow.querySelector('[role="switch"]')).toBeNull();
  });

  it("SUPER_ADMIN turning Loyalty On at creation actually reaches the backend", async () => {
    mockUseAuth.mockReturnValue(SUPER_ADMIN_AUTH);
    render(<CreateOnboardingBusinessModal open onClose={() => {}} onSuccess={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText("My Business"), { target: { value: "Test Diner" } });

    const loyaltyRow = screen.getByText("Loyalty").closest("div")!.parentElement!;
    const onButton = Array.from(loyaltyRow.querySelectorAll("button")).find((b) => b.textContent === "On")!;
    fireEvent.click(onButton);

    fireEvent.click(screen.getByRole("button", { name: "Create Restaurant" }));

    await waitFor(() => expect(businessesApi.createOnboardingBusiness).toHaveBeenCalled());
    await waitFor(() =>
      expect(businessesApi.updateOnboardingBusiness).toHaveBeenCalledWith(
        "new-biz-1",
        expect.objectContaining({ loyalty_enabled: true })
      )
    );
  });

  it("ONBOARDER's module save never includes a locked entitlement key (nothing to click, nothing sent)", async () => {
    render(<CreateOnboardingBusinessModal open onClose={() => {}} onSuccess={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("My Business"), { target: { value: "Test Diner" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Restaurant" }));

    await waitFor(() => expect(businessesApi.createOnboardingBusiness).toHaveBeenCalled());
    // No module changes were ever possible to make, so the follow-up PATCH
    // for modules must never fire at all.
    expect(businessesApi.updateOnboardingBusiness).not.toHaveBeenCalled();
  });
});
