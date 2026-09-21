export const ADMIN_API_BASE = import.meta.env.VITE_API_BASE_URL || "https://admin-api.nextgenintelligence.co.za";
// Deep-link target for "Business Dashboard" / "sign in with the onboarding
// login" style links into the Manager Dashboard. Was previously hardcoded
// as a literal string in BusinessDetailsPage.tsx (bypassing this env var
// entirely, even though .env/.env.local both define it) -- fixed while
// building the onboarding workspace, which needs the same link and would
// otherwise have been a second instance of the same hardcode.
export const DASH_URL = import.meta.env.VITE_DASH_URL || "https://app.nextgenintelligence.co.za";
export const TOKEN_KEY = "nextgen_admin_token";
export const REFRESH_TOKEN_KEY = "nextgen_admin_refresh_token";

// backend/app/core/config.py Settings.ONBOARDER_MAX_TRIAL_EXTENSION_DAYS
// default. Not returned by any GET endpoint (only ever visible in a 403
// EXTENSION_CAP_EXCEEDED error message or in TrialExtendResponse right
// after a successful extend) -- this is a documented default used for
// display copy only; the real cap is always enforced server-side
// regardless of what this constant says. DOC NOTE: worth exposing on
// GET /admin/me or the dashboard response if this ever needs to be exact
// before the first extend call in a session.
export const ONBOARDER_TRIAL_EXTENSION_CAP_DAYS = 14;
