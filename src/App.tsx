import type { ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { registerIncidentReportSync } from "@/lib/incidentReportSync";

// Register offline sync handlers once, before any route renders.
registerIncidentReportSync();


import { ThemeProvider } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { AdminRoute } from "@/components/auth/AdminRoute";

import { LanguageProvider } from "@/hooks/useLanguage";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { CommunityDashboard } from "@/components/CommunityDashboard";
import { EmergencyResourceMap } from "@/components/EmergencyResourceMap";
import { GlobalControls } from "@/components/GlobalControls";

import Index from "./pages/Index";
import SensorManagement from "./pages/SensorManagement";
import ControlPanel from "./pages/ControlPanel";
import DetectionManager from "./pages/DetectionManager";
import FaceRecognition from "./pages/FaceRecognition";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import Deployments from "./pages/Deployments";
import BillingCallback from "./pages/BillingCallback";
import AdminWebhooks from "./pages/AdminWebhooks";
import NotFound from "./pages/NotFound";
import CameraManagement from "./pages/CameraManagement";
import CitizenIncidentReporting from "./pages/CitizenIncidentReporting";
import CommunityAlerts from "./pages/CommunityAlerts";
import EmergencyContactsPage from "./pages/EmergencyContactsPage";
import Notifications from "./pages/Notifications";
import SafeBenueLanding from "./pages/safebenue/SafeBenueLanding";
import SafeBenueDashboard from "./pages/safebenue/SafeBenueDashboard";
import SafeBenueReports from "./pages/safebenue/SafeBenueReports";
import SafeBenueResources from "./pages/safebenue/SafeBenueResources";
import SafeBenueCommunityWatch from "./pages/safebenue/SafeBenueCommunityWatch";
import SafeBenueFamily from "./pages/safebenue/SafeBenueFamily";
import SafeBenueAdmin from "./pages/safebenue/SafeBenueAdmin";

const queryClient = new QueryClient();

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-label="Loading"
          role="status"
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <BrowserRouter>
              <GlobalControls />

              <Routes>
                <Route path="/auth" element={<Auth />} />

                <Route
                  path="/reset-password"
                  element={<ResetPassword />}
                />

                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/incident-report"
                  element={
                    <ProtectedRoute>
                      <CitizenIncidentReporting />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/sensors"
                  element={
                    <ProtectedRoute>
                      <SensorManagement />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/control"
                  element={
                    <ProtectedRoute>
                      <ControlPanel />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/cameras"
                  element={
                    <ProtectedRoute>
                      <CameraManagement />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/detection"
                  element={
                    <ProtectedRoute>
                      <DetectionManager />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/faces"
                  element={
                    <ProtectedRoute>
                      <FaceRecognition />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/pricing"
                  element={
                    <ProtectedRoute>
                      <Pricing />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/deployments"
                  element={
                    <ProtectedRoute>
                      <Deployments />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/billing/callback"
                  element={
                    <ProtectedRoute>
                      <BillingCallback />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/webhooks"
                  element={
                    <AdminRoute>
                      <AdminWebhooks />
                    </AdminRoute>
                  }
                />


                <Route
                  path="/community-dashboard"
                  element={
                    <ProtectedRoute>
                      <CommunityDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/resources"
                  element={
                    <ProtectedRoute>
                      <EmergencyResourceMap />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/community-alerts"
                  element={
                    <ProtectedRoute>
                      <CommunityAlerts />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/emergency-contacts"
                  element={
                    <ProtectedRoute>
                      <EmergencyContactsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/notifications"
                  element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  }
                />


                <Route
                  path="/safebenue"
                  element={
                    <ProtectedRoute>
                      <SafeBenueLanding />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/safebenue/dashboard"
                  element={
                    <ProtectedRoute>
                      <SafeBenueDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/safebenue/reports"
                  element={
                    <ProtectedRoute>
                      <SafeBenueReports />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/safebenue/resources"
                  element={
                    <ProtectedRoute>
                      <SafeBenueResources />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/safebenue/community-watch"
                  element={
                    <ProtectedRoute>
                      <SafeBenueCommunityWatch />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/safebenue/family"
                  element={
                    <ProtectedRoute>
                      <SafeBenueFamily />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/safebenue/admin"
                  element={
                    <AdminRoute>
                      <SafeBenueAdmin />
                    </AdminRoute>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;