import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BulkOnboardDialog } from "./BulkOnboardDialog";
import { eventsApi } from "@/api/events";
import { apiError } from "@/test/eventFixtures";

vi.mock("@/api/events", () => ({ eventsApi: { bulkOnboard: vi.fn(), bulkOnboardCsv: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CSV = "category,business_name,owner_email\nFOOD,Tasty Bites,a@example.com\nFOOD,Dup,a@example.com";

function mount() {
  const onClose = vi.fn();
  const onImported = vi.fn();
  const utils = render(<BulkOnboardDialog eventId="ev-1" open onClose={onClose} onImported={onImported} />);
  return { ...utils, onClose, onImported };
}

describe("BulkOnboardDialog", () => {
  beforeEach(() => {
    vi.mocked(eventsApi.bulkOnboard).mockReset();
    vi.mocked(eventsApi.bulkOnboardCsv).mockReset();
  });

  it("dry-run first: shows per-row errors, then preview, then confirm, then one-time passwords that are cleared on close", async () => {
    vi.mocked(eventsApi.bulkOnboardCsv)
      .mockRejectedValueOnce(
        apiError("no vendors were created", "BULK_VALIDATION_FAILED", {
          status: 422,
          details: { rows: [{ row: 2, errors: ["owner_email appears more than once in this import"] }] },
        }),
      )
      .mockResolvedValueOnce({ dry_run: true, vendors: [{ category: "FOOD", stall_code: null, amount_cents: 20000, billable_days: 2 }] })
      .mockResolvedValueOnce({
        dry_run: false,
        vendors: [{
          category: "FOOD", stall_code: null, amount_cents: 20000, billable_days: 2, vendor_id: "v-1", business_id: "b-1",
          business_code: "TB123", owner_email: "a@example.com", owner_temporary_password: "S3cret-Pass-1",
        }],
      });

    const { onClose, onImported, unmount } = mount();

    // Nothing is imported without a prior check: the only action offered is the dry run.
    expect(screen.queryByRole("button", { name: /Confirm and create/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("CSV"), { target: { value: CSV } });
    fireEvent.click(screen.getByRole("button", { name: "Run check (dry run)" }));

    // 1) row errors from details.rows are displayed
    expect(await screen.findByText("owner_email appears more than once in this import")).toBeInTheDocument();
    expect(eventsApi.bulkOnboardCsv).toHaveBeenLastCalledWith("ev-1", CSV, true);
    expect(screen.queryByRole("button", { name: /Confirm and create/ })).not.toBeInTheDocument();

    // 2) fix and re-check -> preview with the server quote
    fireEvent.change(screen.getByLabelText("CSV"), { target: { value: "category,business_name,owner_email\nFOOD,Tasty Bites,a@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Run check (dry run)" }));
    expect(await screen.findByText(/Check passed: 1 vendor ready/)).toBeInTheDocument();
    expect(screen.getByText(/R 200\.00 \(2 days\)/)).toBeInTheDocument();
    expect(eventsApi.bulkOnboardCsv).toHaveBeenCalledTimes(2);

    // 3) confirm -> real import, passwords shown once
    fireEvent.click(screen.getByRole("button", { name: "Confirm and create 1 vendors" }));
    expect(await screen.findByText("S3cret-Pass-1")).toBeInTheDocument();
    expect(screen.getByText(/Shown once/)).toBeInTheDocument();
    expect(eventsApi.bulkOnboardCsv).toHaveBeenLastCalledWith("ev-1", expect.any(String), false);
    expect(onImported).toHaveBeenCalledTimes(1);
    expect(onImported.mock.calls[0]).toEqual([]); // passwords never leave the dialog

    // 4) closing clears them, and they are not in storage
    expect(JSON.stringify({ ...localStorage })).not.toContain("S3cret-Pass-1");
    fireEvent.click(screen.getByRole("button", { name: "I have saved these, close" }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText("S3cret-Pass-1")).not.toBeInTheDocument();
    unmount();
  });

  it("editing after a dry run discards the preview so confirm can never import something unchecked", async () => {
    vi.mocked(eventsApi.bulkOnboardCsv).mockResolvedValue({ dry_run: true, vendors: [{ category: "FOOD", stall_code: null, amount_cents: null, billable_days: null }] });
    mount();
    fireEvent.change(screen.getByLabelText("CSV"), { target: { value: "category\nFOOD" } });
    fireEvent.click(screen.getByRole("button", { name: "Run check (dry run)" }));
    await screen.findByText(/Check passed/);
    fireEvent.change(screen.getByLabelText("CSV"), { target: { value: "category\nCLOTHING" } });
    expect(screen.queryByRole("button", { name: /Confirm and create/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run check (dry run)" })).toBeInTheDocument();
  });

  it("row editor sends the structured rows endpoint", async () => {
    vi.mocked(eventsApi.bulkOnboard).mockResolvedValue({ dry_run: true, vendors: [{ category: "CLOTHING", stall_code: "B2", amount_cents: 5000, billable_days: 1 }] });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Row editor" }));
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "CLOTHING" } });
    fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Threads" } });
    fireEvent.change(screen.getByLabelText("Owner email"), { target: { value: "t@example.com" } });
    fireEvent.change(screen.getByLabelText("Stall"), { target: { value: "B2" } });
    fireEvent.click(screen.getByRole("button", { name: "Run check (dry run)" }));
    await waitFor(() => expect(eventsApi.bulkOnboard).toHaveBeenCalled());
    expect(eventsApi.bulkOnboard).toHaveBeenCalledWith(
      "ev-1",
      [{ category: "CLOTHING", stall_code: "B2", business_name: "Threads", owner_email: "t@example.com" }],
      true,
    );
  });

  it("reads an uploaded .csv file into csv_text", async () => {
    mount();
    const file = new File([CSV], "vendors.csv", { type: "text/csv" });
    // jsdom's File may lack text(); provide it for the assertion path.
    if (!file.text) Object.defineProperty(file, "text", { value: () => Promise.resolve(CSV) });
    fireEvent.change(screen.getByLabelText("Or upload a .csv file"), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByLabelText("CSV")).toHaveValue(CSV));
  });
});
