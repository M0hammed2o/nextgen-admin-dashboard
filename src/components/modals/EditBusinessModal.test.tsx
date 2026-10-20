import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditBusinessModal } from "./EditBusinessModal";
import { businessesApi } from "@/api/businesses";
import type { Business } from "@/types/business";

// jsdom doesn't implement ResizeObserver, which PlanSelect's underlying
// Radix Select primitive (and the Switch rows this modal also renders) need
// (@radix-ui/react-use-size) -- without this, rendering this modal open
// throws "ResizeObserver is not defined" before any assertion runs. Same
// scoped-to-this-file stub as CreateOnboardingBusinessModal.test.tsx uses,
// not a global test-setup change.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).ResizeObserver = ResizeObserverStub;

vi.mock("@/api/businesses", () => ({
  businessesApi: { update: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const BUSINESS: Business = {
  id: "biz-1",
  name: "Barn Owl Vause Road",
  slug: "barn-owl-vause-road",
  business_code: "BOW001",
  is_active: true,
  suspended_reason: null,
  timezone: "Africa/Johannesburg",
  plan: "STARTER",
  billing_status: "ACTIVE",
  currency: "ZAR",
  whatsapp_phone_number_id: "123456",
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
  created_at: "2026-01-01T00:00:00Z",
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
  pos_enabled: true,
};

/**
 * pos_enabled (WhatsApp-only subscription support, this task) is
 * deliberately kept OUTSIDE ModuleTogglesFieldset/MODULE_FLAGS -- see
 * types/business.ts's comment -- so it needs its own direct coverage here
 * rather than relying on ModuleTogglesFieldset.test.tsx's existing
 * SUPER_ADMIN-only-gating tests, which exercise a different component.
 * The actual role enforcement for who can even open this modal is
 * RoleRoute (see routes/RoleRoute.test.tsx) -- these tests are about this
 * modal correctly reading/writing the field once rendered.
 */
describe("EditBusinessModal pos_enabled toggle", () => {
  beforeEach(() => {
    vi.mocked(businessesApi.update).mockReset();
  });

  it("defaults the switch to the business's current pos_enabled value (on)", () => {
    render(<EditBusinessModal open business={BUSINESS} onClose={() => {}} onSuccess={() => {}} />);
    expect(screen.getByRole("switch", { name: "POS (In-Person Ordering)" })).toBeChecked();
  });

  it("defaults to off when the business's current pos_enabled is false", () => {
    render(
      <EditBusinessModal open business={{ ...BUSINESS, pos_enabled: false }} onClose={() => {}} onSuccess={() => {}} />
    );
    expect(screen.getByRole("switch", { name: "POS (In-Person Ordering)" })).not.toBeChecked();
  });

  it("sends pos_enabled: false in the PATCH when the admin turns it off and saves", async () => {
    vi.mocked(businessesApi.update).mockResolvedValue({ ...BUSINESS, pos_enabled: false });

    render(<EditBusinessModal open business={BUSINESS} onClose={() => {}} onSuccess={() => {}} />);

    fireEvent.click(screen.getByRole("switch", { name: "POS (In-Person Ordering)" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(businessesApi.update).toHaveBeenCalled());
    const [, payload] = vi.mocked(businessesApi.update).mock.calls[0];
    expect(payload.pos_enabled).toBe(false);
  });

  it("sends the unchanged pos_enabled value (true) when the admin saves without touching the switch", async () => {
    vi.mocked(businessesApi.update).mockResolvedValue(BUSINESS);

    render(<EditBusinessModal open business={BUSINESS} onClose={() => {}} onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(businessesApi.update).toHaveBeenCalled());
    const [, payload] = vi.mocked(businessesApi.update).mock.calls[0];
    expect(payload.pos_enabled).toBe(true);
  });
});
