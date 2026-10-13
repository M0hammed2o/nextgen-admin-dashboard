import { apiClient } from "./client";
import { ADMIN_API_BASE, TOKEN_KEY } from "@/lib/constants";
import type {
  Business,
  CreateBusinessRequest,
  CreateOnboardingBusinessRequest,
  UpdateBusinessRequest,
  OnboardingBusiness,
  OnboardingBusinessUpdate,
  SuspendRequest,
  SetLimitsRequest,
  CreateOwnerRequest,
  CreateOwnerResponse,
  BusinessUserSummary,
  ResetPasswordResponse,
  WhatsAppTestRequest,
  WhatsAppTestResponse,
  OrderPackRequest,
} from "@/types/business";
import type { OnboardingCompleteRequest, OnboardingCompleteResponse, OnboardingStatusResponse } from "@/types/onboarding";
import type {
  TrialStartResponse,
  TrialExtendRequest,
  TrialExtendResponse,
  OnboardingConfirmRequest,
  OnboardingConfirmResponse,
} from "@/types/business";

export const businessesApi = {
  list(params?: { is_active?: boolean | null; page?: number; per_page?: number; search?: string }): Promise<Business[]> {
    const q = new URLSearchParams();
    if (params?.is_active !== undefined && params.is_active !== null) {
      q.set("is_active", String(params.is_active));
    }
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    // Server-side substring match (name/slug/business_code), applied before
    // pagination -- see admin_api routes_businesses.py::list_businesses.
    // Without this, a business not on the currently-fetched page was
    // unfindable by the old client-side-only search (KNOWN_BUGS.md).
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return apiClient.get<Business[]>(`/v1/admin/admin/businesses${qs ? `?${qs}` : ""}`);
  },

  get(id: string): Promise<Business> {
    return apiClient.get<Business>(`/v1/admin/admin/businesses/${id}`);
  },

  create(data: CreateBusinessRequest): Promise<Business> {
    return apiClient.post<Business>("/v1/admin/admin/businesses", data);
  },

  update(id: string, data: UpdateBusinessRequest): Promise<Business> {
    return apiClient.patch<Business>(`/v1/admin/admin/businesses/${id}`, data);
  },

  suspend(id: string, data: SuspendRequest): Promise<Business> {
    return apiClient.post<Business>(`/v1/admin/admin/businesses/${id}/suspend`, data);
  },

  unsuspend(id: string): Promise<Business> {
    return apiClient.post<Business>(`/v1/admin/admin/businesses/${id}/unsuspend`);
  },

  setLimits(id: string, data: SetLimitsRequest): Promise<Business> {
    return apiClient.post<Business>(`/v1/admin/admin/businesses/${id}/limits`, data);
  },

  orderPack(id: string, data: OrderPackRequest): Promise<Business> {
    return apiClient.post<Business>(`/v1/admin/admin/businesses/${id}/order-pack`, data);
  },

  createOwner(id: string, data: CreateOwnerRequest): Promise<CreateOwnerResponse> {
    return apiClient.post<CreateOwnerResponse>(`/v1/admin/admin/businesses/${id}/owner`, data);
  },

  listUsers(id: string): Promise<BusinessUserSummary[]> {
    return apiClient.get<BusinessUserSummary[]>(`/v1/admin/admin/businesses/${id}/users`);
  },

  resetPassword(id: string, userId: string): Promise<ResetPasswordResponse> {
    return apiClient.post<ResetPasswordResponse>(`/v1/admin/admin/businesses/${id}/users/${userId}/reset-password`);
  },

  whatsappTestSend(id: string, data: WhatsAppTestRequest): Promise<WhatsAppTestResponse> {
    return apiClient.post<WhatsAppTestResponse>(`/v1/admin/admin/businesses/${id}/whatsapp/test-send`, data);
  },

  // ── Onboarding-scoped variants ──────────────────────────────────────────
  // Same endpoints as above, but typed against the reduced
  // OnboardingBusiness shape an ONBOARDER actually receives (SUPER_ADMIN's
  // fuller response still structurally satisfies it). Used by
  // OnboardingListPage / OnboardingWorkspacePage, which are reachable by
  // BOTH roles -- see admin_api/app/api/v1/routes_businesses.py's
  // get_business_scoped for the server-side scoping this relies on.
  listOnboarding(params?: { is_active?: boolean | null; page?: number; per_page?: number }): Promise<OnboardingBusiness[]> {
    const q = new URLSearchParams();
    if (params?.is_active !== undefined && params.is_active !== null) {
      q.set("is_active", String(params.is_active));
    }
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    const qs = q.toString();
    return apiClient.get<OnboardingBusiness[]>(`/v1/admin/admin/businesses${qs ? `?${qs}` : ""}`);
  },

  getOnboarding(id: string): Promise<OnboardingBusiness> {
    return apiClient.get<OnboardingBusiness>(`/v1/admin/admin/businesses/${id}`);
  },

  createOnboardingBusiness(data: CreateOnboardingBusinessRequest): Promise<OnboardingBusiness> {
    return apiClient.post<OnboardingBusiness>("/v1/admin/admin/businesses", data);
  },

  updateOnboardingBusiness(id: string, data: OnboardingBusinessUpdate): Promise<OnboardingBusiness> {
    return apiClient.patch<OnboardingBusiness>(`/v1/admin/admin/businesses/${id}`, data);
  },

  getOnboardingStatus(id: string): Promise<OnboardingStatusResponse> {
    return apiClient.get<OnboardingStatusResponse>(`/v1/admin/admin/businesses/${id}/onboarding`);
  },

  completeOnboarding(id: string, data: OnboardingCompleteRequest): Promise<OnboardingCompleteResponse> {
    return apiClient.post<OnboardingCompleteResponse>(`/v1/admin/admin/businesses/${id}/onboarding/complete`, data);
  },

  // ── Trial start/extend + go-live manual confirmations (Wave 0A) ─────────
  // Use get_business_commercial_scoped server-side (not get_business_scoped)
  // -- reachable by an ONBOARDER for their own clients even after handover,
  // unlike getOnboarding/getOnboardingStatus above. See OnboardingBusiness
  // comment block and the Sales Client page for how the UI handles that
  // split.
  startTrial(id: string): Promise<TrialStartResponse> {
    return apiClient.post<TrialStartResponse>(`/v1/admin/admin/businesses/${id}/trial/start`);
  },

  extendTrial(id: string, data: TrialExtendRequest): Promise<TrialExtendResponse> {
    return apiClient.post<TrialExtendResponse>(`/v1/admin/admin/businesses/${id}/trial/extend`, data);
  },

  confirmOnboardingItem(id: string, data: OnboardingConfirmRequest): Promise<OnboardingConfirmResponse> {
    return apiClient.post<OnboardingConfirmResponse>(`/v1/admin/admin/businesses/${id}/onboarding/confirm`, data);
  },

  async billingPdf(id: string): Promise<void> {
    // Was a second hardcoded fallback URL literal, independent of
    // ADMIN_API_BASE -- fixed while touching this file for the commercial
    // build (2026-09-21); see DOC NOTES in that task's report. Use the same
    // constant every other request in this app goes through.
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(`${ADMIN_API_BASE}/v1/admin/admin/businesses/${id}/billing/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to generate billing PDF");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
