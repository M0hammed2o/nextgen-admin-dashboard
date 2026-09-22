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
export function ModuleTogglesFieldset({ changes, onChange, current }: Props) {
  const anyUnknown = MODULE_FLAGS.some((f) => current?.[f.key] === undefined);

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
        const known = current?.[flag.key];
        if (known !== undefined) {
          const value = changes[flag.key] ?? known;
          return (
            <div key={flag.key} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{flag.label}</p>
                <p className="text-xs text-muted-foreground">{flag.description}</p>
              </div>
              <Switch
                checked={value}
                onCheckedChange={(v) => onChange(flag.key, v === known ? undefined : v)}
                aria-label={flag.label}
              />
            </div>
          );
        }

        const value = changes[flag.key];
        return (
          <div key={flag.key} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium">{flag.label}</p>
              <p className="text-xs text-muted-foreground">{flag.description}</p>
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
