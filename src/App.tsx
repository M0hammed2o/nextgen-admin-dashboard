import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import BusinessesPage from "./pages/BusinessesPage";
import BusinessDetailsPage from "./pages/BusinessDetailsPage";
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
            <Route path="/" element={<DashboardPage />} />
            <Route path="/businesses" element={<BusinessesPage />} />
            <Route path="/businesses/:id" element={<BusinessDetailsPage />} />
            <Route path="/ai-emails" element={<AiEmailsPage />} />
            <Route path="/ai-emails/leads" element={<AiEmailLeadsPage />} />
            <Route path="/ai-emails/leads/:id" element={<AiEmailLeadDetailPage />} />
            <Route path="/usage" element={<UsagePage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
