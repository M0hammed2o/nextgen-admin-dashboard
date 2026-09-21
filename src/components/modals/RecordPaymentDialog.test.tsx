import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { commercialApi } from "@/api/commercial";
import type { CommercialInvoice } from "@/types/commercial";
import { toast } from "sonner";

vi.mock("@/api/commercial", () => ({
  commercialApi: { markPaid: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const INVOICE: CommercialInvoice = {
  id: "inv-1", business_id: "biz-1", invoice_number: "NG-INV-2026-00001", status: "AWAITING_PAYMENT",
  invoice_date: "2026-09-01", due_date: "2026-09-15", currency: "ZAR",
  subtotal_cents: 100000, vat_cents: 15000, vat_rate_basis_points: 1500, total_cents: 115000,
  payment_method: null, paid_at: null, payment_reference: null, internal_note: null, payment_note: null,
  issued_at: "2026-09-01T00:00:00Z", sent_at: null, cancelled_at: null, cancelled_reason: null,
  created_at: "2026-09-01T00:00:00Z", lines: [],
};

describe("RecordPaymentDialog", () => {
  beforeEach(() => {
    vi.mocked(commercialApi.markPaid).mockReset();
    vi.mocked(toast.error).mockClear();
  });

  it("requires a reference for an EFT payment", async () => {
    render(<RecordPaymentDialog open onClose={() => {}} invoice={INVOICE} onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Record Payment" }));
    await waitFor(() => expect(screen.getByText("A payment reference is required for an EFT payment")).toBeInTheDocument());
    expect(commercialApi.markPaid).not.toHaveBeenCalled();
  });

  it("does NOT require a reference for a Cash payment", async () => {
    vi.mocked(commercialApi.markPaid).mockResolvedValue({ ...INVOICE, status: "PAID" });
    render(<RecordPaymentDialog open onClose={() => {}} invoice={INVOICE} onSuccess={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Method/), { target: { value: "CASH" } });
    fireEvent.click(screen.getByRole("button", { name: "Record Payment" }));
    await waitFor(() => expect(commercialApi.markPaid).toHaveBeenCalledTimes(1));
    const call = vi.mocked(commercialApi.markPaid).mock.calls[0][1];
    expect(call.payment_method).toBe("CASH");
    expect(call.reference).toBeUndefined();
  });
});
