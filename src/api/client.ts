import { ADMIN_API_BASE, TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/constants";

// Shared refresh state — prevents multiple concurrent 401s from each
// independently triggering a token refresh (thundering-herd protection).
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAdminToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${ADMIN_API_BASE}/v1/admin/admin/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      if (data.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

class ApiClient {
  private baseUrl = ADMIN_API_BASE;

  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });

    // On 401: attempt token refresh, retry once, then redirect to login.
    if (res.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAdminToken();
      }
      const success = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (success) {
        const newToken = this.getToken();
        if (newToken) headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = "/login";
        throw new Error("Session expired");
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // Backend returns { error: { message } } — match other apps' parsing.
      const message =
        body?.error?.message || body?.detail || body?.message || `Request failed: ${res.status}`;
      const err = new Error(message) as Error & { code?: string; status?: number };
      // Additive, backward-compatible: every existing caller only ever read
      // `.message` (see AdminUsersPage's toast-verbatim convention) -- these
      // two extra fields let a caller distinguish e.g. a scoping 404
      // (BUSINESS_NOT_FOUND, expected once an ONBOARDER's config access to
      // a handed-over business ends) from a real failure, without having to
      // string-match `.message`. See SalesClientPage for the first use.
      err.code = body?.error?.code;
      err.status = res.status;
      throw err;
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: "GET" });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
