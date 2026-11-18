import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { EventDetail, EventVendorItem } from "@/types/events";

export function renderWithProviders(ui: ReactElement, route = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

export function apiError(message: string, code: string, extra: Record<string, unknown> = {}) {
  return Object.assign(new Error(message), { code, status: 409, ...extra });
}

export const eventFixture: EventDetail = {
  id: "ev-1",
  name: "Night Souk",
  slug: "night-souk",
  status: "OPEN",
  venue: "City Hall",
  timezone: "Africa/Johannesburg",
  food_day_rate_cents: 10000,
  clothing_day_rate_cents: 5000,
  days: [
    { day: "2026-12-01", is_billable: true },
    { day: "2026-12-02", is_billable: true },
  ],
  billable_day_count: 2,
  vendor_counts: { ACTIVE: 1 },
  active_vendors: 1,
  revenue_paid_cents: 190000,
  revenue_outstanding_cents: 20000,
  prep_days: 14,
};

export const vendorFixture: EventVendorItem = {
  vendor_id: "v-1",
  business_id: "b-1",
  business_name: "Tasty Bites",
  business_code: "TB123",
  business_active: true,
  suspended_reason: null,
  category: "FOOD",
  stall_code: "A1",
  status: "ACTIVE",
  access_level: "TRADE",
  subscriptions: [
    { id: "s-1", starts_on: "2026-12-01", ends_on: "2026-12-02", billable_days: 2, amount_cents: 20000, status: "UNPAID", paid_at: null },
  ],
};
