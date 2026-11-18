import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { eventsApi } from "@/api/events";
import type { EventDetail } from "@/types/events";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { eventErrorMessage } from "@/lib/events";
import { toast } from "sonner";

function copy(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Copied to clipboard"),
    () => toast.error("Could not copy; select and copy it manually"),
  );
}

export function registrationLink(slug: string): string | null {
  const origin = (import.meta.env.VITE_MANAGER_APP_URL as string | undefined)?.replace(/\/+$/, "");
  return origin ? `${origin}/events/${slug}/register` : null;
}

export function EventRegistrationSection({ event }: { event: EventDetail }) {
  const qc = useQueryClient();
  // The plaintext code lives ONLY in this state; cleared on dialog close. Never stored elsewhere.
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [error, setError] = useState("");

  const isOpen = !!event.registration_open;
  const hasCode = !!event.has_registration_code;
  const link = registrationLink(event.slug);

  const mut = useMutation({
    mutationFn: (v: { open: boolean; rotate: boolean }) => eventsApi.setRegistration(event.id, v.open, v.rotate),
    onSuccess: (res) => {
      setError("");
      // Cache only the non-secret flags; the code is deliberately dropped from the response.
      qc.setQueryData<EventDetail>(["event", event.id], (old) =>
        old ? { ...old, registration_open: res.registration_open, has_registration_code: res.has_registration_code } : old);
      qc.invalidateQueries({ queryKey: ["events"] });
      if (res.registration_code) setShownCode(res.registration_code);
      toast.success(res.registration_open ? "Registration is open" : "Registration is closed");
    },
    onError: (err) => {
      const m = eventErrorMessage(err, "Failed to update registration");
      setError(m);
      toast.error(m);
    },
    // Do not keep the secret in the mutation result held by the query client.
    gcTime: 0,
  });

  return (
    <section aria-labelledby="reg-h" className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h2 id="reg-h" className="text-sm font-semibold">Vendor registration</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOpen ? "bg-green-500/10 text-green-700" : "bg-muted text-muted-foreground"}`}>
          {isOpen ? "Open" : "Closed"}
        </span>
        <span className="text-xs text-muted-foreground">{hasCode ? "Join code set" : "No join code yet"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {isOpen ? (
          <Button size="sm" variant="outline" disabled={mut.isPending} onClick={() => mut.mutate({ open: false, rotate: false })}>Close registration</Button>
        ) : (
          <Button size="sm" disabled={mut.isPending} onClick={() => mut.mutate({ open: true, rotate: false })}>Open registration</Button>
        )}
        <Button size="sm" variant="outline" disabled={mut.isPending} onClick={() => (hasCode ? setConfirmRotate(true) : mut.mutate({ open: isOpen, rotate: true }))}>
          Rotate join code
        </Button>
      </div>
      {link ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Registration link:</span>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">{link}</code>
          <Button size="sm" variant="ghost" aria-label="Copy registration link" onClick={() => copy(link)}><Copy className="w-3.5 h-3.5" /></Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Set VITE_MANAGER_APP_URL to show the public registration link.</p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <AlertDialog open={confirmRotate} onOpenChange={setConfirmRotate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate the join code?</AlertDialogTitle>
            <AlertDialogDescription>The current code stops working immediately. Vendors who have not registered yet will need the new code.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current code</AlertDialogCancel>
            <AlertDialogAction onClick={() => mut.mutate({ open: isOpen, rotate: true })}>Rotate code</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={shownCode !== null} onOpenChange={(o) => !o && setShownCode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Vendor join code</DialogTitle>
            <DialogDescription>Shown once — share it with vendors now. It cannot be viewed again, only replaced by rotating.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted p-3">
            <code data-testid="join-code" className="text-lg font-mono tracking-wider">{shownCode}</code>
            <Button size="sm" variant="outline" onClick={() => shownCode && copy(shownCode)} className="gap-1.5"><Copy className="w-3.5 h-3.5" /> Copy code</Button>
          </div>
          <div className="flex justify-end"><Button onClick={() => setShownCode(null)}>Done</Button></div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
