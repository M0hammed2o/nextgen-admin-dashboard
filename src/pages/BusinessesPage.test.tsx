import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BusinessesPage from "./BusinessesPage";
import { businessesApi } from "@/api/businesses";

// Fix #4: a failed businessesApi.list() call must render a distinct error
// state with a Retry button -- not the same "No businesses found" empty
// state a real admin would otherwise mistake for "this platform truly has
// zero tenants" (the pre-existing `.catch(() => {})` bug).
vi.mock("@/api/businesses", () => ({
  businessesApi: {
    list: vi.fn(),
  },
}));

describe("BusinessesPage error handling", () => {
  beforeEach(() => {
    vi.mocked(businessesApi.list).mockReset();
  });

  it("shows a distinct error state with Retry, not the empty state, when the API call fails", async () => {
    vi.mocked(businessesApi.list).mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <BusinessesPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());
    expect(screen.queryByText("No businesses found.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("Retry re-calls the API and can recover to a successful render", async () => {
    vi.mocked(businessesApi.list)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <BusinessesPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.getByText("No businesses found.")).toBeInTheDocument());
    expect(businessesApi.list).toHaveBeenCalledTimes(2);
  });
});
