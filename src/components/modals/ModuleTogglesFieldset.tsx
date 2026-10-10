import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MODULE_FLAGS, type ModuleFlagKey } from "@/lib/modules";
import { Switch } from "@/components/ui/switch";

interface Props {
  /** Only keys the admin has explicitly chosen to change should appear here. */
  changes: Partial<Record<ModuleFlagKey, boolean>>;
  onChange: (key: ModuleFlagKey, value: boolean | undefined) => void;
  /**
   * The module's real current on/off state, when the caller has it (the
   * backend's BusinessAdminResponse/BusinessOnboarderResponse now both
   * return these -- see the Business/OnboardingBusiness type comments).
   * A flag omitted here (or explicitly undefined) is rendered as the old
   * tri-state Leave/On/Off control instead, since this UI genuinely
   * doesn't know its current value (e.g. at business-creation time, before
   * the business exists at all).
   */
  current?: Partial<Record<ModuleFlagKey, boolean>>;
  /**
   * Defaults to false (safe-by-default/default-deny): a flag with
   * `superAdminOnly: true` (delivery_platforms_enabled/uber_eats_enabled/
   * mrd_enabled today) is rendered as a locked, read-only row -- current
   * state shown if known, no Switch/tri-state control, `onChange` never
   * called for it -- unless the caller explicitly passes `isSuperAdmin`.
   * Only pass this from a call site that is ITSELF gated to SUPER_ADMIN
   * (e.g. EditBusinessModal/CreateBusinessModal, reachable only via
   * `/businesses` and `/businesses/:id`, both RoleRoute-gated to
   * SUPER_ADMIN in App.tsx). Call sites reachable by BOTH roles
   * (CreateOnboardingBusinessModal, OnboardingWorkspacePage) deliberately
   * never pass this -- see those files' own comments for why even a real
   * SUPER_ADMIN edits delivery entitlements from the fuller Businesses page
   * instead, not from the reduced onboarding workspace.
   */
  isSuperAdmin?: boolean;
}

/**
 * Per-module control. When the caller knows a flag's current value
 * (`current[key]` is a boolean), this renders a normal on/off Switch
 * initialised from it -- flipping it only adds the key to `changes` when
 * the new value actually differs from `current`, so an untouched switch
 * still sends nothing in the PATCH (exclude_unset=True on the backend).
 *
 * When the current value is unknown, this falls back to the original
 * tri-state Leave (don't send this field at all) / On / Off control --
 * defaulting an unknown flag to "off" and saving would silently disable a
 * module this UI can't see is already enabled, so "Leave" is the only safe
 * default in that case.
 */
/**
 * Every flag's `description` can run to 2-3 sentences (the commercial
 * entitlements especially -- see lib/modules.ts's own comments on why each
 * warning exists). Shown in full, 8+ rows of that is what made this modal
 * "extremely long" -- but the warnings themselves (Uber approval, "commercial
 * entitlement only") are exactly the text that must never get cut, just
 * deferred. So: collapsed by default, one line, with a "More info" toggle
 * per row that reveals the SAME description text untouched -- no flag's
 * wording is shortened, paraphrased, or split into a separate "short"
 * variant that could drift from the real one in lib/modules.ts.
 */
function Description({ flagKey, text }: { flagKey: ModuleFlagKey; text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="min-w-0">
      <p className={expanded ? "text-xs text-muted-foreground" : "text-xs text-muted-foreground truncate"}>
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
        aria-expanded={expanded}
        aria-controls={`module-desc-${flagKey}`}
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? "Less info" : "More info"}
      </button>
    </div>
  );
}

export function ModuleTogglesFieldset({ changes, onChange, current, isSuperAdmin = false }: Props) {
  const editableFlags = MODULE_FLAGS.filter((f) => !f.superAdminOnly || isSuperAdmin);
  const anyUnknown = editableFlags.some((f) => current?.[f.key] === undefined);

  return (
    <div className="space-y-1">
      {anyUnknown && (
        <p className="text-xs text-muted-foreground pb-1">
          {current
            ? "Some modules' current on/off state isn't known here -- pick On/Off only for the ones you want to change, and leave the rest on \"Leave\" so you don't overwrite a setting you can't see."
            : "This business doesn't exist yet, so there's no current state to show -- pick On/Off only for the modules you want to turn on at creation."}
        </p>
      )}
      {MODULE_FLAGS.map((flag) => {
        // Locked row: current state (if known) shown for information only --
        // no Switch/tri-state control, onChange never called. See Props.isSuperAdmin.
        if (flag.superAdminOnly && !isSuperAdmin) {
          const known = current?.[flag.key];
          return (
            <div key={flag.key} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0 opacity-90">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{flag.label}</p>
                <Description flagKey={flag.key} text={flag.description} />
                <p className="text-xs text-warning mt-0.5">Only a NextGen super admin can change this.</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  known === undefined
                    ? "bg-muted text-muted-foreground"
                    : known
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {known === undefined ? "Unknown" : known ? "On" : "Off"}
              </span>
            </div>
          );
        }

        const known = current?.[flag.key];
        if (known !== undefined) {
          const value = changes[flag.key] ?? known;
          return (
            <div key={flag.key} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{flag.label}</p>
                <Description flagKey={flag.key} text={flag.description} />
              </div>
              <Switch
                checked={value}
                onCheckedChange={(v) => onChange(flag.key, v === known ? undefined : v)}
                aria-label={flag.label}
                className="mt-0.5 shrink-0"
              />
            </div>
          );
        }

        const value = changes[flag.key];
        return (
          <div key={flag.key} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{flag.label}</p>
              <Description flagKey={flag.key} text={flag.description} />
            </div>
            <div className="flex gap-1 shrink-0">
              {([
                { opt: "leave", isActive: value === undefined, next: undefined, text: "Leave" },
                { opt: "on", isActive: value === true, next: true, text: "On" },
                { opt: "off", isActive: value === false, next: false, text: "Off" },
              ] as const).map(({ opt, isActive, next, text }) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(flag.key, next)}
                  className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
