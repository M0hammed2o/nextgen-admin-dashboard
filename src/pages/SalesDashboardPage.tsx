import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { commercialApi } from "@/api/commercial";
import type { CommercialDashboardResponse, DashboardRow, AccountStatusValue } from "@/types/commercial";
import { formatCentsAsRands } from "@/lib/money";
import { trialDaysUrgency, URGENCY_STYLES } from "@/lib/accountStatus";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  Clock, AlertCircle, TrendingUp, CheckCircle2, XCircle, Ban,
} from "lucide-react";

// counts keys (lowercase, from CommercialDashboardResponse.counts) -> the
// filter value SalesClientsPage's status dropdown/query param expects
// (AccountStatusValue, uppercase) -- see routes_commercial.py's
// get_commercial_dashboard counts dict literal.
const COUNT_TILES: { key: string; status: AccountStatusValue; label: string; icon: typeof Clock }[] = [
  { key: "trial", status: "TRIAL", label: "Trial", icon: Clock },
  { key: "active", status: "ACTIVE", label: "Active", icon: CheckCircle2 },
  { key: "payment_due", status: "PAYMENT_DUE", label: "Payment due", icon: AlertCircle },
  { key: "overdue", status: "OVERDUE", label: "Overdue", icon: XCircle },
  { key: "expired", status: "EXPIRED", label: "Expired", icon: Ban },
  { key: "suspended", status: "SUSPENDED", label: "Suspended", icon: Ban },
];

function ClientRowLink({ row, navigate, right }: { row: DashboardRow; navigate: (path: string) => void; right?: React.ReactNode }) {
  return (
    <button
      onClick={() => navigate(`/sales/clients/${row.business_id}`)}
      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{row.business_name}</p>
        <p className="text-xs text-muted-foreground">{row.plan}{row.onboarded_by ? ` · ${row.onboarded_by}` : ""}</p>
      </div>
      {right}
    </button>
  );
}

export default function SalesDashboardPage() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState<CommercialDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = () => {
    setLoading(true);
    setError("");
    commercialApi.getDashboard()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load the sales dashboard"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <p className="text-destructive mb-4">{error || "Could not load the sales dashboard"}</p>
        <Button variant="outline" onClick={fetchDashboard}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-base font-semibold">Sales Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          {isSuperAdmin ? "Every client across every sales partner." : "Your clients — trials, payments, and go-live status."}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {COUNT_TILES.map(({ key, status, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => navigate(`/sales/clients?status=${status}`)}
            className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold">{data.counts[key] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Trials Ending Soon</h3>
          </div>
          {data.trials_ending_soon.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No trials ending soon — nothing to chase right now.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.trials_ending_soon.map((row) => (
                <ClientRowLink
                  key={row.business_id}
                  row={row}
                  navigate={navigate}
                  right={
                    <span className={`text-xs font-medium ${URGENCY_STYLES[trialDaysUrgency(row.days_remaining)]}`}>
                      {row.days_remaining === null ? "No end date" : row.days_remaining === 0 ? "Ends today" : `${row.days_remaining}d left`}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Payments Awaiting Confirmation</h3>
          </div>
          {data.payments_awaiting_confirmation.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No unpaid issued invoices right now.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.payments_awaiting_confirmation.map((row) => (
                <ClientRowLink
                  key={row.business_id}
                  row={row}
                  navigate={navigate}
                  right={<span className="text-xs font-medium text-warning">{formatCentsAsRands(row.outstanding_cents)}</span>}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <XCircle className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Overdue Clients</h3>
          </div>
          {data.overdue_clients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No overdue clients.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.overdue_clients.map((row) => (
                <ClientRowLink
                  key={row.business_id}
                  row={row}
                  navigate={navigate}
                  right={<span className="text-xs font-medium text-destructive">{formatCentsAsRands(row.outstanding_cents)}</span>}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Recently Converted</h3>
          </div>
          {data.recently_converted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No conversions in the last 30 days yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.recently_converted.map((row) => (
                <ClientRowLink key={row.business_id} row={row} navigate={navigate} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden lg:col-span-2">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Recently Created Trials</h3>
          </div>
          {data.recently_created_trials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No trials started in the last 14 days — visit a restaurant and start one from its Client page.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {data.recently_created_trials.map((row) => (
                <ClientRowLink
                  key={row.business_id}
                  row={row}
                  navigate={navigate}
                  right={row.trial_ends_at ? <span className="text-xs text-muted-foreground">Ends {formatDate(row.trial_ends_at)}</span> : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {data.expired_trials.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Ban className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Expired Trials</h3>
          </div>
          <div className="divide-y divide-border">
            {data.expired_trials.map((row) => (
              <ClientRowLink key={row.business_id} row={row} navigate={navigate} right={<span className="text-xs text-muted-foreground">Extend or follow up</span>} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
