import { Navigate } from "react-router-dom";
import { TOKEN_KEY } from "@/lib/constants";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
