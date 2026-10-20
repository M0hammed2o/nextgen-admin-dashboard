import { useEffect, useState } from "react";
import { businessesApi } from "@/api/businesses";
import type { BusinessUsageSummary, UsageTier } from "@/types/usage";
import { formatCents, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const TIER_BADGE: Record<UsageTier, string> = {
  ok: "bg-success/10 text-success",
  warning_80: "bg-warning/10 text-warning",
  warning_90: "bg-warning/10 text-warning",
  exceeded: "bg-destructive/10 text-destructive",
};

const TIER_LABEL: Record<UsageTier, string> = {
  ok: "OK",
  warning_80: "80% used",
  warning_90: "90% used",
  exceeded: "Exceeded",
};

interface Props {
  businessId: string;
}

/**
 * GET /admin/businesses/{id}/usage -- SUPER_ADMIN-only (this component's only
 * mount point is BusinessDetailsPage, reachable solely via /businesses/:id,
 * RoleRoute-gated to SUPER_ADMIN in App.tsx). Own loading/error+retry state
 * (the staff PWA's explicit error+retry pattern, not the manager dashboard's
 * silent-failure one -- see this task's brief), independent of the parent
 * page's own `business` fetch, mirroring UsagePage.tsx's own fetch/error
 * handling for the existing aggregate usage view.
 *
 * `whatsapp_messaging_cost_rand` is always null in the real contract --
 * Meta's own messaging cost isn't tracked anywhere in this system. This
 * component must never compute or display a substitute number for it (see
 * KNOWN_BUGS.md BUG-0004 for the standing example of fabricating a result
 * that isn't real -- the same mistake, applied to a cost figure instead of a
 * form submission).
 */
export function BusinessUsageSection({ businessId }: Props) {
  const [summary, setSummary] = useState<BusinessUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSummary = () => {
    setLoading(true);
    setError("");
    businessesApi
      .getUsageSummary(businessId)
      .then(setSummary)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load usage data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  return (
    <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
      <h3 className="text-sm font-semibold mb-3">Usage This Billing Period</h3>
      {loading ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-sm text-destructive mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSummary}>
            Retry
          </Button>
        </div>
      ) : summary ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Orders Used</p>
              <p className="text-xl font-bold">
                {formatNumber(summary.orders_used)} / {formatNumber(summary.orders_allowance)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(summary.orders_remaining)} remaining ({Math.round(summary.pct_used)}% used)
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${TIER_BADGE[summary.tier]}`}>
              {TIER_LABEL[summary.tier]}
            </span>
          </div>

          <hr className="border-border" />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">AI/LLM Calls</p>
              <p className="text-sm font-semibold">{formatNumber(summary.ai_llm_calls)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">AI/LLM Tokens</p>
              <p className="text-sm font-semibold">{formatNumber(summary.ai_llm_tokens)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                AI/LLM Cost <span className="text-[10px]">(real, metered)</span>
              </p>
              <p className="text-sm font-semibold">{formatCents(summary.ai_llm_cost_cents)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WhatsApp Inbound</p>
              <p className="text-sm font-semibold">{formatNumber(summary.whatsapp_inbound_messages)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WhatsApp Outbound</p>
              <p className="text-sm font-semibold">{formatNumber(summary.whatsapp_outbound_messages)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WhatsApp Messaging Cost</p>
              <p className="text-sm font-semibold text-muted-foreground">Not tracked</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Meta's own WhatsApp messaging cost isn't tracked in this system -- the figure above is deliberately
            never fabricated.
          </p>
        </div>
      ) : null}
    </div>
  );
}
