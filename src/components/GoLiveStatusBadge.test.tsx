import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoLiveStatusBadge } from "./GoLiveStatusBadge";
import type { GoLiveStatus } from "@/types/onboarding";

// admin_api/app/services/onboarding.py's GoLiveCheck.status is always one
// of exactly these 4 values -- every one must render distinguishably.
describe("GoLiveStatusBadge", () => {
  const cases: { status: GoLiveStatus; text: string }[] = [
    { status: "pass", text: "Pass" },
    { status: "fail", text: "Fail" },
    { status: "warn", text: "Warn" },
    { status: "n/a", text: "N/A" },
  ];

  it.each(cases)("renders $status as $text", ({ status, text }) => {
    render(<GoLiveStatusBadge status={status} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("gives fail and pass visually distinct classes", () => {
    const { container: passContainer } = render(<GoLiveStatusBadge status="pass" />);
    const { container: failContainer } = render(<GoLiveStatusBadge status="fail" />);
    expect(passContainer.querySelector("span")?.className).not.toEqual(failContainer.querySelector("span")?.className);
  });
});
