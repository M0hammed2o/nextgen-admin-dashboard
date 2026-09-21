import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminUsersPage from "./AdminUsersPage";
import { adminUsersApi } from "@/api/adminUsers";
import { toast } from "sonner";

// admin_api/app/api/v1/routes_admin_users.py returns CANNOT_MODIFY_SELF
// (403) and LAST_SUPER_ADMIN (409) as plain, already-readable AppError
// messages -- this page must surface them to the admin, not swallow them
// or show a generic "failed" message that loses the actual reason.
vi.mock("@/api/adminUsers", () => ({
  adminUsersApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), resetPassword: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ me: { id: "self-1", email: "me@nextgen.co.za", display_name: "Me", role: "SUPER_ADMIN", is_active: true } }),
}));

const USERS = [
  {
    id: "self-1", email: "me@nextgen.co.za", display_name: "Me", role: "SUPER_ADMIN" as const,
    is_active: true, last_login_at: null, created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "other-1", email: "other@nextgen.co.za", display_name: "Other Super", role: "SUPER_ADMIN" as const,
    is_active: true, last_login_at: null, created_at: "2026-01-01T00:00:00Z",
  },
];

describe("AdminUsersPage error mapping", () => {
  beforeEach(() => {
    vi.mocked(adminUsersApi.list).mockReset().mockResolvedValue(USERS);
    vi.mocked(adminUsersApi.update).mockReset();
    vi.mocked(toast.error).mockClear();
  });

  it("surfaces LAST_SUPER_ADMIN's backend message verbatim via toast, not a generic failure", async () => {
    vi.mocked(adminUsersApi.update).mockRejectedValue(
      new Error("Cannot deactivate or demote the last active SUPER_ADMIN")
    );

    render(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText("Other Super")).toBeInTheDocument());

    const row = screen.getByText("Other Super").closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Deactivate" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Cannot deactivate or demote the last active SUPER_ADMIN")
    );
  });

  it("disables role-change and deactivate controls for the signed-in admin's own row (self-protection)", async () => {
    render(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText("Me")).toBeInTheDocument());

    const selfRow = screen.getByText("Me").closest("tr")!;
    expect(within(selfRow).getByRole("combobox")).toBeDisabled();
    // Own row has no Deactivate button at all once disabled -- still present but disabled.
    const selfDeactivate = within(selfRow).queryByRole("button", { name: "Deactivate" });
    if (selfDeactivate) expect(selfDeactivate).toBeDisabled();
  });
});
