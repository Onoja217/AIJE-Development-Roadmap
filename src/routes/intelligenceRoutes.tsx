import { lazy } from "react";
import { Route } from "react-router-dom";
import { PermissionRoute } from "@/features/access/PermissionRoute";
import { APP_PATHS } from "@/features/navigation/navigationConfig";
const OsirisIntelligence = lazy(() => import("@/pages/OsirisIntelligence"));
export function IntelligenceRoutes() { return <Route path={APP_PATHS.intelligence} element={<PermissionRoute anyOf={["intelligence.view"]}><OsirisIntelligence /></PermissionRoute>} />; }
