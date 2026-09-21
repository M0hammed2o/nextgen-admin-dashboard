import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SalesClientPage from "./SalesClientPage";
import { commercialApi } from "@/api/commercial";
import { businessesApi } from "@/api/businesses";
import type { ClientRow, CommercialInvoice } from "@/types/commercial";

vi.mock("@/api/commercial", () => ({
  commercialApi: {
    getClient: vi.fn(),
    listInvoices: vi.fn(),
    getPriceCatalogue: vi.fn(),
    downloadInvoicePdf: vi.fn(),
    markSent: vi.fn(),
  },
}));

vi.mock("@/api/businesses", () => ({
  businessesApi: {
    getOnboardingStatus: vi.fn(),
    getOnboarding: vi.fn(),
    startTrial: vi.fn(),
    extendTrial: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let mockRole: { isSuperAdmin: boolean; isOnboarder: boolean } = { isSuperAdmin: false, isOnboarder: true };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockRole,
}));

const CLIENT: ClientRow = {
  business_id: "biz-1", business_name: "Barn Owl", account_status: "TRIAL", plan: "STARTER",
  trial_ends_at: "2026-10-01T00:00:00Z", days_remaining: 10, outstanding_cents: 0, onboarded_by: null,
};

const DRAFT_INVOICE: CommercialInvoice = {
  id: "inv-draft", business_id: "biz-1", invoice_number: null, status: "DRAFT",
  invoice_date: null, due_date: null, currency: "ZAR", subtotal_cents: 50000, vat_cents: 7500,
  vat_rate_basis_points: 1500, total_cents: 57500, payment_method: null, paid_at: null,
  payment_reference: null, internal_note: null, payment_note: null, issued_at: null, sent_at: null,
  cancelled_at: null, cancelled_reason: null, created_at: "2026-09-01T00:00:00Z", lines: [],
};

const ISSUED_INVOICE: CommercialInvoice = {
  ...DRAFT_INVOICE,
  id: "inv-issued", invoice_number: "NG-INV-2026-00001", status: "AWAITING_PAYMENT",
  invoice_date: "2026-09-01", due_date: "2026-09-15", issued_at: "2026-09-01T00:00:00Z",
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/sales/clients/biz-1"]}>
      <Routes>
        <Route path="/sales/clients/:id" element={<SalesClientPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function notFoundError() {
  const err = new Error("Business not found: biz-1") as Error & { code?: string };
  err.code = "BUSINESS_NOT_FOUND";
  return err;
}

describe("SalesClientPage invoice actions", () => {
  beforeEach(() => {
    vi.mocked(commercialApi.getClient).mockReset().mockResolvedValue(CLIENT);
    vi.mocked(commercialApi.listInvoices).mockReset().mockResolvedValue([DRAFT_INVOICE, ISSUED_INVOICE]);
    vi.mocked(commercialApi.getPriceCatalogue).mockReset().mockResolvedValue([]);
    vi.mocked(businessesApi.getOnboardingStatus).mockReset().mockRejectedValue(notFoundError());
    vi.mocked(businessesApi.getOnboarding).mockReset().mockRejectedValue(notFoundError());
  });

  it("shows Edit only for the DRAFT invoice, never for the issued one", async () => {
    mockRole = { isSuperAdmin: false, isOnboarder: true };
    renderPage();
    await waitFor(() => expect(screen.getByText("Barn Owl")).toBeInTheDocument());

    const draftRow = screen.getByText("(draft)").closest("tr")!;
    expect(within(draftRow).getByRole("button", { name: "Edit" })).toBeInTheDocument();

    const issuedRow = screen.getByText("NG-INV-2026-00001").closest("tr")!;
    expect(within(issuedRow).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("hides the Cancel action on an issued invoice for ONBOARDER, but shows it for SUPER_ADMIN", async () => {
    mockRole = { isSuperAdmin: false, isOnboarder: true };
    const { unmount } = renderPage();
    await waitFor(() => expect(screen.getByText("Barn Owl")).toBeInTheDocument());
    const issuedRowOnboarder = screen.getByText("NG-INV-2026-00001").closest("tr")!;
    expect(within(issuedRowOnboarder).queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    // Draft can still be cancelled by anyone.
    const draftRowOnboarder = screen.getByText("(draft)").closest("tr")!;
    expect(within(draftRowOnboarder).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    unmount();

    mockRole = { isSuperAdmin: true, isOnboarder: false };
    renderPage();
    await waitFor(() => expect(screen.getByText("Barn Owl")).toBeInTheDocument());
    const issuedRowSuperAdmin = screen.getByText("NG-INV-2026-00001").closest("tr")!;
    expect(within(issuedRowSuperAdmin).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
});
