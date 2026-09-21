import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardPage from "@/pages/DashboardPage";

/**
 * "/" means different things per role: SUPER_ADMIN gets the platform
 * dashboard; ONBOARDER has no platform-wide metrics to see, so "/" sends
 * them straight to their actual landing page instead of a "not available
 * for your role" dead end.
 */
export default function HomeRoute() {
  const { me, loading } = useAuth();

  if (loading || !me) return null; // AdminLayout already shows the loading/error state

  if (me.role === "ONBOARDER") {
    return <Navigate to="/onboarding" replace />;
  }

  return <DashboardPage />;
}
