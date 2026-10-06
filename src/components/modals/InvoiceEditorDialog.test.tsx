import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { InvoiceEditorDialog } from "./InvoiceEditorDialog";
import type { CommercialInvoice, PriceCatalogueEntry } from "@/types/commercial";

vi.mock("@/api/commercial", () => ({
  commercialApi: { createInvoice: vi.fn(), issueInvoice: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CATALOGUE: PriceCatalogueEntry[] = [
  { plan: "STARTER", monthly_amount_cents: 120000, monthly_amount_display: "R1200.00" },
  { plan: "GROWTH", monthly_amount_cents: 120000, monthly_amount_display: "R1200.00" },
];

const DRAFT: CommercialInvoice = {
  id: "inv-1", business_id: "biz-1", invoice_number: null, status: "DRAFT",
  invoice_date: "2026-10-01", due_date: "2026-10-08", currency: "ZAR",
  subtotal_cents: 50000, vat_cents: 0, vat_rate_basis_points: 0, total_cents: 50000,
  payment_method: null, paid_at: null, payment_reference: null,
  internal_note: "existing note", payment_note: null,
  issued_at: null, sent_at: null, cancelled_at: null, cancelled_reason: null,
  created_at: "2026-10-01T00:00:00Z",
  lines: [
    {
      id: "line-1", kind: "SETUP", description: "Existing setup line",
      quantity: 1, unit_amount_cents: 50000, line_total_cents: 50000,
    },
  ],
} as unknown as CommercialInvoice;

function renderEditor(props: Partial<React.ComponentProps<typeof InvoiceEditorDialog>> = {}) {
  const defaults = {
    open: true,
    onClose: vi.fn(),
    businessId: "biz-1",
    businessPlan: "STARTER",
    priceCatalogue: CATALOGUE,
    existingInvoice: null,
    onSaved: vi.fn(),
  };
  return render(<InvoiceEditorDialog {...defaults} {...props} />);
}

const descriptions = () =>
  screen.queryAllByLabelText("Line description") as HTMLInputElement[];

describe("InvoiceEditorDialog — BUG-0118 catalogue prefill race", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prefills a subscription line when the catalogue is already loaded", () => {
    renderEditor();
    const lines = descriptions();
    expect(lines).toHaveLength(1);
    expect(lines[0].value).toContain("STARTER plan");
  });

  it("BUG-0118: prefills LATER when the catalogue arrives after the editor opened", async () => {
    // The actual defect. SalesClientPage fetches the catalogue on mount, so an
    // editor opened before that resolves starts with an EMPTY array.
    const { rerender } = renderEditor({ priceCatalogue: [] });
    expect(descriptions()).toHaveLength(0);

    // ...the fetch lands.
    rerender(
      <InvoiceEditorDialog
        open
        onClose={vi.fn()}
        businessId="biz-1"
        businessPlan="STARTER"
        priceCatalogue={CATALOGUE}
        existingInvoice={null}
        onSaved={vi.fn()}
      />
    );

    await waitFor(() => expect(descriptions()).toHaveLength(1));
    expect(descriptions()[0].value).toContain("STARTER plan");
  });

  it("does NOT clobber lines the user already typed when the catalogue arrives late", async () => {
    // The hazard introduced by a naive fix. If the late prefill simply ran,
    // it would overwrite work already done -- worse than the original bug.
    const { rerender } = renderEditor({ priceCatalogue: [] });
    expect(descriptions()).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /^Setup$/ }));
    const typed = descriptions();
    expect(typed).toHaveLength(1);
    fireEvent.change(typed[0], { target: { value: "Hand-typed line" } });

    rerender(
      <InvoiceEditorDialog
        open
        onClose={vi.fn()}
        businessId="biz-1"
        businessPlan="STARTER"
        priceCatalogue={CATALOGUE}
        existingInvoice={null}
        onSaved={vi.fn()}
      />
    );

    await waitFor(() => expect(descriptions()).toHaveLength(1));
    expect(descriptions()[0].value).toBe("Hand-typed line");
  });

  it("does not prefill over an existing draft's own lines", () => {
    renderEditor({ existingInvoice: DRAFT });
    const lines = descriptions();
    expect(lines).toHaveLength(1);
    expect(lines[0].value).toBe("Existing setup line");
  });

  it("resets to a fresh prefill when reopened for a NEW invoice", async () => {
    // The regression the split-effect design exists to prevent: guarding the
    // prefill on "lines are empty" alone would leave the PREVIOUS invoice's
    // lines on screen when the editor is reopened.
    const { rerender } = renderEditor({ existingInvoice: DRAFT });
    expect(descriptions()[0].value).toBe("Existing setup line");

    const close = (
      <InvoiceEditorDialog
        open={false}
        onClose={vi.fn()}
        businessId="biz-1"
        businessPlan="STARTER"
        priceCatalogue={CATALOGUE}
        existingInvoice={null}
        onSaved={vi.fn()}
      />
    );
    rerender(close);

    rerender(
      <InvoiceEditorDialog
        open
        onClose={vi.fn()}
        businessId="biz-1"
        businessPlan="STARTER"
        priceCatalogue={CATALOGUE}
        existingInvoice={null}
        onSaved={vi.fn()}
      />
    );

    await waitFor(() => expect(descriptions()).toHaveLength(1));
    expect(descriptions()[0].value).toContain("STARTER plan");
    expect(descriptions()[0].value).not.toBe("Existing setup line");
  });

  it("leaves the editor empty, not broken, when the plan has no catalogue price", () => {
    renderEditor({ businessPlan: "ENTERPRISE" });
    expect(descriptions()).toHaveLength(0);
    // And the user can still build the invoice by hand.
    expect(screen.getByRole("button", { name: /^Setup$/ })).toBeInTheDocument();
  });
});
