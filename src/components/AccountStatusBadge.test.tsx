import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountStatusBadge } from "./AccountStatusBadge";
import type { AccountStatusValue } from "@/types/commercial";

const ALL_STATUSES: AccountStatusValue[] = [
  "TRIAL", "ACTIVE", "PAYMENT_DUE", "OVERDUE", "EXPIRED", "SUSPENDED", "CANCELLED",
];

describe("AccountStatusBadge", () => {
  it.each(ALL_STATUSES)("renders a human label for %s", (status) => {
    render(<AccountStatusBadge status={status} />);
    expect(screen.getByText(/./)).toBeInTheDocument();
  });

  it("maps each backend status to the expected label", () => {
    const cases: [AccountStatusValue, string][] = [
      ["TRIAL", "Trial"],
      ["ACTIVE", "Active"],
      ["PAYMENT_DUE", "Payment due"],
      ["OVERDUE", "Overdue"],
      ["EXPIRED", "Expired"],
      ["SUSPENDED", "Suspended"],
      ["CANCELLED", "Cancelled"],
    ];
    for (const [status, label] of cases) {
      const { unmount } = render(<AccountStatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });
});
