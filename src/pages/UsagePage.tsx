import { useEffect, useState } from "react";
import { usageApi } from "@/api/usage";
import { businessesApi } from "@/api/businesses";
import type { UsageRecord } from "@/types/usage";
import type { Business } from "@/types/business";
import { formatCents, formatNumber, formatDateForApi } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function UsagePage() {
  const today = new Date();
  const thirtyAgo = new Date(today);
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(formatDateForApi(thirtyAgo));
  const [endDate, setEndDate] = useState(formatDateForApi(today));
  const [businessId, setBusinessId] = useState("");
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    businessesApi.list({ per_page: 100 }).then(setBusinesses).catch(() => {});
  }, []);

  const fetchUsage = () => {
    setLoading(true);
    usageApi.get({ start_date: startDate, end_date: endDate, business_id: businessId || undefined })
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsage(); }, []);

  const totals = records.reduce(
    (acc, r) => ({
      messages: acc.messages + r.total_messages,
      llm: acc.llm + r.total_llm_calls,
      cost: acc.cost + r.total_llm_cost_cents,
      orders: acc.orders + r.total_orders,
      revenue: acc.revenue + r.total_revenue_cents,
    }),
    { messages: 0, llm: 0, cost: 0, orders: 0, revenue: 0 }
  );

  const businessName = (id: string) => businesses.find((b) => b.id === id)?.name || id.slice(0, 8);

  const chartData = records.map((r) => ({
    name: businessName(r.business_id),
    Messages: r.total_messages,
    "LLM Calls": r.total_llm_calls,
    Orders: r.total_orders,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Business (optional)</label>
          <select
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All Businesses</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <Button onClick={fetchUsage} disabled={loading}>{loading ? "Loading…" : "Fetch"}</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Messages", value: formatNumber(totals.messages) },
          { label: "LLM Calls", value: formatNumber(totals.llm) },
          { label: "LLM Cost", value: formatCents(totals.cost) },
          { label: "Orders", value: formatNumber(totals.orders) },
          { label: "Revenue", value: formatCents(totals.revenue) },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : records.length > 0 ? (
        <>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Usage by Business</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="Messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="LLM Calls" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Orders" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Business</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Messages</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">LLM Calls</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">LLM Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Orders</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.business_id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{businessName(r.business_id)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(r.total_messages)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(r.total_llm_calls)}</td>
                    <td className="px-4 py-3 text-right">{formatCents(r.total_llm_cost_cents)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(r.total_orders)}</td>
                    <td className="px-4 py-3 text-right">{formatCents(r.total_revenue_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">No usage data for the selected period.</p>
        </div>
      )}
    </div>
  );
}
