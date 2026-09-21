import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardPage from "@/pages/DashboardPage";

/**
 * "/" means different things per role: SUPER_ADMIN gets the platform
 * dashboard; ONBOARDER has no platform-wide metrics to see, so "/" sends
 * them straight to their actual landing page instead of a "not available
 * for your role" dead end. That landing page is the Sales Dashboard
 * (/sales) as of the Wave 0A commercial push -- a sales partner's daily
 * work (trials/invoices/payments) lives there now; Onboarding (setup
 * checklists) stays a separate nav item, not the landing page.
 */
export default function HomeRoute() {
  const { me, loading } = useAuth();

  if (loading || !me) return null; // AdminLayout already shows the loading/error state

  if (me.role === "ONBOARDER") {
    return <Navigate to="/sales" replace />;
  }

  return <DashboardPage />;
}
