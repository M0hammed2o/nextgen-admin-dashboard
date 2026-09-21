import { useState } from "react";
import { Input } from "@/components/ui/input";
import { KNOWN_PLANS, isKnownPlan } from "@/lib/plans";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Plan picker restricted to the values the platform's billing code actually
 * recognizes (see lib/plans.ts), with an "Other…" escape hatch that reveals
 * a free-text input -- needed because an existing business can already hold
 * a plan value outside this list, and editing it shouldn't silently corrupt
 * that value into one of the three known ones.
 */
export function PlanSelect({ value, onChange }: Props) {
  const [otherMode, setOtherMode] = useState(() => !!value && !isKnownPlan(value));

  if (otherMode) {
    return (
      <div className="space-y-1">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Custom plan value" />
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground underline"
          onClick={() => {
            setOtherMode(false);
            if (!isKnownPlan(value)) onChange(KNOWN_PLANS[0]);
          }}
        >
          Choose from known plans instead
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === "__other__") {
          setOtherMode(true);
          return;
        }
        onChange(e.target.value);
      }}
      className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {KNOWN_PLANS.map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
      <option value="__other__">Other…</option>
    </select>
  );
}
