import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { businessesApi } from "@/api/businesses";
import type { Business } from "@/types/business";
import { formatDate, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Ban, Unlock, Gauge, UserPlus, MessageSquare, FileDown, ExternalLink } from "lucide-react";
import { EditBusinessModal } from "@/components/modals/EditBusinessModal";
import { SuspendModal } from "@/components/modals/SuspendModal";
import { UnsuspendModal } from "@/components/modals/UnsuspendModal";
import { SetLimitsModal } from "@/components/modals/SetLimitsModal";
import { CreateOwnerModal } from "@/components/modals/CreateOwnerModal";
import { WhatsAppTestModal } from "@/components/modals/WhatsAppTestModal";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground w-48 shrink-0">{label}</span>
      <span className="text-sm font-medium break-all">{value ?? "—"}</span>
    </div>
  );
}

export default function BusinessDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [unsuspendOpen, setUnsuspendOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  const fetch = () => {
    if (!id) return;
    setLoading(true);
    businessesApi.get(id).then(setBusiness).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [id]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action && business) {
      if (action === "edit") setEditOpen(true);
      else if (action === "suspend") setSuspendOpen(true);
      else if (action === "unsuspend") setUnsuspendOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, business]);

  const handleUpdate = (b: Business) => {
    setBusiness(b);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error || "Business not found"}</p>
        <Button variant="outline" onClick={() => navigate("/businesses")}>Back to Businesses</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/businesses")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{business.name}</h2>
          <p className="text-xs text-muted-foreground font-mono">{business.id}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${business.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {business.is_active ? "Active" : "Suspended"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
          <Edit className="w-3.5 h-3.5" /> Edit
        </Button>
        {business.is_active ? (
          <Button variant="outline" size="sm" onClick={() => setSuspendOpen(true)} className="gap-1.5 text-destructive hover:text-destructive">
            <Ban className="w-3.5 h-3.5" /> Suspend
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setUnsuspendOpen(true)} className="gap-1.5">
            <Unlock className="w-3.5 h-3.5" /> Unsuspend
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setLimitsOpen(true)} className="gap-1.5">
          <Gauge className="w-3.5 h-3.5" /> Set Limits
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOwnerOpen(true)} className="gap-1.5">
          <UserPlus className="w-3.5 h-3.5" /> Create Owner/Manager
        </Button>
        <Button variant="outline" size="sm" onClick={() => setWhatsappOpen(true)} className="gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Test
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={async () => {
            try {
              await businessesApi.billingPdf(business.id);
            } catch {
              const { toast } = await import("sonner");
              toast.error("Failed to generate billing PDF");
            }
          }}
        >
          <FileDown className="w-3.5 h-3.5" /> Billing PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => window.open("http://localhost:8081", "_blank")}
        >
          <ExternalLink className="w-3.5 h-3.5" /> Business Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Basic Info</h3>
          <InfoRow label="Name" value={business.name} />
          <InfoRow label="Slug" value={<span className="text-xs font-mono break-all">{business.slug}</span>} />
          <InfoRow label="Business Code" value={business.business_code} />
          <InfoRow label="Timezone" value={business.timezone} />
          <InfoRow label="Currency" value={business.currency} />
          <InfoRow label="Created" value={formatDateTime(business.created_at)} />
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Billing & Plan</h3>
          <InfoRow label="Plan" value={business.plan} />
          <InfoRow label="Billing Status" value={business.billing_status} />
          <InfoRow label="Stripe Customer" value={business.stripe_customer_id || "—"} />
          <InfoRow label="Stripe Subscription" value={business.stripe_subscription_id || "—"} />
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">WhatsApp</h3>
          <InfoRow label="Phone Number ID" value={business.whatsapp_phone_number_id || "—"} />
          <InfoRow label="Last Webhook" value={formatDateTime(business.last_webhook_received_at)} />
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Limits</h3>
          <InfoRow label="Daily Messages" value={business.daily_message_limit} />
          <InfoRow label="Daily LLM Calls" value={business.daily_llm_call_limit} />
          <InfoRow label="Daily Orders" value={business.daily_order_limit} />
          {business.suspended_reason && (
            <InfoRow label="Suspended Reason" value={<span className="text-destructive">{business.suspended_reason}</span>} />
          )}
        </div>
      </div>

      <EditBusinessModal open={editOpen} onClose={() => setEditOpen(false)} business={business} onSuccess={handleUpdate} />
      <SuspendModal open={suspendOpen} onClose={() => setSuspendOpen(false)} businessId={business.id} onSuccess={handleUpdate} />
      <UnsuspendModal open={unsuspendOpen} onClose={() => setUnsuspendOpen(false)} businessId={business.id} businessName={business.name} onSuccess={handleUpdate} />
      <SetLimitsModal open={limitsOpen} onClose={() => setLimitsOpen(false)} business={business} onSuccess={handleUpdate} />
      <CreateOwnerModal open={ownerOpen} onClose={() => setOwnerOpen(false)} businessId={business.id} />
      <WhatsAppTestModal open={whatsappOpen} onClose={() => setWhatsappOpen(false)} businessId={business.id} />
    </div>
  );
}
