import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { EventOverviewTab } from "./EventOverviewTab";
import { EventCalendarTab } from "./EventCalendarTab";
import { eventsApi } from "@/api/events";
import { apiError, eventFixture, renderWithProviders } from "@/test/eventFixtures";

vi.mock("@/api/events", () => ({ eventsApi: { setStatus: vi.fn(), update: vi.fn(), replaceCalendar: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("EventOverviewTab", () => {
  beforeEach(() => Object.values(eventsApi).forEach((f) => vi.mocked(f).mockReset()));

  it("cancelling needs confirmation that explains vendor access ends; OPEN/DRAFT do not", async () => {
    vi.mocked(eventsApi.setStatus).mockResolvedValue({ ...eventFixture, status: "CANCELLED" });
    renderWithProviders(<EventOverviewTab event={eventFixture} />);
    expect(screen.getByText("R 1 900.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel event" }));
    expect(eventsApi.setStatus).not.toHaveBeenCalled();
    expect(screen.getByText(/ends vendor access/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel event" }).pop()!);
    await waitFor(() => expect(eventsApi.setStatus).toHaveBeenCalledWith("ev-1", "CANCELLED"));
  });

  it("saves details including prep_days, and rejects out-of-range prep days client-side", async () => {
    vi.mocked(eventsApi.update).mockResolvedValue(eventFixture);
    renderWithProviders(<EventOverviewTab event={eventFixture} />);
    fireEvent.change(screen.getByLabelText("Prep days"), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(await screen.findByText(/0 to 90/)).toBeInTheDocument();
    expect(eventsApi.update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Prep days"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(eventsApi.update).toHaveBeenCalledWith("ev-1", { name: "Night Souk", venue: "City Hall", notes: null, prep_days: 7 }));
  });
});

describe("EventCalendarTab", () => {
  beforeEach(() => Object.values(eventsApi).forEach((f) => vi.mocked(f).mockReset()));

  it("toggles billable, saves via PUT, and shows PAID_DAY_REMOVED clearly", async () => {
    vi.mocked(eventsApi.replaceCalendar).mockRejectedValue(apiError("2026-12-01 is inside a paid vendor subscription and must stay billable", "PAID_DAY_REMOVED"));
    renderWithProviders(<EventCalendarTab event={eventFixture} />);
    fireEvent.click(screen.getByLabelText(/Billable on 2026-12-01/));
    fireEvent.click(screen.getByRole("button", { name: "Save calendar" }));
    expect(await screen.findByText(/a vendor has paid for this day/)).toBeInTheDocument();
    expect(eventsApi.replaceCalendar).toHaveBeenCalledWith("ev-1", [
      { day: "2026-12-01", is_billable: false },
      { day: "2026-12-02", is_billable: true },
    ]);
  });

  it("generates a range of new billable days", () => {
    renderWithProviders(<EventCalendarTab event={eventFixture} />);
    fireEvent.change(screen.getByLabelText("First day"), { target: { value: "2026-12-03" } });
    fireEvent.change(screen.getByLabelText("Last day"), { target: { value: "2026-12-04" } });
    fireEvent.click(screen.getByRole("button", { name: "Add days" }));
    expect(screen.getByText("4 days, 4 billable")).toBeInTheDocument();
  });
});
