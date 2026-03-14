import { useState } from "react";
import { businessesApi } from "@/api/businesses";
import type { WhatsAppTestResponse } from "@/types/business";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  businessId: string;
}

export function WhatsAppTestModal({ open, onClose, businessId }: Props) {
  const [loading, setLoading] = useState(false);
  const [to, setTo] = useState("");
  const [text, setText] = useState("Hello from NextGen test 🚀");
  const [result, setResult] = useState<WhatsAppTestResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await businessesApi.whatsappTestSend(businessId, { to, text });
      setResult(res);
      if (res.success) toast.success("Message sent!");
      else toast.error(res.error || "Send failed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setResult(null); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>WhatsApp Test Send</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>To (Phone Number)</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="27821234567" required />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Input value={text} onChange={(e) => setText(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending…" : "Send Test Message"}</Button>
        </form>

        {result && (
          <div className={`mt-4 rounded-lg p-4 text-sm space-y-2 ${result.success ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"}`}>
            <div className="flex items-center gap-2 font-medium">
              {result.success ? <CheckCircle2 className="w-4 h-4 text-success" /> : <XCircle className="w-4 h-4 text-destructive" />}
              {result.success ? "Sent Successfully" : "Send Failed"}
            </div>
            {result.wa_message_id && <p><span className="text-muted-foreground">Message ID:</span> <span className="font-mono text-xs">{result.wa_message_id}</span></p>}
            {result.phone_number_id && <p><span className="text-muted-foreground">Phone ID:</span> <span className="font-mono text-xs">{result.phone_number_id}</span></p>}
            {result.error && <p><span className="text-muted-foreground">Error:</span> {result.error}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
