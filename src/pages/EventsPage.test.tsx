import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import EventsPage from "./EventsPage";
import { eventsApi } from "@/api/events";
import { eventFixture, renderWithProviders } from "@/test/eventFixtures";

vi.mock("@/api/events", () => ({ eventsApi: { list: vi.fn(), create: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const page = (
  <Routes>
    <Route path="/events" element={<EventsPage />} />
    <Route path="/events/:id" element={<div>detail page</div>} />
  </Routes>
);

describe("EventsPage", () => {
  beforeEach(() => {
    vi.mocked(eventsApi.list).mockReset();
    vi.mocked(eventsApi.create).mockReset();
  });

  it("renders events with status badges", async () => {
    vi.mocked(eventsApi.list).mockResolvedValue([
      { id: "ev-1", name: "Night Souk", slug: "night-souk", status: "OPEN", venue: "City Hall" },
      { id: "ev-2", name: "Winter Fair", slug: "winter-fair", status: "DRAFT", venue: null },
    ]);
    renderWithProviders(page, "/events");
    expect(await screen.findByText("Night Souk")).toBeInTheDocument();
    expect(screen.getByText("OPEN")).toBeInTheDocument();
    expect(screen.getByText("DRAFT")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Night Souk" })).toHaveAttribute("href", "/events/ev-1");
  });

  it("shows an empty state, distinct from the error state", async () => {
    vi.mocked(eventsApi.list).mockResolvedValue([]);
    renderWithProviders(page, "/events");
    expect(await screen.findByText("No events yet.")).toBeInTheDocument();
  });

  it("shows an error with Retry that recovers", async () => {
    vi.mocked(eventsApi.list).mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce([]);
    renderWithProviders(page, "/events");
    expect(await screen.findByText("Network error")).toBeInTheDocument();
    expect(screen.queryByText("No events yet.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No events yet.")).toBeInTheDocument();
  });

  it("create modal submits rands as cents (prefilled R100/R50) and navigates to the new event", async () => {
    vi.mocked(eventsApi.list).mockResolvedValue([]);
    vi.mocked(eventsApi.create).mockResolvedValue({ ...eventFixture, id: "ev-new", name: "New Souk" });
    renderWithProviders(page, "/events");
    await screen.findByText("No events yet.");

    fireEvent.click(screen.getAllByRole("button", { name: /Create event/ })[0]);
    expect(screen.getByLabelText("Food day rate (R)")).toHaveValue("100.00");
    expect(screen.getByLabelText("Clothing day rate (R)")).toHaveValue("50.00");

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Souk" } });
    fireEvent.change(screen.getByLabelText("Venue"), { target: { value: "Pier 4" } });
    fireEvent.change(screen.getByLabelText("First day"), { target: { value: "2026-12-01" } });
    fireEvent.change(screen.getByLabelText("Last day"), { target: { value: "2026-12-03" } });
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));

    await waitFor(() => expect(eventsApi.create).toHaveBeenCalledTimes(1));
    expect(eventsApi.create).toHaveBeenCalledWith({
      name: "New Souk",
      venue: "Pier 4",
      timezone: "Africa/Johannesburg",
      food_day_rate_cents: 10000,
      clothing_day_rate_cents: 5000,
      days: [
        { day: "2026-12-01", is_billable: true },
        { day: "2026-12-02", is_billable: true },
        { day: "2026-12-03", is_billable: true },
      ],
      notes: null,
    });
    expect(await screen.findByText("detail page")).toBeInTheDocument();
  });

  it("validates before calling the API", async () => {
    vi.mocked(eventsApi.list).mockResolvedValue([]);
    renderWithProviders(page, "/events");
    await screen.findByText("No events yet.");
    fireEvent.click(screen.getAllByRole("button", { name: /Create event/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    expect(await screen.findByText(/at least 2 characters/)).toBeInTheDocument();
    expect(eventsApi.create).not.toHaveBeenCalled();
  });
});
