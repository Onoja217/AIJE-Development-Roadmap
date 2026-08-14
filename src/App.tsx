import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerIncidentReportSync } from "@/lib/incidentReportSync";
import { ThemeProvider } from "@/hooks/useTheme";
import { AccessProvider } from "@/features/access/AccessProvider";
import { RoleLanding } from "@/features/access/RoleLanding";
import { LanguageProvider } from "@/hooks/useLanguage";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalControls } from "@/components/GlobalControls";
import { PageLoading } from "@/routes/routeGuards";
import { SafetyRoutes } from "@/routes/safetyRoutes";
import { OperationsRoutes } from "@/routes/operationsRoutes";
import { IntelligenceRoutes } from "@/routes/intelligenceRoutes";
import { CommunityRoutes } from "@/routes/communityRoutes";
import { OrganizationRoutes } from "@/routes/organizationRoutes";
import { PlatformRoutes } from "@/routes/platformRoutes";
import { AccountRoutes } from "@/routes/accountRoutes";
import { LegacyRedirects } from "@/routes/legacyRedirects";

registerIncidentReportSync();
const Auth = lazy(() => import("@/pages/Auth"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const queryClient = new QueryClient();

export default function App() {
  return <LanguageProvider><ThemeProvider><QueryClientProvider client={queryClient}><AccessProvider><TooltipProvider><Toaster /><Sonner /><BrowserRouter><GlobalControls /><Suspense fallback={<PageLoading />}><Routes><Route path="/auth" element={<Auth />} /><Route path="/reset-password" element={<ResetPassword />} /><Route path="/" element={<RoleLanding />} />{SafetyRoutes()}{OperationsRoutes()}{IntelligenceRoutes()}{CommunityRoutes()}{OrganizationRoutes()}{PlatformRoutes()}{AccountRoutes()}{LegacyRedirects()}<Route path="*" element={<NotFound />} /></Routes></Suspense></BrowserRouter></TooltipProvider></AccessProvider></QueryClientProvider></ThemeProvider></LanguageProvider>;
}
