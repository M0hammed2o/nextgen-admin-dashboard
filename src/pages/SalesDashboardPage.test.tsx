import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SalesDashboardPage from "./SalesDashboardPage";
import { commercialApi } from "@/api/commercial";
import type { CommercialDashboardResponse } from "@/types/commercial";

vi.mock("@/api/commercial", () => ({
  commercialApi: { getDashboard: vi.fn() },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isSuperAdmin: false, isOnboarder: true }),
}));

const EMPTY_DASHBOARD: CommercialDashboardResponse = {
  counts: { trial: 0, active: 0, payment_due: 0, overdue: 0, expired: 0, suspended: 0 },
  trials_ending_soon: [], payments_awaiting_confirmation: [], overdue_clients: [],
  recently_created_trials: [], recently_converted: [], expired_trials: [],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <SalesDashboardPage />
    </MemoryRouter>
  );
}

describe("SalesDashboardPage", () => {
  beforeEach(() => {
    vi.mocked(commercialApi.getDashboard).mockReset();
  });

  it("shows instructive empty-state copy in every panel when there's nothing to act on", async () => {
    vi.mocked(commercialApi.getDashboard).mockResolvedValue(EMPTY_DASHBOARD);
    renderPage();
    await waitFor(() => expect(screen.getByText("Trials Ending Soon")).toBeInTheDocument());
    expect(screen.getByText(/No trials ending soon/)).toBeInTheDocument();
    expect(screen.getByText(/No unpaid issued invoices/)).toBeInTheDocument();
    expect(screen.getByText(/No overdue clients/)).toBeInTheDocument();
    expect(screen.getByText(/No conversions in the last 30 days/)).toBeInTheDocument();
    expect(screen.getByText(/visit a restaurant and start one/)).toBeInTheDocument();
    // Expired trials panel only renders when non-empty.
    expect(screen.queryByText("Expired Trials")).not.toBeInTheDocument();
  });

  it("shows a distinct error state with Retry, not the empty state, on failure", async () => {
    vi.mocked(commercialApi.getDashboard).mockRejectedValueOnce(new Error("Network down"));
    renderPage();
    await waitFor(() => expect(screen.getByText("Network down")).toBeInTheDocument());
    expect(screen.queryByText("Trials Ending Soon")).not.toBeInTheDocument();

    vi.mocked(commercialApi.getDashboard).mockResolvedValueOnce(EMPTY_DASHBOARD);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("Trials Ending Soon")).toBeInTheDocument());
  });

  it("renders a count tile per account status from the dashboard's counts dict", async () => {
    vi.mocked(commercialApi.getDashboard).mockResolvedValue({
      ...EMPTY_DASHBOARD,
      counts: { trial: 3, active: 5, payment_due: 1, overdue: 2, expired: 0, suspended: 0 },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Trial")).toBeInTheDocument());
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
