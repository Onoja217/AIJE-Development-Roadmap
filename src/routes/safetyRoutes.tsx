import { lazy } from "react";
import { Route } from "react-router-dom";
import { APP_PATHS } from "@/features/navigation/navigationConfig";
import { ProtectedRoute } from "./routeGuards";
import { PermissionRoute } from "@/features/access/PermissionRoute";
const ResidentDashboard = lazy(() => import("@/pages/ResidentDashboard"));
const CitizenIncidentReporting = lazy(
  () => import("@/pages/CitizenIncidentReporting"),
);
const EmergencyResourceMap = lazy(() =>
  import("@/components/EmergencyResourceMap").then((m) => ({
    default: m.EmergencyResourceMap,
  })),
);
const EmergencyContactsPage = lazy(
  () => import("@/pages/EmergencyContactsPage"),
);
const Notifications = lazy(() => import("@/pages/Notifications"));
const Profile = lazy(() => import("@/pages/Profile"));
const HouseholdSensors = lazy(() => import("@/pages/HouseholdSensors"));
export function SafetyRoutes() {
  return (
    <>
      <Route
        path={APP_PATHS.safety}
        element={
          <ProtectedRoute>
            <ResidentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path={APP_PATHS.householdSensors}
        element={
          <PermissionRoute anyOf={["sensors.view", "sensors.manage"]}>
            <HouseholdSensors />
          </PermissionRoute>
        }
      />
      <Route
        path={APP_PATHS.incidentReport}
        element={<CitizenIncidentReporting />}
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
        path={APP_PATHS.profile}
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
    </>
  );
}
