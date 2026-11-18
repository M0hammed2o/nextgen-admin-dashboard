import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { eventsApi } from "@/api/events";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventStatusBadge } from "@/components/events/fields";
import { EventOverviewTab } from "@/components/events/EventOverviewTab";
import { EventCalendarTab } from "@/components/events/EventCalendarTab";
import { EventVendorsTab } from "@/components/events/EventVendorsTab";
import { EventRevenueTab } from "@/components/events/EventRevenueTab";

export default function EventDetailPage() {
  const { id = "" } = useParams();
  const { data: event, isLoading, error, refetch } = useQuery({
    queryKey: ["event", id],
    queryFn: () => eventsApi.get(id),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (error || !event) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-destructive mb-3">{error instanceof Error ? error.message : "Event not found"}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          <Button variant="ghost" size="sm" asChild><Link to="/events">Back to events</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <Link to="/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Events
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <h1 className="text-xl font-semibold">{event.name}</h1>
          <EventStatusBadge status={event.status} />
          {event.venue && <span className="text-sm text-muted-foreground">{event.venue}</span>}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><EventOverviewTab key={event.id} event={event} /></TabsContent>
        <TabsContent value="calendar" className="mt-4"><EventCalendarTab key={event.id} event={event} /></TabsContent>
        <TabsContent value="vendors" className="mt-4"><EventVendorsTab event={event} /></TabsContent>
        <TabsContent value="revenue" className="mt-4"><EventRevenueTab eventId={event.id} /></TabsContent>
      </Tabs>
    </div>
  );
}
