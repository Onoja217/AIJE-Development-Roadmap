import { lazy } from "react";
import { Route } from "react-router-dom";
import { PermissionRoute } from "@/features/access/PermissionRoute";
import { ProtectedRoute } from "./routeGuards";
import { APP_PATHS } from "@/features/navigation/navigationConfig";
const Pricing = lazy(() => import("@/pages/Pricing")); const Deployments = lazy(() => import("@/pages/Deployments")); const BillingCallback = lazy(() => import("@/pages/BillingCallback"));
export function AccountRoutes() { return <><Route path={APP_PATHS.billing} element={<PermissionRoute anyOf={["billing.manage"]}><Pricing /></PermissionRoute>} /><Route path={APP_PATHS.sites} element={<PermissionRoute anyOf={["sites.manage"]}><Deployments /></PermissionRoute>} /><Route path={APP_PATHS.billingCallback} element={<ProtectedRoute><BillingCallback /></ProtectedRoute>} /></>; }
