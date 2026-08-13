import { lazy } from "react";
import { Route } from "react-router-dom";
import { PermissionRoute } from "@/features/access/PermissionRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { APP_PATHS } from "@/features/navigation/navigationConfig";
const PlatformAdmin = lazy(() => import("@/pages/PlatformAdmin"));
const AdminWebhooks = lazy(() => import("@/pages/AdminWebhooks"));
export function PlatformRoutes() { return <><Route path={APP_PATHS.platform} element={<PermissionRoute platformOnly><PlatformAdmin /></PermissionRoute>} /><Route path={APP_PATHS.webhooks} element={<AdminRoute><AdminWebhooks /></AdminRoute>} /></>; }
