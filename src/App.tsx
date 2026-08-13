import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerIncidentReportSync } from "@/lib/incidentReportSync";

// Register offline sync handlers once, before any route renders.
registerIncidentReportSync();

import { ThemeProvider } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { AccessProvider } from "@/features/access/AccessProvider";
import { PermissionRoute } from "@/features/access/PermissionRoute";
import { RoleLanding } from "@/features/access/RoleLanding";

import { LanguageProvider } from "@/hooks/useLanguage";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { GlobalControls } from "@/components/GlobalControls";

const CommunityDashboard = lazy(() =>
  import("@/components/CommunityDashboard").then((module) => ({
    default: module.CommunityDashboard,
  })),
);
const EmergencyResourceMap = lazy(() =>
  import("@/components/EmergencyResourceMap").then((module) => ({
    default: module.EmergencyResourceMap,
  })),
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
const CitizenIncidentReporting = lazy(
  () => import("./pages/CitizenIncidentReporting"),
);
const CommunityAlerts = lazy(() => import("./pages/CommunityAlerts"));
const EmergencyContactsPage = lazy(
  () => import("./pages/EmergencyContactsPage"),
);
const Notifications = lazy(() => import("./pages/Notifications"));
const SafeBenueLanding = lazy(
  () => import("./pages/safebenue/SafeBenueLanding"),
);
const SafeBenueDashboard = lazy(
  () => import("./pages/safebenue/SafeBenueDashboard"),
);
const SafeBenueReports = lazy(
  () => import("./pages/safebenue/SafeBenueReports"),
);
const SafeBenueResources = lazy(
  () => import("./pages/safebenue/SafeBenueResources"),
);
const SafeBenueCommunityWatch = lazy(
  () => import("./pages/safebenue/SafeBenueCommunityWatch"),
);
const SafeBenueFamily = lazy(() => import("./pages/safebenue/SafeBenueFamily"));
const SafeBenueAdmin = lazy(() => import("./pages/safebenue/SafeBenueAdmin"));
const OrganizationAdmin = lazy(
  () => import("./features/organizations/OrganizationAdmin"),
);
const PlatformAdmin = lazy(() => import("./pages/PlatformAdmin"));

const queryClient = new QueryClient();

interface ProtectedRouteProps {
  children: ReactNode;
}

function PageLoading() {
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

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoading />;
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
          <AccessProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />

              <BrowserRouter>
                <GlobalControls />

                <Suspense fallback={<PageLoading />}>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />

                    <Route path="/reset-password" element={<ResetPassword />} />

                    <Route path="/" element={<RoleLanding />} />

                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Index />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/incident-report"
                      element={<CitizenIncidentReporting />}
                    />

                    <Route
                      path="/sensors"
                      element={
                        <PermissionRoute
                          anyOf={["cameras.view", "cameras.manage"]}
                        >
                          <SensorManagement />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/control"
                      element={
                        <PermissionRoute anyOf={["cameras.manage"]}>
                          <ControlPanel />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/cameras"
                      element={
                        <PermissionRoute
                          anyOf={["cameras.view", "cameras.manage"]}
                        >
                          <CameraManagement />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/detection"
                      element={
                        <PermissionRoute anyOf={["cameras.view"]}>
                          <DetectionManager />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/faces"
                      element={
                        <PermissionRoute anyOf={["cameras.manage"]}>
                          <FaceRecognition />
                        </PermissionRoute>
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
                        <PermissionRoute anyOf={["billing.manage"]}>
                          <Pricing />
                        </PermissionRoute>
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
                      path="/platform-admin"
                      element={
                        <PermissionRoute platformOnly>
                          <PlatformAdmin />
                        </PermissionRoute>
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
                        <PermissionRoute
                          anyOf={[
                            "alerts.dispatch",
                            "incidents.respond",
                            "reports.verify",
                          ]}
                        >
                          <CommunityDashboard />
                        </PermissionRoute>
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
                        <PermissionRoute anyOf={["alerts.dispatch"]}>
                          <CommunityAlerts />
                        </PermissionRoute>
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
                        <PermissionRoute
                          anyOf={[
                            "alerts.dispatch",
                            "incidents.respond",
                            "reports.verify",
                          ]}
                        >
                          <SafeBenueDashboard />
                        </PermissionRoute>
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
                        <PermissionRoute anyOf={["alerts.dispatch"]}>
                          <SafeBenueCommunityWatch />
                        </PermissionRoute>
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
                        <PermissionRoute
                          anyOf={["organization.manage", "reports.verify"]}
                        >
                          <SafeBenueAdmin />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path="/organization"
                      element={
                        <PermissionRoute anyOf={["organization.manage"]}>
                          <OrganizationAdmin />
                        </PermissionRoute>
                      }
                    />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </AccessProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
