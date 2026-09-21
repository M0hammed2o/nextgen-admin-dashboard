import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateOwnerModal } from "./CreateOwnerModal";
import { businessesApi } from "@/api/businesses";

// One-time secrets (temporary passwords) must never be shown a second time
// once the dialog that revealed them is dismissed -- the same class of
// mistake this whole feature is built to avoid repeating (see the task
// brief's "never store it in state longer than the dialog" requirement).
vi.mock("@/api/businesses", () => ({
  businessesApi: { createOwner: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("CreateOwnerModal one-time password reveal", () => {
  beforeEach(() => {
    vi.mocked(businessesApi.createOwner).mockReset();
  });

  it("shows the temporary password once after creation, then never again after Done is clicked", async () => {
    vi.mocked(businessesApi.createOwner).mockResolvedValue({
      id: "u1", email: "owner@example.com", staff_name: "Owner", role: "OWNER",
      business_id: "biz-1", is_active: true, created_at: "2026-01-01T00:00:00Z",
      temporary_password: "Sup3rSecret!",
    });

    const onClose = vi.fn();
    const { rerender } = render(
      <CreateOwnerModal open businessId="biz-1" onClose={onClose} />
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "owner@example.com" } });
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Owner Name" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.getByText("Sup3rSecret!")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalled();

    // Re-open the SAME dialog instance (as the parent would, by flipping
    // `open` back to true) -- the secret must be gone, not resurrected from
    // stale component state.
    rerender(<CreateOwnerModal open={false} businessId="biz-1" onClose={onClose} />);
    rerender(<CreateOwnerModal open businessId="biz-1" onClose={onClose} />);

    expect(screen.queryByText("Sup3rSecret!")).not.toBeInTheDocument();
    expect(screen.getByText("Create Owner / Manager")).toBeInTheDocument();
  });

  it("onboardingAccount mode hides Role/Full Name and forces the reserved staff name server-side", async () => {
    vi.mocked(businessesApi.createOwner).mockResolvedValue({
      id: "u2", email: "partner-temp@example.com", staff_name: "NextGen Onboarding", role: "MANAGER",
      business_id: "biz-1", is_active: true, created_at: "2026-01-01T00:00:00Z",
      temporary_password: "OnboardPass1!",
    });

    render(<CreateOwnerModal open businessId="biz-1" onClose={vi.fn()} onboardingAccount />);

    expect(screen.queryByLabelText("Full Name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Role")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "partner-temp@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(businessesApi.createOwner).toHaveBeenCalledWith("biz-1", {
        email: "partner-temp@example.com",
        full_name: "NextGen Onboarding",
        role: "MANAGER",
        is_onboarding_account: true,
      })
    );
  });
});
