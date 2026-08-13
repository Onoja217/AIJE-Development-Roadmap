import { lazy } from "react";
import { Route } from "react-router-dom";
import { PermissionRoute } from "@/features/access/PermissionRoute";
import { APP_PATHS } from "@/features/navigation/navigationConfig";
const OrganizationAdmin = lazy(() => import("@/features/organizations/OrganizationAdmin"));
export function OrganizationRoutes() { return <Route path={APP_PATHS.organization} element={<PermissionRoute anyOf={["organization.manage"]}><OrganizationAdmin /></PermissionRoute>} />; }
