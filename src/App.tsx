import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleRoute } from "@/routes/RoleRoute";
import HomeRoute from "@/routes/HomeRoute";
import LoginPage from "./pages/LoginPage";
import BusinessesPage from "./pages/BusinessesPage";
import BusinessDetailsPage from "./pages/BusinessDetailsPage";
import OnboardingListPage from "./pages/OnboardingListPage";
import OnboardingWorkspacePage from "./pages/OnboardingWorkspacePage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AiEmailsPage from "./pages/AiEmailsPage";
import AiEmailLeadsPage from "./pages/AiEmailLeadsPage";
import AiEmailLeadDetailPage from "./pages/AiEmailLeadDetailPage";
import UsagePage from "./pages/UsagePage";
import AuditPage from "./pages/AuditPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomeRoute />} />
            <Route path="/businesses" element={<RoleRoute roles={["SUPER_ADMIN"]}><BusinessesPage /></RoleRoute>} />
            <Route path="/businesses/:id" element={<RoleRoute roles={["SUPER_ADMIN"]}><BusinessDetailsPage /></RoleRoute>} />
            <Route path="/onboarding" element={<OnboardingListPage />} />
            <Route path="/onboarding/:id" element={<OnboardingWorkspacePage />} />
            <Route path="/admin-users" element={<RoleRoute roles={["SUPER_ADMIN"]}><AdminUsersPage /></RoleRoute>} />
            <Route path="/ai-emails" element={<RoleRoute roles={["SUPER_ADMIN"]}><AiEmailsPage /></RoleRoute>} />
            <Route path="/ai-emails/leads" element={<RoleRoute roles={["SUPER_ADMIN"]}><AiEmailLeadsPage /></RoleRoute>} />
            <Route path="/ai-emails/leads/:id" element={<RoleRoute roles={["SUPER_ADMIN"]}><AiEmailLeadDetailPage /></RoleRoute>} />
            <Route path="/usage" element={<RoleRoute roles={["SUPER_ADMIN"]}><UsagePage /></RoleRoute>} />
            <Route path="/audit" element={<RoleRoute roles={["SUPER_ADMIN"]}><AuditPage /></RoleRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
