import { apiClient } from "./client";
import type {
  BulkVendorResponse,
  BulkVendorRow,
  CreateEventRequest,
  EventDay,
  EventDetail,
  EventRevenue,
  EventStatus,
  EventSummary,
  UpdateEventRequest,
  VendorListParams,
  VendorListResponse,
  EventVendorItem,
} from "@/types/events";

// Mounted at API_V1_PREFIX ("/v1/admin") + the router's own "/admin/events",
// i.e. the same double "admin" as /v1/admin/admin/businesses.
// (API_REFERENCE.md abbreviates this to /v1/admin/events; the code is the truth.)
const BASE = "/v1/admin/admin/events";

export const eventsApi = {
  list(): Promise<EventSummary[]> {
    return apiClient.get<EventSummary[]>(BASE);
  },
  get(id: string): Promise<EventDetail> {
    return apiClient.get<EventDetail>(`${BASE}/${id}`);
  },
  create(data: CreateEventRequest): Promise<EventDetail> {
    return apiClient.post<EventDetail>(BASE, data);
  },
  update(id: string, data: UpdateEventRequest): Promise<EventDetail> {
    return apiClient.patch<EventDetail>(`${BASE}/${id}`, data);
  },
  setStatus(id: string, status: EventStatus): Promise<EventDetail> {
    return apiClient.post<EventDetail>(`${BASE}/${id}/status`, { status });
  },
  replaceCalendar(id: string, days: EventDay[]): Promise<EventDetail> {
    return apiClient.put<EventDetail>(`${BASE}/${id}/calendar`, { days });
  },
  async listVendors(id: string, p: VendorListParams): Promise<VendorListResponse> {
    const q = new URLSearchParams();
    if (p.status) q.set("status", p.status);
    if (p.category) q.set("category", p.category);
    if (p.q) q.set("q", p.q);
    q.set("limit", String(p.limit));
    q.set("offset", String(p.offset));
    const res = await apiClient.get<VendorListResponse | EventVendorItem[]>(`${BASE}/${id}/vendors?${q.toString()}`);
    // Tolerate the pre-pagination bare-array shape.
    return Array.isArray(res) ? { items: res, total: res.length } : res;
  },
  bulkOnboard(id: string, vendors: BulkVendorRow[], dryRun: boolean): Promise<BulkVendorResponse> {
    return apiClient.post<BulkVendorResponse>(`${BASE}/${id}/vendors/bulk`, { vendors, dry_run: dryRun });
  },
  bulkOnboardCsv(id: string, csvText: string, dryRun: boolean): Promise<BulkVendorResponse> {
    return apiClient.post<BulkVendorResponse>(`${BASE}/${id}/vendors/bulk-csv`, { csv_text: csvText, dry_run: dryRun });
  },
  setStall(id: string, vendorId: string, stallCode: string): Promise<unknown> {
    return apiClient.patch(`${BASE}/${id}/vendors/${vendorId}`, { stall_code: stallCode });
  },
  quoteSubscription(id: string, vendorId: string, startsOn: string, endsOn: string) {
    return apiClient.post<{ id: string; status: string; billable_days: number; amount_cents: number }>(
      `${BASE}/${id}/vendors/${vendorId}/subscriptions`,
      { starts_on: startsOn, ends_on: endsOn },
    );
  },
  markPaid(id: string, subscriptionId: string, paymentReference: string) {
    return apiClient.post<{ id: string; status: string; already_paid?: boolean }>(
      `${BASE}/${id}/subscriptions/${subscriptionId}/mark-paid`,
      { payment_reference: paymentReference },
    );
  },
  voidSubscription(id: string, subscriptionId: string) {
    return apiClient.post(`${BASE}/${id}/subscriptions/${subscriptionId}/void`);
  },
  suspendVendor(id: string, vendorId: string, reason: string) {
    return apiClient.post(`${BASE}/${id}/vendors/${vendorId}/suspend`, { reason });
  },
  reinstateVendor(id: string, vendorId: string) {
    return apiClient.post(`${BASE}/${id}/vendors/${vendorId}/reinstate`);
  },
  cancelVendor(id: string, vendorId: string) {
    return apiClient.post(`${BASE}/${id}/vendors/${vendorId}/cancel`);
  },
  revenue(id: string): Promise<EventRevenue> {
    return apiClient.get<EventRevenue>(`${BASE}/${id}/revenue`);
  },
};
