import { useState } from "react";
import { eventsApi } from "@/api/events";
import type { EventDay, EventDetail } from "@/types/events";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dayRange, eventErrorMessage, mergeRange, randsToCents } from "@/lib/events";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (event: EventDetail) => void;
}

const DEFAULT_TZ = "Africa/Johannesburg";

/** Create an event (POST /admin/events). Rates are entered in rand and sent as cents. */
export function CreateEventModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TZ);
  const [foodRate, setFoodRate] = useState("100.00");
  const [clothingRate, setClothingRate] = useState("50.00");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const reset = () => {
    setName(""); setVenue(""); setTimezone(DEFAULT_TZ); setFoodRate("100.00"); setClothingRate("50.00");
    setStart(""); setEnd(""); setNotes(""); setFormError("");
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (name.trim().length < 2) return setFormError("Event name must be at least 2 characters");
    const food = randsToCents(foodRate);
    const clothing = randsToCents(clothingRate);
    if (food === null || clothing === null) return setFormError("Day rates must be valid rand amounts, e.g. 100.00");
    if (food > 1_000_000 || clothing > 1_000_000) return setFormError("Day rates are capped at R10 000.00");
    let days: EventDay[] = [];
    if (start || end) {
      if (!start || !end) return setFormError("Give both a first and a last day, or neither");
      if (dayRange(start, end).length === 0) return setFormError("The last day must not be before the first day");
      days = mergeRange([], start, end);
      if (days.length > 366) return setFormError("An event calendar can have at most 366 days");
    }
    setLoading(true);
    try {
      const created = await eventsApi.create({
        name: name.trim(),
        venue: venue.trim() || null,
        timezone: timezone.trim() || DEFAULT_TZ,
        food_day_rate_cents: food,
        clothing_day_rate_cents: clothing,
        days,
        notes: notes.trim() || null,
      });
      toast.success(`Event "${created.name}" created`);
      onCreated(created);
      handleClose();
    } catch (err: unknown) {
      const message = eventErrorMessage(err, "Failed to create event");
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
          <DialogDescription>
            A new event starts as a draft. Day rates are VAT-inclusive, per billable event day.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-name">Name</Label>
            <Input id="ev-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cape Town Night Souk" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-venue">Venue</Label>
            <Input id="ev-venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-tz">Timezone</Label>
            <Input id="ev-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-food">Food day rate (R)</Label>
              <Input id="ev-food" inputMode="decimal" value={foodRate} onChange={(e) => setFoodRate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-clothing">Clothing day rate (R)</Label>
              <Input id="ev-clothing" inputMode="decimal" value={clothingRate} onChange={(e) => setClothingRate(e.target.value)} />
            </div>
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Calendar (optional)</legend>
            <p className="text-xs text-muted-foreground">Every day in the range is created billable. You can fine-tune it later in the calendar editor.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-start">First day</Label>
                <Input id="ev-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-end">Last day</Label>
                <Input id="ev-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="ev-notes">Notes</Label>
            <Textarea id="ev-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create event"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
