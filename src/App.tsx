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
import { APP_PATHS } from "@/features/navigation/navigationConfig";

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

const ResidentDashboard = lazy(() => import("./pages/ResidentDashboard"));
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
const OsirisIntelligence = lazy(() => import("./pages/OsirisIntelligence"));

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
                      path={APP_PATHS.safety}
                      element={
                        <ProtectedRoute>
                          <ResidentDashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.incidentReport}
                      element={<CitizenIncidentReporting />}
                    />

                    <Route
                      path={APP_PATHS.sensors}
                      element={
                        <PermissionRoute
                          anyOf={["cameras.view", "cameras.manage"]}
                        >
                          <SensorManagement />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.operations}
                      element={
                        <PermissionRoute anyOf={["cameras.manage"]}>
                          <ControlPanel />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.cameras}
                      element={
                        <PermissionRoute
                          anyOf={["cameras.view", "cameras.manage"]}
                        >
                          <CameraManagement />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.detection}
                      element={
                        <PermissionRoute anyOf={["cameras.view"]}>
                          <DetectionManager />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.faces}
                      element={
                        <PermissionRoute anyOf={["cameras.manage"]}>
                          <FaceRecognition />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.profile}
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.billing}
                      element={
                        <PermissionRoute anyOf={["billing.manage"]}>
                          <Pricing />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.sites}
                      element={
                        <ProtectedRoute>
                          <Deployments />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.billingCallback}
                      element={
                        <ProtectedRoute>
                          <BillingCallback />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.platform}
                      element={
                        <PermissionRoute platformOnly>
                          <PlatformAdmin />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.webhooks}
                      element={
                        <AdminRoute>
                          <AdminWebhooks />
                        </AdminRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.community}
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
                      path={APP_PATHS.intelligence}
                      element={
                        <PermissionRoute
                          anyOf={[
                            "alerts.dispatch",
                            "incidents.respond",
                            "reports.verify",
                          ]}
                        >
                          <OsirisIntelligence />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.emergencyResources}
                      element={
                        <ProtectedRoute>
                          <EmergencyResourceMap />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.communityAlerts}
                      element={
                        <PermissionRoute anyOf={["alerts.dispatch"]}>
                          <CommunityAlerts />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.emergencyContacts}
                      element={
                        <ProtectedRoute>
                          <EmergencyContactsPage />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.notifications}
                      element={
                        <ProtectedRoute>
                          <Notifications />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.safeBenue}
                      element={
                        <ProtectedRoute>
                          <SafeBenueLanding />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.safeBenueDashboard}
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
                      path={APP_PATHS.safeBenueReports}
                      element={
                        <ProtectedRoute>
                          <SafeBenueReports />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.safeBenueResources}
                      element={
                        <ProtectedRoute>
                          <SafeBenueResources />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.safeBenueWatch}
                      element={
                        <PermissionRoute anyOf={["alerts.dispatch"]}>
                          <SafeBenueCommunityWatch />
                        </PermissionRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.safeBenueFamily}
                      element={
                        <ProtectedRoute>
                          <SafeBenueFamily />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path={APP_PATHS.safeBenueAdmin}
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

                    {/* Compatibility redirects preserve existing bookmarks. */}
                    <Route path="/dashboard" element={<Navigate to={APP_PATHS.safety} replace />} />
                    <Route path="/incident-report" element={<Navigate to={APP_PATHS.incidentReport} replace />} />
                    <Route path="/resources" element={<Navigate to={APP_PATHS.emergencyResources} replace />} />
                    <Route path="/emergency-contacts" element={<Navigate to={APP_PATHS.emergencyContacts} replace />} />
                    <Route path="/notifications" element={<Navigate to={APP_PATHS.notifications} replace />} />
                    <Route path="/profile" element={<Navigate to={APP_PATHS.profile} replace />} />
                    <Route path="/deployments" element={<Navigate to={APP_PATHS.sites} replace />} />
                    <Route path="/pricing" element={<Navigate to={APP_PATHS.billing} replace />} />
                    <Route path="/control" element={<Navigate to={APP_PATHS.operations} replace />} />
                    <Route path="/cameras" element={<Navigate to={APP_PATHS.cameras} replace />} />
                    <Route path="/sensors" element={<Navigate to={APP_PATHS.sensors} replace />} />
                    <Route path="/detection" element={<Navigate to={APP_PATHS.detection} replace />} />
                    <Route path="/faces" element={<Navigate to={APP_PATHS.faces} replace />} />
                    <Route path="/community-dashboard" element={<Navigate to={APP_PATHS.community} replace />} />
                    <Route path="/community-alerts" element={<Navigate to={APP_PATHS.communityAlerts} replace />} />
                    <Route path="/osiris" element={<Navigate to={APP_PATHS.intelligence} replace />} />
                    <Route path="/safebenue" element={<Navigate to={APP_PATHS.safeBenue} replace />} />
                    <Route path="/safebenue/dashboard" element={<Navigate to={APP_PATHS.safeBenueDashboard} replace />} />
                    <Route path="/safebenue/reports" element={<Navigate to={APP_PATHS.safeBenueReports} replace />} />
                    <Route path="/safebenue/resources" element={<Navigate to={APP_PATHS.safeBenueResources} replace />} />
                    <Route path="/safebenue/community-watch" element={<Navigate to={APP_PATHS.safeBenueWatch} replace />} />
                    <Route path="/safebenue/family" element={<Navigate to={APP_PATHS.safeBenueFamily} replace />} />
                    <Route path="/safebenue/admin" element={<Navigate to={APP_PATHS.safeBenueAdmin} replace />} />
                    <Route path="/billing/callback" element={<Navigate to={APP_PATHS.billingCallback} replace />} />
                    <Route path="/platform-admin" element={<Navigate to={APP_PATHS.platform} replace />} />
                    <Route path="/admin/webhooks" element={<Navigate to={APP_PATHS.webhooks} replace />} />

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
