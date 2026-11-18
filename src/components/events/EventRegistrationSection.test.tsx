import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { EventRegistrationSection } from "./EventRegistrationSection";
import { eventsApi } from "@/api/events";
import { eventFixture, renderWithProviders } from "@/test/eventFixtures";

vi.mock("@/api/events", () => ({ eventsApi: { setRegistration: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const setReg = vi.mocked(eventsApi.setRegistration);

describe("EventRegistrationSection", () => {
  beforeEach(() => {
    setReg.mockReset();
    vi.stubEnv("VITE_MANAGER_APP_URL", "https://app.example.test/");
  });

  it("opens registration, shows the link, and shows a newly generated code once, cleared on close", async () => {
    setReg.mockResolvedValue({ registration_open: true, has_registration_code: true, registration_code: "ABCD-EFGH" });
    renderWithProviders(<EventRegistrationSection event={{ ...eventFixture, registration_open: false, has_registration_code: false }} />);
    expect(screen.getByText("https://app.example.test/events/night-souk/register")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open registration" }));
    await waitFor(() => expect(setReg).toHaveBeenCalledWith("ev-1", true, false));
    expect(await screen.findByTestId("join-code")).toHaveTextContent("ABCD-EFGH");
    expect(screen.getByText(/share it with vendors now/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByTestId("join-code")).not.toBeInTheDocument());
    expect(screen.queryByText("ABCD-EFGH")).not.toBeInTheDocument();
  });

  it("closes registration without rotating", async () => {
    setReg.mockResolvedValue({ registration_open: false, has_registration_code: true, registration_code: null });
    renderWithProviders(<EventRegistrationSection event={{ ...eventFixture, registration_open: true, has_registration_code: true }} />);
    fireEvent.click(screen.getByRole("button", { name: "Close registration" }));
    await waitFor(() => expect(setReg).toHaveBeenCalledWith("ev-1", false, false));
    expect(screen.queryByTestId("join-code")).not.toBeInTheDocument();
  });

  it("rotating asks for confirmation first, then calls with rotate_code", async () => {
    setReg.mockResolvedValue({ registration_open: true, has_registration_code: true, registration_code: "WXYZ-2345" });
    renderWithProviders(<EventRegistrationSection event={{ ...eventFixture, registration_open: true, has_registration_code: true }} />);
    fireEvent.click(screen.getByRole("button", { name: "Rotate join code" }));
    expect(setReg).not.toHaveBeenCalled();
    expect(screen.getByText(/current code stops working/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rotate code" }));
    await waitFor(() => expect(setReg).toHaveBeenCalledWith("ev-1", true, true));
    expect(await screen.findByTestId("join-code")).toHaveTextContent("WXYZ-2345");
  });
});
