import { useRef, useState } from "react";
import { AlertTriangle, Copy, Download } from "lucide-react";
import { eventsApi } from "@/api/events";
import type { BulkRowProblem, BulkVendorResponse, BulkVendorResult, BulkVendorRow, VendorCategory } from "@/types/events";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "./fields";
import { csvCell, eventErrorMessage, formatRands } from "@/lib/events";
import { toast } from "sonner";

type Mode = "csv" | "rows";
type Stage = "input" | "preview" | "done";

interface RowDraft {
  id: string; // stable, generated once at creation (never derived from editable fields)
  category: VendorCategory;
  business_name: string;
  owner_email: string;
  owner_full_name: string;
  stall_code: string;
  existing_business_id: string;
  starts_on: string;
  ends_on: string;
}

let rowSeq = 0;
const newRow = (): RowDraft => ({
  id: `row-${++rowSeq}-${Math.random().toString(36).slice(2, 8)}`,
  category: "FOOD", business_name: "", owner_email: "", owner_full_name: "",
  stall_code: "", existing_business_id: "", starts_on: "", ends_on: "",
});

const CSV_HINT = "category,stall_code,business_name,owner_email,owner_full_name,starts_on,ends_on";
const MAX_ROWS = 100;

function toApiRows(rows: RowDraft[]): BulkVendorRow[] {
  return rows.map((r) => {
    const out: BulkVendorRow = { category: r.category };
    if (r.stall_code.trim()) out.stall_code = r.stall_code.trim();
    if (r.existing_business_id.trim()) out.existing_business_id = r.existing_business_id.trim();
    else {
      out.business_name = r.business_name.trim();
      out.owner_email = r.owner_email.trim();
      if (r.owner_full_name.trim()) out.owner_full_name = r.owner_full_name.trim();
    }
    if (r.starts_on) out.starts_on = r.starts_on;
    if (r.ends_on) out.ends_on = r.ends_on;
    return out;
  });
}

function rowProblems(err: unknown): BulkRowProblem[] | null {
  const e = err as { code?: string; details?: { rows?: BulkRowProblem[] } };
  return e?.code === "BULK_VALIDATION_FAILED" && Array.isArray(e.details?.rows) ? e.details!.rows! : null;
}

function credentialsCsv(vendors: BulkVendorResult[]): string {
  const header = ["business_code", "category", "stall_code", "owner_email", "temporary_password"].map(csvCell).join(",");
  const lines = vendors
    .filter((v) => v.owner_temporary_password)
    .map((v) => [v.business_code, v.category, v.stall_code, v.owner_email, v.owner_temporary_password].map((x) => csvCell(x as string | null)).join(","));
  return [header, ...lines].join("\r\n");
}

interface Props {
  eventId: string;
  open: boolean;
  onClose: () => void;
  /** Called once a real import succeeded (to refresh lists). Never receives the passwords. */
  onImported: () => void;
}

/**
 * Bulk vendor onboarding. Always dry-run first; the real import only runs
 * from the preview. Owner temporary passwords exist ONLY in this component's
 * state: never persisted, and wiped when the dialog closes.
 */
export function BulkOnboardDialog({ eventId, open, onClose, onImported }: Props) {
  const [mode, setMode] = useState<Mode>("csv");
  const [stage, setStage] = useState<Stage>("input");
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<RowDraft[]>(() => [newRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [problems, setProblems] = useState<BulkRowProblem[]>([]);
  const [preview, setPreview] = useState<BulkVendorResponse | null>(null);
  const [created, setCreated] = useState<BulkVendorResult[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setMode("csv"); setStage("input"); setCsvText(""); setRows([newRow()]); setBusy(false);
    setError(""); setProblems([]); setPreview(null); setCreated(null); // wipes the one-time passwords
    if (fileRef.current) fileRef.current.value = "";
  };
  const handleClose = () => { reset(); onClose(); };

  // Any edit invalidates a previous dry run: the confirm button must never import something other than what was previewed.
  const edited = () => { if (stage === "preview") setStage("input"); setPreview(null); setProblems([]); setError(""); };

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError("");
    try {
      let res: BulkVendorResponse;
      if (mode === "csv") {
        if (!csvText.trim()) { setError("Paste a CSV or choose a .csv file first"); return; }
        res = await eventsApi.bulkOnboardCsv(eventId, csvText, dryRun);
      } else {
        res = await eventsApi.bulkOnboard(eventId, toApiRows(rows), dryRun);
      }
      if (dryRun) {
        setPreview(res);
        setProblems([]);
        setStage("preview");
      } else {
        setCreated(res.vendors);
        setStage("done");
        toast.success(`${res.vendors.length} vendor${res.vendors.length === 1 ? "" : "s"} created`);
        onImported();
      }
    } catch (err) {
      const p = rowProblems(err);
      if (p) {
        setProblems(p);
        setError("Nothing was created. Fix the rows below and run the check again.");
      } else {
        setError(eventErrorMessage(err, "Import failed"));
      }
      setStage("input");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) { setError("That file is larger than 2 MB"); return; }
    setCsvText(await file.text());
    edited();
  };

  const patchRow = (id: string, patch: Partial<RowDraft>) => { setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r))); edited(); };

  const copyCredentials = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(credentialsCsv(created));
      toast.success("Credentials copied");
    } catch {
      toast.error("Could not copy automatically. Use Download CSV instead.");
    }
  };

  const downloadCredentials = () => {
    if (!created) return;
    const url = URL.createObjectURL(new Blob([credentialsCsv(created)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendor-credentials.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const errorsByRow = new Map(problems.map((p) => [p.row, p.errors]));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-4xl max-h-[92vh] overflow-y-auto"
        onInteractOutside={(e) => { if (stage === "done") e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>Onboard vendors</DialogTitle>
          <DialogDescription>
            Up to {MAX_ROWS} vendors per import. Every row is checked first; if one row is wrong, nothing is created.
          </DialogDescription>
        </DialogHeader>

        {stage === "done" && created ? (
          <div className="space-y-4">
            <div role="alert" className="flex gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-700" aria-hidden />
              <div>
                <p className="font-semibold">Shown once — copy now</p>
                <p>These temporary passwords are not stored anywhere and cannot be shown again. Copy or download them before closing this window.</p>
              </div>
            </div>
            <p className="text-sm">{created.length} vendor{created.length === 1 ? "" : "s"} created.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={copyCredentials}><Copy className="w-4 h-4" /> Copy credentials</Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadCredentials}><Download className="w-4 h-4" /> Download CSV</Button>
            </div>
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {["Business code", "Category", "Stall", "Owner email", "Temporary password"].map((h) => (
                      <th key={h} scope="col" className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {created.map((v) => (
                    <tr key={v.vendor_id ?? v.business_id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{v.business_code}</td>
                      <td className="px-3 py-2">{v.category}</td>
                      <td className="px-3 py-2">{v.stall_code ?? "—"}</td>
                      <td className="px-3 py-2">{v.owner_email ?? "—"}</td>
                      <td className="px-3 py-2 font-mono select-all">{v.owner_temporary_password ?? "Existing login (no new password)"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end"><Button onClick={handleClose}>I have saved these, close</Button></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2" role="group" aria-label="Input method">
              <Button type="button" size="sm" variant={mode === "csv" ? "default" : "outline"} aria-pressed={mode === "csv"} onClick={() => { setMode("csv"); edited(); }}>CSV</Button>
              <Button type="button" size="sm" variant={mode === "rows" ? "default" : "outline"} aria-pressed={mode === "rows"} onClick={() => { setMode("rows"); edited(); }}>Row editor</Button>
            </div>

            {mode === "csv" ? (
              <div className="space-y-2">
                <Label htmlFor="bulk-csv">CSV</Label>
                <Textarea id="bulk-csv" rows={8} className="font-mono text-xs" value={csvText} onChange={(e) => { setCsvText(e.target.value); edited(); }} placeholder={`${CSV_HINT}\nFOOD,A1,Tasty Bites,owner@example.com,Jo Owner,2026-12-01,2026-12-05`} />
                <p className="text-xs text-muted-foreground">Header row required. Columns: {CSV_HINT}, existing_business_id. The category column is required.</p>
                <div>
                  <Label htmlFor="bulk-file" className="text-sm">Or upload a .csv file</Label>
                  <input id="bulk-file" ref={fileRef} type="file" accept=".csv,text/csv" className="block text-sm mt-1" onChange={(e) => onFile(e.target.files?.[0])} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((r, i) => (
                  <fieldset key={r.id} className="border border-border rounded-lg p-3 space-y-2">
                    <legend className="text-xs font-medium px-1">Vendor {i + 1}</legend>
                    <div className="grid sm:grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor={`r-cat-${r.id}`} className="text-xs">Category</Label>
                        <NativeSelect id={`r-cat-${r.id}`} className="w-full" value={r.category} onChange={(e) => patchRow(r.id, { category: e.target.value as VendorCategory })}>
                          <option value="FOOD">Food</option>
                          <option value="CLOTHING">Clothing</option>
                        </NativeSelect>
                      </div>
                      <div>
                        <Label htmlFor={`r-name-${r.id}`} className="text-xs">Business name</Label>
                        <Input id={`r-name-${r.id}`} value={r.business_name} onChange={(e) => patchRow(r.id, { business_name: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor={`r-email-${r.id}`} className="text-xs">Owner email</Label>
                        <Input id={`r-email-${r.id}`} type="email" value={r.owner_email} onChange={(e) => patchRow(r.id, { owner_email: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor={`r-owner-${r.id}`} className="text-xs">Owner full name</Label>
                        <Input id={`r-owner-${r.id}`} value={r.owner_full_name} onChange={(e) => patchRow(r.id, { owner_full_name: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor={`r-stall-${r.id}`} className="text-xs">Stall</Label>
                        <Input id={`r-stall-${r.id}`} value={r.stall_code} onChange={(e) => patchRow(r.id, { stall_code: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor={`r-exist-${r.id}`} className="text-xs">Existing business ID (returning vendor)</Label>
                        <Input id={`r-exist-${r.id}`} value={r.existing_business_id} onChange={(e) => patchRow(r.id, { existing_business_id: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor={`r-from-${r.id}`} className="text-xs">Quote from</Label>
                        <Input id={`r-from-${r.id}`} type="date" value={r.starts_on} onChange={(e) => patchRow(r.id, { starts_on: e.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor={`r-to-${r.id}`} className="text-xs">Quote to</Label>
                        <Input id={`r-to-${r.id}`} type="date" value={r.ends_on} onChange={(e) => patchRow(r.id, { ends_on: e.target.value })} />
                      </div>
                    </div>
                    {errorsByRow.has(i + 1) && (
                      <ul className="text-sm text-destructive list-disc pl-5">
                        {errorsByRow.get(i + 1)!.map((m, k) => <li key={k}>{m}</li>)}
                      </ul>
                    )}
                    {rows.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setRows((cur) => cur.filter((x) => x.id !== r.id)); edited(); }}>Remove vendor {i + 1}</Button>
                    )}
                  </fieldset>
                ))}
                <Button type="button" variant="outline" size="sm" disabled={rows.length >= MAX_ROWS} onClick={() => { setRows((cur) => [...cur, newRow()]); edited(); }}>Add vendor</Button>
              </div>
            )}

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            {mode === "csv" && problems.length > 0 && (
              <div className="border border-destructive/40 rounded-lg overflow-hidden" aria-label="Row errors">
                <table className="w-full text-sm">
                  <thead><tr className="bg-destructive/10"><th scope="col" className="text-left px-3 py-2 w-20">Row</th><th scope="col" className="text-left px-3 py-2">Problem</th></tr></thead>
                  <tbody>
                    {problems.map((p) => (
                      <tr key={p.row} className="border-t border-destructive/20">
                        <td className="px-3 py-2">{p.row}</td>
                        <td className="px-3 py-2"><ul className="list-disc pl-4">{p.errors.map((m, k) => <li key={k}>{m}</li>)}</ul></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {mode === "rows" && problems.length > 0 && (
              <p className="text-xs text-muted-foreground">Row numbers refer to the vendors above, in order.</p>
            )}

            {stage === "preview" && preview && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-700">Check passed: {preview.vendors.length} vendor{preview.vendors.length === 1 ? "" : "s"} ready. Nothing has been created yet.</p>
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-sm" aria-label="Dry run preview">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {["#", "Category", "Stall", "Quote"].map((h) => <th key={h} scope="col" className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.vendors.map((v, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2">{v.category}</td>
                          <td className="px-3 py-2">{v.stall_code ?? "—"}</td>
                          <td className="px-3 py-2">{v.amount_cents === null ? "No quote" : `${formatRands(v.amount_cents)} (${v.billable_days} days)`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              {stage === "preview" ? (
                <Button disabled={busy} onClick={() => run(false)}>{busy ? "Creating…" : `Confirm and create ${preview?.vendors.length ?? 0} vendors`}</Button>
              ) : (
                <Button disabled={busy} onClick={() => run(true)}>{busy ? "Checking…" : "Run check (dry run)"}</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
