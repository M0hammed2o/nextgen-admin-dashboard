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
