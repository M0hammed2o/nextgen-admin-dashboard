import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Plus } from "lucide-react";
import { eventsApi } from "@/api/events";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { CreateEventModal } from "@/components/events/CreateEventModal";
import { EventStatusBadge } from "@/components/events/fields";

export default function EventsPage() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["events"], queryFn: () => eventsApi.list() });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Temporary events (souks): vendors, calendar and payments.</p>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Create event
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Venue</th>
                <th scope="col" className="text-right px-4 py-3 font-medium text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <p className="text-sm text-destructive mb-3">{error instanceof Error ? error.message : "Failed to load events"}</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
                  </td>
                </tr>
              ) : !data || data.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      icon={CalendarDays}
                      title="No events yet."
                      description="Create your first event to onboard vendors and take event payments."
                      action={{ label: "Create event", onClick: () => setCreateOpen(true) }}
                    />
                  </td>
                </tr>
              ) : (
                data.map((ev) => (
                  <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/events/${ev.id}`} className="hover:underline">{ev.name}</Link>
                    </td>
                    <td className="px-4 py-3"><EventStatusBadge status={ev.status} /></td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{ev.venue || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/events/${ev.id}`} aria-label={`Open ${ev.name}`}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateEventModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(ev) => { refetch(); navigate(`/events/${ev.id}`); }}
      />
    </div>
  );
}
