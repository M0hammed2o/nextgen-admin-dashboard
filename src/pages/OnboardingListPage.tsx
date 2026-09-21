import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { businessesApi } from "@/api/businesses";
import type { OnboardingBusiness } from "@/types/business";
import type { OnboardingStatusResponse } from "@/types/onboarding";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronRight } from "lucide-react";
import { CreateOnboardingBusinessModal } from "@/components/modals/CreateOnboardingBusinessModal";
import { useAuth } from "@/contexts/AuthContext";

// Cache of go-live readiness per business, loaded after the list itself so
// the page renders quickly even if a later onboarding-status call is slow
// or fails for one specific business -- a single failing status fetch must
// never blank out the whole list.
type StatusCache = Record<string, OnboardingStatusResponse | "error" | "loading">;

export default function OnboardingListPage() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [businesses, setBusinesses] = useState<OnboardingBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [statuses, setStatuses] = useState<StatusCache>({});

  const fetchBusinesses = () => {
    setLoading(true);
    setError("");
    businessesApi
      .listOnboarding({ per_page: 100 })
      .then((rawList) => {
        // GET /admin/businesses only filters to "not yet handed over" for
        // ONBOARDER server-side (see get_business_scoped's docstring) --
        // for SUPER_ADMIN it deliberately returns EVERY business (same
        // endpoint the full Businesses page uses), since that role's view
        // is platform-wide by design. This page's whole purpose is "still
        // being onboarded", so filter to onboarding_completed_at === null
        // here for both roles -- a no-op for ONBOARDER (already filtered),
        // the actual filter for SUPER_ADMIN. Found while wiring this page
        // up: reading list_businesses in routes_businesses.py shows the
        // onboarding_completed_at filter is inside the `if
        // user.role == AdminRole.ONBOARDER` branch only.
        const list = rawList.filter((b) => b.onboarding_completed_at === null);
        setBusinesses(list);
        // Fire off a readiness check per business -- best-effort, independent
        // per row so one slow/failing business doesn't block the others.
        setStatuses({});
        for (const b of list) {
          setStatuses((prev) => ({ ...prev, [b.id]: "loading" }));
          businessesApi
            .getOnboardingStatus(b.id)
            .then((status) => setStatuses((prev) => ({ ...prev, [b.id]: status })))
            .catch(() => setStatuses((prev) => ({ ...prev, [b.id]: "error" })));
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load onboarding businesses"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBusinesses(); }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Restaurants being onboarded</h2>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Every restaurant not yet handed over, across all sales partners."
              : "Restaurants you're onboarding that haven't been handed over yet."}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Restaurant
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchBusinesses}>Retry</Button>
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No restaurants in onboarding right now. Click "New Restaurant" to start one.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {businesses.map((b) => {
              const status = statuses[b.id];
              return (
                <button
                  key={b.id}
                  onClick={() => navigate(`/onboarding/${b.id}`)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.plan} · Created {formatDate(b.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {status === "loading" || status === undefined ? (
                      <Skeleton className="h-5 w-24" />
                    ) : status === "error" ? (
                      <span className="text-xs text-muted-foreground">Progress unavailable</span>
                    ) : (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          status.ready ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        }`}
                      >
                        {status.go_live.passed}/{status.go_live.checks.length} checks passed
                        {status.ready ? " · Ready" : ""}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CreateOnboardingBusinessModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(id) => { setCreateOpen(false); navigate(`/onboarding/${id}`); }}
      />
    </div>
  );
}
