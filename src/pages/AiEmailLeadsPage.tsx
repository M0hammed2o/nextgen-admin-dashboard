import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { aiEmailsApi } from "@/api/aiEmails";
import type { Lead } from "@/types/aiEmails";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Search, ChevronLeft, ChevronRight, MoreHorizontal, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ImportLeadsModal } from "@/components/modals/ImportLeadsModal";

type Filter = "all" | "requires_research" | "requires_verification" | "ready_to_generate" | "do_not_contact";

const STATUS_STYLES: Record<string, string> = {
  new: "bg-muted text-muted-foreground",
  requires_research: "bg-warning/10 text-warning",
  requires_verification: "bg-warning/10 text-warning",
  ready_to_generate: "bg-success/10 text-success",
  do_not_contact: "bg-destructive/10 text-destructive",
  unsubscribed: "bg-destructive/10 text-destructive",
  invalid_email: "bg-destructive/10 text-destructive",
};

export default function AiEmailLeadsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("import") === "true") {
      setImportOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const fetchLeads = () => {
    setLoading(true);
    aiEmailsApi.listLeads({
      lead_status: filter === "all" || filter === "do_not_contact" ? undefined : filter,
      do_not_contact: filter === "do_not_contact" ? true : undefined,
      search: search || undefined,
      page,
      per_page: perPage,
    })
      .then((res) => {
        setLeads(res.data);
        setTotal(res.pagination.total ?? res.data.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLeads(); }, [filter, page, perPage]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  useEffect(() => {
    const t = setTimeout(fetchLeads, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filters: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Requires Research", value: "requires_research" },
    { label: "Requires Verification", value: "requires_verification" },
    { label: "Ready to Generate", value: "ready_to_generate" },
    { label: "Do Not Contact", value: "do_not_contact" },
  ];

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${filter === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search leads…" value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
          </div>
          <Button onClick={() => setImportOpen(true)} className="gap-1.5">
            <Upload className="w-4 h-4" /> Import
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Business Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">City / Suburb</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Last Contacted</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    No leads found. Use "Import" to add leads from a spreadsheet.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium max-w-[220px] truncate">{lead.business_name}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {[lead.suburb, lead.city].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs">{lead.phone || "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs">{lead.email || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[lead.lead_status] || "bg-muted text-muted-foreground"}`}>
                        {lead.lead_status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground">
                      {lead.last_contacted_date ? formatDate(lead.last_contacted_date) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/ai-emails/leads/${lead.id}`)}>
                            <Eye className="w-4 h-4 mr-2" /> View
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && leads.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages} ({total} total)
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ImportLeadsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={fetchLeads}
      />
    </div>
  );
}
