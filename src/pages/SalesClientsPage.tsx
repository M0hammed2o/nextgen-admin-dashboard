import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { commercialApi } from "@/api/commercial";
import type { ClientRow, AccountStatusValue } from "@/types/commercial";
import { AccountStatusBadge } from "@/components/AccountStatusBadge";
import { formatCentsAsRands } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight } from "lucide-react";

const STATUS_FILTERS: { value: AccountStatusValue | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "TRIAL", label: "Trial" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAYMENT_DUE", label: "Payment due" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "EXPIRED", label: "Expired" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function SalesClientsPage() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get("status") ?? "") as AccountStatusValue | "";

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchClients = () => {
    setLoading(true);
    setError("");
    commercialApi.listClients({ status: status || undefined })
      .then(setClients)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load clients"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, [status]);

  const setStatus = (value: string) => {
    if (value) setSearchParams({ status: value });
    else setSearchParams({});
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-base font-semibold">Clients</h2>
        <p className="text-sm text-muted-foreground">
          {isSuperAdmin ? "Every client, across every sales partner." : "Your clients and their commercial status."}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            onClick={() => setStatus(f.value)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              status === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchClients}>Retry</Button>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {status ? `No clients with status "${status}".` : "No clients yet. Start onboarding a restaurant to see it here."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {clients.map((c) => (
              <button
                key={c.business_id}
                onClick={() => navigate(`/sales/clients/${c.business_id}`)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.business_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.plan}
                    {c.onboarded_by ? ` · ${c.onboarded_by}` : ""}
                    {c.trial_ends_at && c.days_remaining !== null ? ` · ${c.days_remaining}d left in trial` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {c.outstanding_cents > 0 && (
                    <span className="text-xs font-medium text-muted-foreground">{formatCentsAsRands(c.outstanding_cents)} due</span>
                  )}
                  <AccountStatusBadge status={c.account_status} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
