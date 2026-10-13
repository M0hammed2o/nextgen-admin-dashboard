import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BusinessesPage from "./BusinessesPage";
import { businessesApi } from "@/api/businesses";
import type { Business } from "@/types/business";

// Fix #4: a failed businessesApi.list() call must render a distinct error
// state with a Retry button -- not the same "No businesses found" empty
// state a real admin would otherwise mistake for "this platform truly has
// zero tenants" (the pre-existing `.catch(() => {})` bug).
vi.mock("@/api/businesses", () => ({
  businessesApi: {
    list: vi.fn(),
  },
}));

describe("BusinessesPage error handling", () => {
  beforeEach(() => {
    vi.mocked(businessesApi.list).mockReset();
  });

  it("shows a distinct error state with Retry, not the empty state, when the API call fails", async () => {
    vi.mocked(businessesApi.list).mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <BusinessesPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());
    expect(screen.queryByText("No businesses found.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("Retry re-calls the API and can recover to a successful render", async () => {
    vi.mocked(businessesApi.list)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <BusinessesPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.getByText("No businesses found.")).toBeInTheDocument());
    expect(businessesApi.list).toHaveBeenCalledTimes(2);
  });
});

// Regression coverage for the "recently-onboarded business missing from the
// dashboard" bug: the search box used to filter ONLY the single
// already-fetched page client-side, so a business living on a later page
// (e.g. its row is old -- created while onboarding was still in progress --
// but newer businesses have since pushed it past page 1 of the default
// created_at-sorted, 20-per-page list) was invisible to search even though
// it exists. The fix queries the backend's `search` param instead. See
// KNOWN_BUGS.md and admin_api routes_businesses.py::list_businesses.
describe("BusinessesPage search", () => {
  const PAGE_1_BUSINESS: Business = {
    id: "b-recent",
    name: "Newly Created Diner",
    slug: "newly-created-diner",
    business_code: "NEW001",
    is_active: true,
    suspended_reason: null,
    timezone: "Africa/Johannesburg",
    plan: "STARTER",
    billing_status: "TRIAL",
    currency: "ZAR",
    whatsapp_phone_number_id: "",
    stripe_customer_id: "",
    stripe_subscription_id: "",
    daily_message_limit: 800,
    daily_llm_call_limit: 800,
    daily_order_limit: 100,
    trial_ends_at: null,
    monthly_order_quota: 1500,
    order_pack_credits: 0,
    monthly_orders_used: 0,
    monthly_orders_remaining: 1500,
    last_webhook_received_at: null,
    created_at: "2026-10-13T00:00:00Z",
    is_whatsapp_enabled: true,
    inventory_enabled: false,
    digital_receipts_enabled: false,
    delivery_platforms_enabled: false,
    uber_eats_enabled: false,
    mrd_enabled: false,
    delivery_reconciliation_enabled: false,
    advanced_analytics_enabled: false,
    loyalty_enabled: false,
    staff_live_orders_tab_enabled: false,
    staff_wastage_tab_enabled: false,
    staff_stocktake_tab_enabled: false,
    onboarded_by_admin_id: null,
    onboarding_completed_at: null,
  };

  // The actual business the owner is looking for -- its row is OLDER than
  // PAGE_1_BUSINESS's (onboarding took a while before finishing), so under
  // created_at-desc pagination it would NOT be on page 1 by default.
  const OLD_ROW_BUSINESS: Business = {
    ...PAGE_1_BUSINESS,
    id: "b-old-row-recently-onboarded",
    name: "Mama Thandi's Kitchen",
    slug: "mama-thandis-kitchen",
    business_code: "MTK042",
    created_at: "2026-08-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.mocked(businessesApi.list).mockReset();
  });

  it("queries the backend with the search term (not just filtering the current page) so a business on a later page is actually found", async () => {
    vi.mocked(businessesApi.list).mockImplementation((params) => {
      if (params?.search && params.search.toLowerCase().includes("thandi")) {
        return Promise.resolve([OLD_ROW_BUSINESS]);
      }
      return Promise.resolve([PAGE_1_BUSINESS]);
    });

    render(
      <MemoryRouter>
        <BusinessesPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Newly Created Diner")).toBeInTheDocument());
    expect(screen.queryByText("Mama Thandi's Kitchen")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search businesses…"), { target: { value: "thandi" } });

    // Debounced (300ms) -- the business the owner is looking for must appear
    // once the backend has actually been queried for it.
    await waitFor(() => expect(screen.getByText("Mama Thandi's Kitchen")).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.queryByText("Newly Created Diner")).not.toBeInTheDocument();

    const lastCall = vi.mocked(businessesApi.list).mock.calls.at(-1)?.[0];
    expect(lastCall?.search).toBe("thandi");
    expect(lastCall?.page).toBe(1);
  });

  it("does not report a real business as missing merely because it isn't on the current unfiltered page", async () => {
    // Regression for the specific pagination-disable bug: Next used to be
    // disabled based on the client-filtered (not raw fetched) page length,
    // so a zero-match page could look like "no more results exist".
    vi.mocked(businessesApi.list).mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({ ...PAGE_1_BUSINESS, id: `b-${i}`, name: `Biz ${i}`, slug: `biz-${i}` }))
    );

    render(
      <MemoryRouter>
        <BusinessesPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Biz 0")).toBeInTheDocument());

    // A full page of results (20 === default per_page) means more pages may
    // exist -- Next must be enabled, not disabled by a client-side filter
    // count that has nothing to do with whether more results exist on the
    // server.
    expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();
  });
});
