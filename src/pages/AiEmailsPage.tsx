import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { aiEmailsApi } from "@/api/aiEmails";
import { Users, SearchCheck, ShieldAlert, Send, Upload, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportLeadsModal } from "@/components/modals/ImportLeadsModal";

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

interface Counts {
  total: number;
  requiresResearch: number;
  requiresVerification: number;
  readyToGenerate: number;
}

export default function AiEmailsPage() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  const fetchCounts = () => {
    setLoading(true);
    Promise.all([
      aiEmailsApi.listLeads({ per_page: 1 }),
      aiEmailsApi.listLeads({ per_page: 1, lead_status: "requires_research" }),
      aiEmailsApi.listLeads({ per_page: 1, lead_status: "requires_verification" }),
      aiEmailsApi.listLeads({ per_page: 1, lead_status: "ready_to_generate" }),
    ])
      .then(([total, research, verification, ready]) => {
        setCounts({
          total: total.pagination.total ?? 0,
          requiresResearch: research.pagination.total ?? 0,
          requiresVerification: verification.pagination.total ?? 0,
          readyToGenerate: ready.pagination.total ?? 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCounts(); }, []);

  if (loading || !counts) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">AI Email Outreach</h1>
          <p className="text-sm text-muted-foreground">Lead import and tracking — Phase 1 (foundation)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Leads" value={counts.total} icon={Users} color="bg-primary/10 text-primary" />
        <StatCard title="Requires Research" value={counts.requiresResearch} icon={SearchCheck} color="bg-warning/10 text-warning" />
        <StatCard title="Requires Verification" value={counts.requiresVerification} icon={ShieldAlert} color="bg-warning/10 text-warning" />
        <StatCard title="Ready to Generate" value={counts.readyToGenerate} icon={Send} color="bg-success/10 text-success" />
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3 max-w-sm">
        <h2 className="text-sm font-semibold mb-2">Quick Actions</h2>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4" /> Import Leads
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/ai-emails/leads")}>
          <List className="w-4 h-4" /> View Leads
        </Button>
      </div>

      <ImportLeadsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={fetchCounts}
      />
    </div>
  );
}
