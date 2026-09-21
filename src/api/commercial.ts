import { apiClient } from "./client";
import { ADMIN_API_BASE, TOKEN_KEY } from "@/lib/constants";
import type {
  PriceCatalogueEntry,
  CommercialInvoice,
  InvoiceDraftCreate,
  InvoiceDraftUpdate,
  MarkPaidRequest,
  CancelInvoiceRequest,
  CommercialDashboardResponse,
  ClientRow,
} from "@/types/commercial";

// admin_api/app/api/v1/routes_commercial.py, mounted under
// {API_V1_PREFIX}/admin/commercial (same "/v1/admin/admin/..." double
// "admin" shape as businessesApi -- API_V1_PREFIX is "/v1/admin" and the
// router itself adds a second "/admin/commercial" prefix).
const BASE = "/v1/admin/admin/commercial";

export const commercialApi = {
  getPriceCatalogue(): Promise<PriceCatalogueEntry[]> {
    return apiClient.get<PriceCatalogueEntry[]>(`${BASE}/price-catalogue`);
  },

  getDashboard(): Promise<CommercialDashboardResponse> {
    return apiClient.get<CommercialDashboardResponse>(`${BASE}/dashboard`);
  },

  listClients(params?: { status?: string }): Promise<ClientRow[]> {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return apiClient.get<ClientRow[]>(`${BASE}/clients${qs ? `?${qs}` : ""}`);
  },

  /**
   * There is no GET /admin/commercial/clients/{id} on the backend (verified
   * by reading routes_commercial.py -- /clients only takes an optional
   * `status` filter, never a business_id). This fetches the caller's whole
   * scoped client list and finds the one row -- the same "fetch the scoped
   * list, filter client-side" pattern OnboardingListPage/DashboardPage
   * already use, and fine at the realistic per-onboarder client volumes
   * this UI targets. DOC NOTE: worth a dedicated single-client endpoint if
   * a sales partner's client list ever grows large enough for this to be
   * slow.
   */
  async getClient(businessId: string): Promise<ClientRow | null> {
    const rows = await commercialApi.listClients();
    return rows.find((r) => r.business_id === businessId) ?? null;
  },

  // ── Invoices ───────────────────────────────────────────────────────────
  listInvoices(params?: { business_id?: string; status?: string; page?: number; per_page?: number }): Promise<CommercialInvoice[]> {
    const q = new URLSearchParams();
    if (params?.business_id) q.set("business_id", params.business_id);
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    const qs = q.toString();
    return apiClient.get<CommercialInvoice[]>(`${BASE}/invoices${qs ? `?${qs}` : ""}`);
  },

  getInvoice(id: string): Promise<CommercialInvoice> {
    return apiClient.get<CommercialInvoice>(`${BASE}/invoices/${id}`);
  },

  createInvoiceDraft(data: InvoiceDraftCreate): Promise<CommercialInvoice> {
    return apiClient.post<CommercialInvoice>(`${BASE}/invoices`, data);
  },

  updateInvoiceDraft(id: string, data: InvoiceDraftUpdate): Promise<CommercialInvoice> {
    return apiClient.patch<CommercialInvoice>(`${BASE}/invoices/${id}`, data);
  },

  issueInvoice(id: string): Promise<CommercialInvoice> {
    return apiClient.post<CommercialInvoice>(`${BASE}/invoices/${id}/issue`);
  },

  markSent(id: string): Promise<CommercialInvoice> {
    return apiClient.post<CommercialInvoice>(`${BASE}/invoices/${id}/mark-sent`);
  },

  markPaid(id: string, data: MarkPaidRequest): Promise<CommercialInvoice> {
    return apiClient.post<CommercialInvoice>(`${BASE}/invoices/${id}/mark-paid`, data);
  },

  cancelInvoice(id: string, data: CancelInvoiceRequest): Promise<CommercialInvoice> {
    return apiClient.post<CommercialInvoice>(`${BASE}/invoices/${id}/cancel`, data);
  },

  /** Downloads the PDF and triggers a browser save -- same blob-download
   * shape as businessesApi.billingPdf, but routed through ADMIN_API_BASE
   * (never a second hardcoded fallback URL -- see KNOWN_BUGS.md's
   * SettingsPage.tsx note in the sibling manager-dashboard repo for the
   * class of bug this avoids). */
  async downloadInvoicePdf(id: string, filenameHint?: string): Promise<void> {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(`${ADMIN_API_BASE}${BASE}/invoices/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to download invoice PDF");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameHint || "invoice"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
