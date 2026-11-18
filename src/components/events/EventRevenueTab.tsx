import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { eventsApi } from "@/api/events";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRands } from "@/lib/events";

export function EventRevenueTab({ eventId }: { eventId: string }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["event-revenue", eventId],
    queryFn: () => eventsApi.revenue(eventId),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-destructive mb-3">{error instanceof Error ? error.message : "Failed to load revenue"}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const cats = Object.entries(data.by_category);
  const chartData = data.by_day.map((d) => ({ day: d.day, rands: d.paid_cents_attributed / 100 }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-xl font-semibold mt-1">{formatRands(data.paid_cents)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-xl font-semibold mt-1">{formatRands(data.outstanding_cents)}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">All amounts are VAT-inclusive.</p>

      <section className="bg-card border border-border rounded-xl overflow-x-auto" aria-label="Revenue by category">
        <table className="w-full text-sm">
          <caption className="sr-only">Revenue by category</caption>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
              <th scope="col" className="text-right px-4 py-3 font-medium text-muted-foreground">Vendors</th>
              <th scope="col" className="text-right px-4 py-3 font-medium text-muted-foreground">Paid</th>
              <th scope="col" className="text-right px-4 py-3 font-medium text-muted-foreground">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {cats.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-muted-foreground py-6">No category revenue yet.</td></tr>
            ) : cats.map(([cat, v]) => (
              <tr key={cat} className="border-b border-border last:border-0">
                <td className="px-4 py-2 font-medium">{cat}</td>
                <td className="px-4 py-2 text-right">{v.vendors}</td>
                <td className="px-4 py-2 text-right">{formatRands(v.paid_cents)}</td>
                <td className="px-4 py-2 text-right">{formatRands(v.outstanding_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {chartData.length > 0 && (
        <section className="bg-card border border-border rounded-xl p-4" aria-label="Paid revenue by day chart">
          <h2 className="text-sm font-semibold mb-3">Paid revenue attributed per day</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number) => formatRands(Math.round(v * 100))} />
                <Bar dataKey="rands" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="bg-card border border-border rounded-xl overflow-x-auto" aria-label="Revenue by day">
        <table className="w-full text-sm">
          <caption className="sr-only">Revenue by day</caption>
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th scope="col" className="text-left px-4 py-3 font-medium text-muted-foreground">Day</th>
              <th scope="col" className="text-right px-4 py-3 font-medium text-muted-foreground">Vendors covered</th>
              <th scope="col" className="text-right px-4 py-3 font-medium text-muted-foreground">Paid (attributed)</th>
            </tr>
          </thead>
          <tbody>
            {data.by_day.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-muted-foreground py-6">No days on the calendar yet.</td></tr>
            ) : data.by_day.map((d) => (
              <tr key={d.day} className="border-b border-border last:border-0">
                <td className="px-4 py-2 tabular-nums">{d.day}</td>
                <td className="px-4 py-2 text-right">{d.vendors_covered}</td>
                <td className="px-4 py-2 text-right">{formatRands(d.paid_cents_attributed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
