// Types for the sales-partner onboarding workflow -- backed by
// admin_api/app/services/onboarding.py (go-live checks) and
// backend/app/api/v1/routes_setup.py::compute_setup_progress (setup, reused
// as-is by the admin API so the owner-facing and admin-facing progress views
// can never disagree).

export type GoLiveStatus = "pass" | "fail" | "warn" | "n/a";

export interface GoLiveCheck {
  key: string;
  label: string;
  status: GoLiveStatus;
  detail: string;
}

// admin_api/app/services/onboarding.py::ReadinessSummary -- a friendlier,
// percent-based summary of the SAME checks GoLiveResult already carries
// (excludes n/a checks from the denominator), added Wave 0A so the sales
// UI has one human label ("Restaurant Ready — 11/12 checks complete") to
// show prominently instead of hand-deriving it from `checks` itself.
export interface ReadinessSummary {
  passed: number;
  total: number;
  percent: number;
  label: string;
}

export interface GoLiveResult {
  ready: boolean;
  passed: number;
  failed: number;
  warned: number;
  checks: GoLiveCheck[];
  readiness: ReadinessSummary;
}

export type SetupStepStatus = "done" | "partial" | "todo";

export interface SetupStep {
  key: string;
  label: string;
  description: string;
  status: SetupStepStatus;
  detail: string;
  count: number;
  total: number;
  required_to_trade: boolean;
  href: string | null;
}

export interface SetupProgress {
  business_name: string;
  inventory_enabled: boolean;
  ready_to_trade: boolean;
  percent_complete: number;
  steps: SetupStep[];
}

export interface OnboardingStatusResponse {
  business_id: string;
  business_name: string;
  setup: SetupProgress;
  go_live: GoLiveResult;
  ready: boolean;
}

export interface OnboardingCompleteRequest {
  force: boolean;
}

export interface OnboardingCompleteResponse {
  business_id: string;
  onboarding_completed_at: string;
  forced: boolean;
  deactivated_onboarding_accounts: number;
}
