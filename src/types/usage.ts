export interface UsageRecord {
  business_id: string;
  total_messages: number;
  total_llm_calls: number;
  total_llm_cost_cents: number;
  total_orders: number;
  total_revenue_cents: number;
}
