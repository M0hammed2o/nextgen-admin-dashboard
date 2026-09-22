import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

/** The ONE empty-state pattern for list/table pages across the admin suite --
 * icon + message + (optional) relevant action, instead of a blank table or a
 * lone line of muted text. Keep `title` as the exact string a page's test may
 * assert on; `description` and `action` are additive. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-4", className)}>
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && (
        <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
