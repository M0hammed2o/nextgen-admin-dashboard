import { useEffect, useState } from "react";
import { auditApi } from "@/api/audit";
import type { AuditRecord } from "@/types/audit";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [businessId, setBusinessId] = useState("");
  const [scope, setScope] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAudit = () => {
    setLoading(true);
    auditApi.list({
      page,
      per_page: perPage,
      business_id: businessId || undefined,
      scope: scope || undefined,
    }).then(setRecords).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAudit(); }, [page, perPage]);

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Business ID</label>
          <Input placeholder="Optional" value={businessId} onChange={(e) => setBusinessId(e.target.value)} className="w-64" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Scope</label>
          <Input placeholder="Optional" value={scope} onChange={(e) => setScope(e.target.value)} className="w-40" />
        </div>
        <Button onClick={() => { setPage(1); fetchAudit(); }}>Filter</Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-base font-medium">No audit records found</p>
            <p className="text-sm mt-1">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-8"></th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scope</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Target</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">IP</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">ID</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <>
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                          {expandedId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium">{r.action}</td>
                      <td className="px-4 py-3">{r.scope}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs">{r.target_type}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs font-mono">{r.ip_address}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(r.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => copyId(r.id)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <Copy className="w-3 h-3" />
                          {r.id.slice(0, 8)}
                        </button>
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={`${r.id}-detail`} className="border-b border-border">
                        <td colSpan={7} className="px-4 py-3 bg-muted/20">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
                            <div><span className="text-muted-foreground">Actor: </span><span className="font-mono">{r.actor_user_id}</span></div>
                            <div><span className="text-muted-foreground">Target ID: </span><span className="font-mono">{r.target_id}</span></div>
                            <div><span className="text-muted-foreground">Business: </span><span className="font-mono">{r.business_id}</span></div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Diff JSON:</p>
                            <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto font-mono">
                              {JSON.stringify(r.diff_json, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Per page:</span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="bg-muted border-none rounded px-2 py-1 text-sm"
            >
              {[20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">Page {page}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={records.length < perPage} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
