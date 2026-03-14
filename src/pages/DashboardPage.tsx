import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { businessesApi } from "@/api/businesses";
import type { Business } from "@/types/business";
import { Building2, CheckCircle2, XCircle, Plus, BarChart3, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    businessesApi.list({ per_page: 100 }).then(setBusinesses).catch(() => {}).finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Businesses" value={businesses.length} icon={Building2} color="bg-primary/10 text-primary" />
        <StatCard title="Active" value={active} icon={CheckCircle2} color="bg-success/10 text-success" />
        <StatCard title="Suspended" value={suspended} icon={XCircle} color="bg-destructive/10 text-destructive" />
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
