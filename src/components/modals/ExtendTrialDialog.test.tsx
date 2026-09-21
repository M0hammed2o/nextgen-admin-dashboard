import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExtendTrialDialog } from "./ExtendTrialDialog";
import { businessesApi } from "@/api/businesses";
import { toast } from "sonner";

vi.mock("@/api/businesses", () => ({
  businessesApi: { extendTrial: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("ExtendTrialDialog", () => {
  beforeEach(() => {
    vi.mocked(businessesApi.extendTrial).mockReset();
    vi.mocked(toast.error).mockClear();
  });

  it("surfaces EXTENSION_CAP_EXCEEDED's backend message inline, not just as a toast", async () => {
    vi.mocked(businessesApi.extendTrial).mockRejectedValue(
      new Error("ONBOARDER trial extensions are capped at 14 cumulative days per business (already used 10)")
    );

    render(
      <ExtendTrialDialog
        open onClose={() => {}} businessId="biz-1" isOnboarder extensionDaysUsed={10} onSuccess={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "client asked nicely" } });
    fireEvent.click(screen.getByRole("button", { name: "Extend Trial" }));

    await waitFor(() =>
      expect(screen.getByText(/capped at 14 cumulative days per business \(already used 10\)/)).toBeInTheDocument()
    );
    expect(toast.error).toHaveBeenCalledWith(
      "ONBOARDER trial extensions are capped at 14 cumulative days per business (already used 10)"
    );
  });

  it("shows the ONBOARDER's known-used/remaining allowance when provided", () => {
    render(
      <ExtendTrialDialog
        open onClose={() => {}} businessId="biz-1" isOnboarder extensionDaysUsed={10} onSuccess={() => {}}
      />
    );
    expect(screen.getByText(/used 10 of 14 cumulative extension days/)).toBeInTheDocument();
    expect(screen.getByText(/4 remaining/)).toBeInTheDocument();
  });

  it("requires a reason before submitting", async () => {
    render(
      <ExtendTrialDialog
        open onClose={() => {}} businessId="biz-1" isOnboarder={false} extensionDaysUsed={null} onSuccess={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Extend Trial" }));
    await waitFor(() => expect(screen.getByText("A reason is required")).toBeInTheDocument());
    expect(businessesApi.extendTrial).not.toHaveBeenCalled();
  });
});
