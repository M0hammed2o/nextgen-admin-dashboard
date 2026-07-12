import { useState } from "react";
import { aiEmailsApi } from "@/api/aiEmails";
import type { ImportPreviewResponse } from "@/types/aiEmails";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  valid: "bg-success/10 text-success",
  duplicate: "bg-warning/10 text-warning",
  invalid: "bg-destructive/10 text-destructive",
};

export function ImportLeadsModal({ open, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  const reset = () => {
    setFile(null);
    setPreview(null);
    setSkipped(new Set());
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = async (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    setPreviewing(true);
    try {
      const result = await aiEmailsApi.previewImport(selected);
      setPreview(result);
      setSkipped(new Set(result.preview_rows.filter((r) => r.status === "invalid").map((r) => r.row_number)));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to preview file");
      setFile(null);
    } finally {
      setPreviewing(false);
    }
  };

  const toggleRow = (rowNumber: number) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const result = await aiEmailsApi.confirmImport({
        batch_id: preview.batch_id,
        skip_row_numbers: Array.from(skipped),
        duplicate_strategy: "skip",
      });
      toast.success(
        `Import complete — ${result.created_count} created, ${result.updated_count} updated, ${result.skipped_count} skipped`
      );
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm import");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Leads</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:bg-muted/40 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium">Click to select a .xlsx or .csv file</span>
              <span className="text-xs text-muted-foreground">Nothing is saved until you confirm on the next step</span>
              <input
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />
            </label>
            {previewing && (
              <p className="text-sm text-muted-foreground text-center">Parsing {file?.name}…</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">{preview.total_rows} rows</Badge>
              <Badge className="bg-success/10 text-success hover:bg-success/10">{preview.valid_rows} valid</Badge>
              <Badge className="bg-warning/10 text-warning hover:bg-warning/10">{preview.duplicate_rows} duplicates</Badge>
              <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">{preview.rejected_rows} rejected</Badge>
              <span className="text-xs text-muted-foreground ml-auto">Uncheck a row to exclude it from import</span>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                    <tr>
                      <th className="px-3 py-2 text-left w-10"></th>
                      <th className="px-3 py-2 text-left">Row</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Business Name</th>
                      <th className="px-3 py-2 text-left">City</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.preview_rows.map((row) => (
                      <tr key={row.row_number} className="border-t border-border">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={!skipped.has(row.row_number)}
                            disabled={row.status === "invalid"}
                            onChange={() => toggleRow(row.row_number)}
                          />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.row_number}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[row.status]}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-[160px] truncate">{String(row.data.business_name ?? "")}</td>
                        <td className="px-3 py-2">{String(row.data.city ?? "")}</td>
                        <td className="px-3 py-2">{String(row.data.email ?? "")}</td>
                        <td className="px-3 py-2 max-w-[220px] truncate text-muted-foreground">
                          {[...row.errors, ...row.warnings, row.duplicate_reason].filter(Boolean).join("; ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={reset} className="gap-1.5">
                <X className="w-4 h-4" /> Choose a different file
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleConfirm} disabled={confirming}>
                  {confirming ? "Importing…" : `Confirm Import (${preview.total_rows - skipped.size})`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
