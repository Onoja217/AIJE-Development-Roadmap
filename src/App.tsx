import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { CommunityDashboard } from "@/components/CommunityDashboard";
import { EmergencyResourceMap } from "@/components/EmergencyResourceMap";

import Index from "./pages/Index";
import SensorManagement from "./pages/SensorManagement";
import ControlPanel from "./pages/ControlPanel";
import DetectionManager from "./pages/DetectionManager";
import FaceRecognition from "./pages/FaceRecognition";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import Deployments from "./pages/Deployments";
import BillingCallback from "./pages/BillingCallback";
import AdminWebhooks from "./pages/AdminWebhooks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
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

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;