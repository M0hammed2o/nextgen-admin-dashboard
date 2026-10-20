import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleRoute } from "./RoleRoute";
import { useAuth } from "@/contexts/AuthContext";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));

/**
 * RoleRoute is the actual mechanism that keeps the new WhatsApp-only
 * subscription UI (pos_enabled toggle, the per-business usage/AI-cost
 * dashboard, the "Subscription" summary card) out of an ONBOARDER's reach --
 * all three live only on BusinessDetailsPage/EditBusinessModal/
 * CreateBusinessModal, which are mounted exclusively behind
 * `<RoleRoute roles={["SUPER_ADMIN"]}>` at /businesses and /businesses/:id in
 * App.tsx. Unlike the existing module-flag tests (ModuleTogglesFieldset.test.tsx),
 * which prove a *shared* component locks itself down per-role because that
 * component is also reachable by ONBOARDER-visible onboarding pages, the new
 * pos_enabled/usage UI isn't shared with any ONBOARDER-reachable code path at
 * all -- so the right thing to test is this route guard itself, which had no
 * direct test before this task even though every SUPER_ADMIN-only page in the
 * app depends on it.
 *
 * As RoleRoute's own doc comment says: this is a convenience, not the real
 * security boundary -- the server independently enforces every one of these
 * permissions (admin_api/app/core/deps.py). This test is the "doesn't leak
 * the UI to the wrong role" guarantee, not a claim about server-side
 * enforcement.
 */
describe("RoleRoute", () => {
  it("renders nothing (and never its children) for an ONBOARDER on a SUPER_ADMIN-only route", () => {
    vi.mocked(useAuth).mockReturnValue({
      me: { id: "a1", email: "sales@nextgen.co.za", display_name: "Sales Partner", role: "ONBOARDER", is_active: true },
      loading: false,
      error: "",
      isSuperAdmin: false,
      isOnboarder: true,
      refresh: vi.fn(),
    });

    render(
      <RoleRoute roles={["SUPER_ADMIN"]}>
        <div data-testid="pos-enabled-toggle">POS (In-Person Ordering)</div>
      </RoleRoute>
    );

    expect(screen.queryByTestId("pos-enabled-toggle")).not.toBeInTheDocument();
    expect(screen.queryByText(/POS \(In-Person Ordering\)/)).not.toBeInTheDocument();
    expect(screen.getByText("Not available for your role")).toBeInTheDocument();
  });

  it("renders children for a SUPER_ADMIN on the same route", () => {
    vi.mocked(useAuth).mockReturnValue({
      me: { id: "a2", email: "root@nextgen.co.za", display_name: "Root Admin", role: "SUPER_ADMIN", is_active: true },
      loading: false,
      error: "",
      isSuperAdmin: true,
      isOnboarder: false,
      refresh: vi.fn(),
    });

    render(
      <RoleRoute roles={["SUPER_ADMIN"]}>
        <div data-testid="pos-enabled-toggle">POS (In-Person Ordering)</div>
      </RoleRoute>
    );

    expect(screen.getByTestId("pos-enabled-toggle")).toBeInTheDocument();
  });

  it("renders nothing while the admin session is still loading (no flash of content for either role)", () => {
    vi.mocked(useAuth).mockReturnValue({
      me: null,
      loading: true,
      error: "",
      isSuperAdmin: false,
      isOnboarder: false,
      refresh: vi.fn(),
    });

    const { container } = render(
      <RoleRoute roles={["SUPER_ADMIN"]}>
        <div data-testid="pos-enabled-toggle">POS (In-Person Ordering)</div>
      </RoleRoute>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
