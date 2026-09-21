import type { GoLiveStatus } from "@/types/onboarding";

const STYLES: Record<GoLiveStatus, string> = {
  pass: "bg-success/10 text-success",
  fail: "bg-destructive/10 text-destructive",
  warn: "bg-warning/10 text-warning",
  "n/a": "bg-muted text-muted-foreground",
};

const TEXT: Record<GoLiveStatus, string> = { pass: "Pass", fail: "Fail", warn: "Warn", "n/a": "N/A" };

/** Renders one of the 4 go-live check statuses (admin_api's GoLiveCheck.status). */
export function GoLiveStatusBadge({ status }: { status: GoLiveStatus }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STYLES[status]}`}>{TEXT[status]}</span>;
}
