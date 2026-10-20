import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BusinessUsageSection } from "./BusinessUsageSection";
import { businessesApi } from "@/api/businesses";
import type { BusinessUsageSummary } from "@/types/usage";

vi.mock("@/api/businesses", () => ({
  businessesApi: { getUsageSummary: vi.fn() },
}));

const SUMMARY: BusinessUsageSummary = {
  orders_used: 450,
  orders_allowance: 500,
  orders_remaining: 50,
  pct_used: 90,
  tier: "warning_90",
  ai_llm_calls: 1200,
  ai_llm_tokens: 98000,
  ai_llm_cost_cents: 4590,
  whatsapp_inbound_messages: 800,
  whatsapp_outbound_messages: 820,
  whatsapp_messaging_cost_rand: null,
};

describe("BusinessUsageSection", () => {
  beforeEach(() => {
    vi.mocked(businessesApi.getUsageSummary).mockReset();
  });

  it("shows a distinct error state with Retry, not fabricated data, when the API call fails", async () => {
    vi.mocked(businessesApi.getUsageSummary).mockRejectedValue(new Error("Network error"));

    render(<BusinessUsageSection businessId="biz-1" />);

    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("Retry re-calls the API and can recover to a successful render", async () => {
    vi.mocked(businessesApi.getUsageSummary)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(SUMMARY);

    render(<BusinessUsageSection businessId="biz-1" />);
    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.getByText("90% used")).toBeInTheDocument());
    expect(businessesApi.getUsageSummary).toHaveBeenCalledTimes(2);
  });

  it("renders the tier badge and real metered LLM cost, and never fabricates a WhatsApp messaging cost number", async () => {
    vi.mocked(businessesApi.getUsageSummary).mockResolvedValue(SUMMARY);

    render(<BusinessUsageSection businessId="biz-1" />);

    await waitFor(() => expect(screen.getByText("90% used")).toBeInTheDocument());

    // Orders / tier
    expect(screen.getByText("450 / 500")).toBeInTheDocument();

    // LLM cost is a real, metered figure -- labeled as such, and rendered as
    // an actual currency amount (R45.90), not omitted or zeroed out.
    expect(screen.getByText(/real, metered/)).toBeInTheDocument();
    expect(screen.getByText(/R\s?45[.,]90/)).toBeInTheDocument();

    // WhatsApp messaging cost: the API contract always returns null here --
    // this must render as an explicit "Not tracked" label, never a number
    // (e.g. never "R0.00", which would misrepresent an untracked cost as a
    // real zero cost -- see this component's own doc comment / KNOWN_BUGS.md
    // BUG-0004 for the standing "never fabricate a result" rule).
    expect(screen.getByText("Not tracked")).toBeInTheDocument();
    expect(screen.getByText(/isn't tracked in this system/)).toBeInTheDocument();
    expect(screen.queryByText("R0.00")).not.toBeInTheDocument();
  });

  it("refetches when businessId changes", async () => {
    vi.mocked(businessesApi.getUsageSummary).mockResolvedValue(SUMMARY);
    const { rerender } = render(<BusinessUsageSection businessId="biz-1" />);
    await waitFor(() => expect(businessesApi.getUsageSummary).toHaveBeenCalledWith("biz-1"));

    rerender(<BusinessUsageSection businessId="biz-2" />);
    await waitFor(() => expect(businessesApi.getUsageSummary).toHaveBeenCalledWith("biz-2"));
  });
});
