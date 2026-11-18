import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { EventVendorsTab } from "./EventVendorsTab";
import { eventsApi } from "@/api/events";
import { apiError, eventFixture, renderWithProviders, vendorFixture } from "@/test/eventFixtures";

vi.mock("@/api/events", () => ({
  eventsApi: {
    listVendors: vi.fn(), setStall: vi.fn(), markPaid: vi.fn(), voidSubscription: vi.fn(),
    suspendVendor: vi.fn(), reinstateVendor: vi.fn(), cancelVendor: vi.fn(), quoteSubscription: vi.fn(),
    bulkOnboard: vi.fn(), bulkOnboardCsv: vi.fn(),
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const list = vi.mocked(eventsApi.listVendors);

describe("EventVendorsTab", () => {
  beforeEach(() => {
    Object.values(eventsApi).forEach((f) => vi.mocked(f).mockReset());
    list.mockResolvedValue({ items: [vendorFixture], total: 60 });
  });

  it("sends limit/offset on load and paginates server-side", async () => {
    renderWithProviders(<EventVendorsTab event={eventFixture} />);
    expect(await screen.findByText("Tasty Bites")).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith("ev-1", { status: undefined, category: undefined, q: undefined, limit: 25, offset: 0 });
    expect(screen.getByText(/1–25 of 60/)).toBeInTheDocument();
    expect(screen.getByText("TRADE")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith("ev-1", expect.objectContaining({ offset: 25, limit: 25 })));
    expect(await screen.findByText(/26–50 of 60/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith("ev-1", expect.objectContaining({ offset: 50 })));
    expect(await screen.findByText(/51–60 of 60/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("sends the debounced search term and filters, and resets to the first page", async () => {
    renderWithProviders(<EventVendorsTab event={eventFixture} />);
    await screen.findByText("Tasty Bites");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith("ev-1", expect.objectContaining({ offset: 25 })));

    fireEvent.change(screen.getByLabelText("Search vendors"), { target: { value: "tasty" } });
    await waitFor(() => expect(list).toHaveBeenLastCalledWith("ev-1", expect.objectContaining({ q: "tasty", offset: 0 })));

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "ACTIVE" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "CLOTHING" } });
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith("ev-1", { status: "ACTIVE", category: "CLOTHING", q: "tasty", limit: 25, offset: 0 }),
    );
  });

  it("shows an error with Retry and an empty state", async () => {
    list.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({ items: [], total: 0 });
    renderWithProviders(<EventVendorsTab event={eventFixture} />);
    expect(await screen.findByText("boom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No vendors yet.")).toBeInTheDocument();
  });

  async function openPayDialog() {
    renderWithProviders(<EventVendorsTab event={eventFixture} />);
    await screen.findByText("Tasty Bites");
    fireEvent.click(screen.getByRole("button", { name: "Manage Tasty Bites" }));
    // amount shown comes from the API (R 200.00), not computed in the UI
    expect(screen.getByText("R 200.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark paid" }));
  }

  it("mark paid: PAYMENT_REFERENCE_USED is shown inline and the dialog stays open", async () => {
    vi.mocked(eventsApi.markPaid).mockRejectedValue(apiError("dup", "PAYMENT_REFERENCE_USED"));
    await openPayDialog();
    fireEvent.change(screen.getByLabelText("Payment reference"), { target: { value: "EFT-1" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Mark paid" }).pop()!);
    expect(await screen.findByText(/payment reference has already been used/)).toBeInTheDocument();
    expect(eventsApi.markPaid).toHaveBeenCalledWith("ev-1", "s-1", "EFT-1");
    expect(screen.getByLabelText("Payment reference")).toBeInTheDocument();
  });

  it("mark paid: QUOTE_STALE tells the admin to void and re-quote", async () => {
    vi.mocked(eventsApi.markPaid).mockRejectedValue(apiError("stale", "QUOTE_STALE"));
    await openPayDialog();
    fireEvent.change(screen.getByLabelText("Payment reference"), { target: { value: "EFT-2" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Mark paid" }).pop()!);
    expect(await screen.findByText(/Void it and quote it again/)).toBeInTheDocument();
  });

  it("mark paid requires a reference and closes on success", async () => {
    vi.mocked(eventsApi.markPaid).mockResolvedValue({ id: "s-1", status: "PAID" });
    await openPayDialog();
    fireEvent.click(screen.getAllByRole("button", { name: "Mark paid" }).pop()!);
    expect(await screen.findByText("A payment reference is required")).toBeInTheDocument();
    expect(eventsApi.markPaid).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Payment reference"), { target: { value: "EFT-3" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Mark paid" }).pop()!);
    await waitFor(() => expect(screen.queryByLabelText("Payment reference")).not.toBeInTheDocument());
  });

  it("suspend sends the reason; reinstate is offered for a suspended vendor and calls the API", async () => {
    vi.mocked(eventsApi.suspendVendor).mockResolvedValue({});
    renderWithProviders(<EventVendorsTab event={eventFixture} />);
    await screen.findByText("Tasty Bites");
    fireEvent.click(screen.getByRole("button", { name: "Manage Tasty Bites" }));
    fireEvent.click(screen.getByRole("button", { name: "Suspend" }));
    fireEvent.click(screen.getByRole("button", { name: "Suspend vendor" }));
    expect(await screen.findByText("A reason is required")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "unpaid stall fee" } });
    fireEvent.click(screen.getByRole("button", { name: "Suspend vendor" }));
    await waitFor(() => expect(eventsApi.suspendVendor).toHaveBeenCalledWith("ev-1", "v-1", "unpaid stall fee"));
  });

  it("reinstate calls the API for a suspended vendor", async () => {
    list.mockResolvedValue({
      items: [{ ...vendorFixture, business_active: false, suspended_reason: "unpaid", access_level: "NONE" }],
      total: 1,
    });
    vi.mocked(eventsApi.reinstateVendor).mockResolvedValue({});
    renderWithProviders(<EventVendorsTab event={eventFixture} />);
    await screen.findByText("Tasty Bites");
    expect(screen.getByText("Business inactive")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Manage Tasty Bites" }));
    expect(screen.getByText(/Suspended: unpaid/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reinstate" }));
    await waitFor(() => expect(eventsApi.reinstateVendor).toHaveBeenCalledWith("ev-1", "v-1"));
  });

  it("stall allocation: STALL_TAKEN is shown inline", async () => {
    vi.mocked(eventsApi.setStall).mockRejectedValue(apiError("taken", "STALL_TAKEN"));
    renderWithProviders(<EventVendorsTab event={eventFixture} />);
    await screen.findByText("Tasty Bites");
    fireEvent.change(screen.getByLabelText("Stall for Tasty Bites"), { target: { value: "B7" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/already allocated/)).toBeInTheDocument();
    expect(eventsApi.setStall).toHaveBeenCalledWith("ev-1", "v-1", "B7");
  });

  it("cancel vendor asks for confirmation before calling the API", async () => {
    vi.mocked(eventsApi.cancelVendor).mockResolvedValue({});
    renderWithProviders(<EventVendorsTab event={eventFixture} />);
    await screen.findByText("Tasty Bites");
    fireEvent.click(screen.getByRole("button", { name: "Manage Tasty Bites" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel vendor" }));
    expect(eventsApi.cancelVendor).not.toHaveBeenCalled();
    expect(screen.getByText(/ends their access/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel vendor" }).pop()!);
    await waitFor(() => expect(eventsApi.cancelVendor).toHaveBeenCalledWith("ev-1", "v-1"));
  });
});
