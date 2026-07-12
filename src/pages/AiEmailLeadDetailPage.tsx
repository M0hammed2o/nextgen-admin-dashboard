import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { aiEmailsApi } from "@/api/aiEmails";
import type { LeadDetail } from "@/types/aiEmails";
import { formatDate, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground w-48 shrink-0">{label}</span>
      <span className="text-sm font-medium break-all">{value ?? "—"}</span>
    </div>
  );
}

export default function AiEmailLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    aiEmailsApi.getLead(id).then(setLead).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate("/ai-emails/leads")} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Button>
        <p className="text-sm text-destructive">{error || "Lead not found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/ai-emails/leads")} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{lead.business_name}</h1>
          <p className="text-sm text-muted-foreground">{lead.category || "Uncategorised"}</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full font-medium bg-muted text-muted-foreground">
          {lead.lead_status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-2">Contact Details</h2>
        <InfoRow label="City" value={lead.city} />
        <InfoRow label="Suburb" value={lead.suburb} />
        <InfoRow label="Address" value={lead.address} />
        <InfoRow label="Phone" value={lead.phone} />
        <InfoRow label="WhatsApp" value={lead.whatsapp} />
        <InfoRow label="Email" value={lead.email} />
        <InfoRow label="Website" value={lead.website} />
        <InfoRow label="Source URL" value={lead.source_url} />
        <InfoRow label="Preferred Contact Method" value={lead.preferred_contact_method} />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-2">Pipeline</h2>
        <InfoRow label="Verification Status" value={lead.verification_status} />
        <InfoRow label="Do Not Contact" value={lead.do_not_contact ? "Yes" : "No"} />
        <InfoRow label="Last Contacted" value={lead.last_contacted_date ? formatDate(lead.last_contacted_date) : null} />
        <InfoRow label="Next Follow-up" value={lead.next_follow_up_date ? formatDate(lead.next_follow_up_date) : null} />
        <InfoRow label="Unsubscribed" value={lead.unsubscribed_at ? formatDateTime(lead.unsubscribed_at) : null} />
        <InfoRow label="Unsubscribe Reason" value={lead.unsubscribe_reason} />
        <InfoRow label="Tags" value={lead.tags.length > 0 ? lead.tags.join(", ") : null} />
        <InfoRow label="Created" value={formatDateTime(lead.created_at)} />
        <InfoRow label="Updated" value={formatDateTime(lead.updated_at)} />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-2">Research Notes</h2>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
          {lead.research_notes || "No research notes yet."}
        </p>
        {lead.ai_research_summary && (
          <>
            <h3 className="text-xs font-semibold mt-4 mb-1 text-muted-foreground">AI Research Summary</h3>
            <p className="text-sm whitespace-pre-wrap">{lead.ai_research_summary}</p>
          </>
        )}
      </div>
    </div>
  );
}
