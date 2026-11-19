import * as React from "react";
import { cn } from "@/lib/utils";
import { STATUS_STYLES } from "@/lib/events";
import type { EventStatus } from "@/types/events";

/** Native <select> styled like <Input>: keyboard- and screen-reader-accessible with no extra deps. */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
NativeSelect.displayName = "NativeSelect";

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT}`}>
      {status}
    </span>
  );
}
