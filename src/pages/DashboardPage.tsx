import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { businessesApi } from "@/api/businesses";
import { usageApi } from "@/api/usage";
import type { Business } from "@/types/business";
import { deriveAlertTier, derivePctUsed, type UsageAlert, type UsageTier } from "@/types/usage";
import { Building2, CheckCircle2, XCircle, Plus, BarChart3, ScrollText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

const ALERT_TIER_BADGE: Record<UsageTier, string> = {
  ok: "bg-success/10 text-success",
  warning_80: "bg-warning/10 text-warning",
  warning_90: "bg-warning/10 text-warning",
  exceeded: "bg-destructive/10 text-destructive",
};

const ALERT_TIER_LABEL: Record<UsageTier, string> = {
  ok: "OK",
  warning_80: "80% used",
  warning_90: "90% used",
  exceeded: "Exceeded",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // GET /admin/usage-alerts -- businesses that have newly crossed an
  // 80/90/100% usage threshold this billing period. SUPER_ADMIN-only: this
  // whole page only renders for SUPER_ADMIN (ONBOARDER is redirected to
  // /sales by HomeRoute before DashboardPage ever mounts). Own
  // loading/error+retry state, independent of the businesses fetch above.
  const [alerts, setAlerts] = useState<UsageAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState("");

  // A business can have MULTIPLE alert rows in the same billing period --
  // 80% and 90% are recorded as separate rows, not updated in place (see
  // UsageAlert's own doc comment). Collapse to one row per business, the
  // highest threshold crossed, so this widget shows current status rather
  // than a flat log of every threshold ever crossed this period.
  const latestAlertPerBusiness = useMemo(() => {
    const byBusiness = new Map<string, UsageAlert>();
    for (const a of alerts) {
      const existing = byBusiness.get(a.business_id);
      if (!existing || a.threshold_crossed > existing.threshold_crossed) {
        byBusiness.set(a.business_id, a);
      }
    }
    return Array.from(byBusiness.values()).sort((a, b) => b.threshold_crossed - a.threshold_crossed);
  }, [alerts]);

  const fetchBusinesses = () => {
    setLoading(true);
    setError("");
    businessesApi.list({ per_page: 100 })
      .then(setBusinesses)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load dashboard data"))
      .finally(() => setLoading(false));
  };

  const fetchAlerts = () => {
    setAlertsLoading(true);
    setAlertsError("");
    usageApi.getAlerts()
      .then(setAlerts)
      .catch((e: unknown) => setAlertsError(e instanceof Error ? e.message : "Failed to load usage alerts"))
      .finally(() => setAlertsLoading(false));
  };

  useEffect(() => { fetchBusinesses(); }, []);
  useEffect(() => { fetchAlerts(); }, []);

  const active = businesses.filter((b) => b.is_active).length;
  const suspended = businesses.filter((b) => !b.is_active).length;
  const recent = [...businesses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={fetchBusinesses}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Businesses" value={businesses.length} icon={Building2} color="bg-primary/10 text-primary" />
        <StatCard title="Active" value={active} icon={CheckCircle2} color="bg-success/10 text-success" />
        <StatCard title="Suspended" value={suspended} icon={XCircle} color="bg-destructive/10 text-destructive" />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <h2 className="text-sm font-semibold">Usage Alerts</h2>
          {latestAlertPerBusiness.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-warning/10 text-warning">
              {latestAlertPerBusiness.length}
            </span>
          )}
        </div>
        {alertsLoading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : alertsError ? (
          <div className="text-center py-4">
            <p className="text-sm text-destructive mb-2">{alertsError}</p>
            <Button variant="outline" size="sm" onClick={fetchAlerts}>Retry</Button>
          </div>
        ) : latestAlertPerBusiness.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No businesses have crossed a usage threshold this billing period."
            className="py-6"
          />
        ) : (
          <div className="space-y-2">
            {latestAlertPerBusiness.map((a) => {
              const tier = deriveAlertTier(a.threshold_crossed);
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/businesses/${a.business_id}`)}
                  className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <span className="text-sm font-medium">{a.business_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ALERT_TIER_BADGE[tier]}`}>
                    {ALERT_TIER_LABEL[tier]} ({Math.round(derivePctUsed(a))}%)
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Recently Created</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No businesses yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((b) => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/businesses/${b.id}`)}
                  className="flex items-center justify-between w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.business_code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {b.is_active ? "Active" : "Suspended"}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(b.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold mb-2">Quick Actions</h2>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/businesses?create=true")}>
            <Plus className="w-4 h-4" /> Create Business
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/usage")}>
            <BarChart3 className="w-4 h-4" /> View Usage
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/audit")}>
            <ScrollText className="w-4 h-4" /> Audit Log
          </Button>
        </div>
      </div>
    </div>
  );
}
