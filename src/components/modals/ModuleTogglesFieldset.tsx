import { MODULE_FLAGS, type ModuleFlagKey } from "@/lib/modules";

interface Props {
  /** Only keys the admin has explicitly chosen to change should appear here. */
  changes: Partial<Record<ModuleFlagKey, boolean>>;
  onChange: (key: ModuleFlagKey, value: boolean | undefined) => void;
}

/**
 * A tri-state control per module: Leave (don't send this field at all) / On / Off.
 *
 * This is deliberately NOT a plain on/off Switch defaulted to "off" -- the
 * API never tells this UI whether a module is currently on, so defaulting
 * to "off" and saving would silently disable a module an admin can't see is
 * already enabled. "Leave" is the only safe default; it must map to the key
 * being entirely absent from the PATCH payload (see UpdateBusinessRequest's
 * comment) so the backend's exclude_unset=True leaves the real value alone.
 */
export function ModuleTogglesFieldset({ changes, onChange }: Props) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground pb-1">
        The platform API doesn't return each module's current on/off state yet (a known backend gap).
        These are write-only: pick "On" or "Off" only for the modules you actually want to change, and
        leave the rest on "Leave" so you don't accidentally overwrite a setting you can't see.
      </p>
      {MODULE_FLAGS.map((flag) => {
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
