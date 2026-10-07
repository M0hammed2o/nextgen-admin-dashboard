import { Zap } from "lucide-react";

/**
 * The admin suite's own identity lockup.
 *
 * Shared by the desktop sidebar AND the mobile drawer. Those two previously
 * kept separate copies of this markup, the same way they kept separate copies
 * of the nav list -- and that duplication is exactly how "AI Emails" ended up
 * in one and not the other (see NAV_ITEMS in lib/navigation.ts).
 *
 * This deliberately says NEXTGEN, never the client's restaurant brand. The
 * admin suite has no BrandProvider and no lib/brand.ts precisely so a tenant's
 * colours can never reach this plane (see index.css's note and KNOWN_BUGS.md
 * BUG-0118, where the admin suite had drifted onto the restaurant palette).
 * An operator looking at this screen is acting ACROSS tenants; it must never
 * look like it belongs to one of them.
 */
export function AdminWordmark() {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary/20 shrink-0">
        <Zap className="w-4 h-4 text-sidebar-primary" />
      </div>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-semibold text-sidebar-accent-foreground tracking-tight truncate">
          NextGen
        </span>
        <span className="block text-[11px] font-medium text-sidebar-foreground/70 tracking-wide uppercase truncate">
          Control Centre
        </span>
      </span>
    </div>
  );
}
