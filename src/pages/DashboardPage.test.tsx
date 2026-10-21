import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "./DashboardPage";
import { businessesApi } from "@/api/businesses";
import { usageApi } from "@/api/usage";
import type { Business } from "@/types/business";
import type { UsageAlert } from "@/types/usage";

/**
 * This file exists specifically to prove a real bug found and fixed during
 * contract reconciliation (2026-10-20): GET /admin/usage-alerts can return
 * MULTIPLE rows for the SAME business in one billing period (80% and 90%
 * recorded as separate rows, confirmed by the backend's own integration
 * test) -- the original render used business_id as the React list key and
 * rendered every row, which collides and shows a business's own
 * now-superseded 80% alert alongside its 90% one. Fixed by deduping to the
 * highest threshold per business and keying on the alert's own id.
 */

vi.mock("@/api/businesses", () => ({
  businessesApi: { list: vi.fn() },
}));

vi.mock("@/api/usage", () => ({
  usageApi: { getAlerts: vi.fn() },
}));

const BUSINESSES: Business[] = [];

function alert(overrides: Partial<UsageAlert>): UsageAlert {
  return {
    id: "alert-1",
    business_id: "biz-1",
    business_name: "Mochachos Overport",
    billing_period_started_at: "2026-10-01T00:00:00Z",
    threshold_crossed: 80,
    orders_used: 800,
    orders_allowance: 1000,
    created_at: "2026-10-18T00:00:00Z",
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe("DashboardPage — Usage Alerts widget", () => {
  beforeEach(() => {
    vi.mocked(businessesApi.list).mockResolvedValue(BUSINESSES);
    vi.mocked(usageApi.getAlerts).mockReset();
  });

  it("collapses multiple alert rows for the same business to the highest threshold only", async () => {
    vi.mocked(usageApi.getAlerts).mockResolvedValue([
      alert({ id: "alert-80", threshold_crossed: 80, orders_used: 800 }),
      alert({ id: "alert-90", threshold_crossed: 90, orders_used: 900 }),
    ]);

    renderDashboard();

    await waitFor(() => expect(screen.getByText("Mochachos Overport")).toBeInTheDocument());

    // Exactly one row for this business, not two.
    expect(screen.getAllByText("Mochachos Overport")).toHaveLength(1);
    // The higher threshold (90%, not the superseded 80%) is what's shown.
    expect(screen.getByText("90% used (90%)")).toBeInTheDocument();
    expect(screen.queryByText("80% used (80%)")).not.toBeInTheDocument();
    // The badge count reflects deduped businesses (1), not raw rows (2).
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows each business that crossed a threshold as its own row", async () => {
    vi.mocked(usageApi.getAlerts).mockResolvedValue([
      alert({ id: "alert-a", business_id: "biz-a", business_name: "Restaurant A", threshold_crossed: 80 }),
      alert({ id: "alert-b", business_id: "biz-b", business_name: "Restaurant B", threshold_crossed: 100, orders_used: 1000 }),
    ]);

    renderDashboard();

    await waitFor(() => expect(screen.getByText("Restaurant A")).toBeInTheDocument());
    expect(screen.getByText("Restaurant B")).toBeInTheDocument();
    expect(screen.getByText("Exceeded (100%)")).toBeInTheDocument();
  });

  it("shows the empty state, not a fabricated alert, when nothing has crossed a threshold", async () => {
    vi.mocked(usageApi.getAlerts).mockResolvedValue([]);

    renderDashboard();

    await waitFor(() =>
      expect(screen.getByText(/No businesses have crossed a usage threshold/)).toBeInTheDocument()
    );
  });

  it("shows a distinct error state with Retry, not a crash, when the alerts call fails", async () => {
    vi.mocked(usageApi.getAlerts).mockRejectedValue(new Error("Network error"));

    renderDashboard();

    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
