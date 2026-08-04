import { lazy, Suspense, type ReactNode } from "react";
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
import { LanguageProvider } from "@/hooks/useLanguage";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

import { GlobalControls } from "@/components/GlobalControls";

const CommunityDashboard = lazy(() =>
  import("@/components/CommunityDashboard").then((m) => ({ default: m.CommunityDashboard })),
);
const EmergencyResourceMap = lazy(() =>
  import("@/components/EmergencyResourceMap").then((m) => ({ default: m.EmergencyResourceMap })),
);

const Index = lazy(() => import("./pages/Index"));
const SensorManagement = lazy(() => import("./pages/SensorManagement"));
const ControlPanel = lazy(() => import("./pages/ControlPanel"));
const DetectionManager = lazy(() => import("./pages/DetectionManager"));
const FaceRecognition = lazy(() => import("./pages/FaceRecognition"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Deployments = lazy(() => import("./pages/Deployments"));
const BillingCallback = lazy(() => import("./pages/BillingCallback"));
const AdminWebhooks = lazy(() => import("./pages/AdminWebhooks"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CameraManagement = lazy(() => import("./pages/CameraManagement"));
const CitizenIncidentReporting = lazy(() => import("./pages/CitizenIncidentReporting"));
const CommunityAlerts = lazy(() => import("./pages/CommunityAlerts"));
const EmergencyContactsPage = lazy(() => import("./pages/EmergencyContactsPage"));
const Notifications = lazy(() => import("./pages/Notifications"));

const queryClient = new QueryClient();

function RouteSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-label="Loading"
        role="status"
      />
    </div>
  );
}

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteSpinner />;
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

              <AppErrorBoundary>
                <Suspense fallback={<RouteSpinner />}>
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

                    <Route path="/index" element={<Navigate to="/" replace />} />

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
                        <ProtectedRoute>
                          <AdminWebhooks />
                        </ProtectedRoute>
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

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </AppErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
