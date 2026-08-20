import { lazy } from "react";
import { Route } from "react-router-dom";
import { PermissionRoute } from "@/features/access/PermissionRoute";
import { APP_PATHS } from "@/features/navigation/navigationConfig";
const ControlPanel = lazy(() => import("@/pages/ControlPanel"));
const CameraManagement = lazy(() => import("@/pages/CameraManagement"));
const SensorManagement = lazy(() => import("@/pages/SensorManagement"));
const DetectionManager = lazy(() => import("@/pages/DetectionManager"));
const FaceRecognition = lazy(() => import("@/pages/FaceRecognition"));
export function OperationsRoutes() {
  return (
    <>
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
          <PermissionRoute anyOf={["cameras.view", "cameras.manage"]}>
            <CameraManagement />
          </PermissionRoute>
        }
      />
      <Route
        path={APP_PATHS.sensors}
        element={
          <PermissionRoute anyOf={["sensors.view", "sensors.manage"]}>
            <SensorManagement />
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
    </>
  );
}
