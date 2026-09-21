import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuthStore } from "@/providers/AuthProvider";
import { roleAtLeast, hasPermission, type AppRole, type Permission } from "@/lib/insforge";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { LandingPage } from "@/pages/LandingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ScreeningPage } from "@/pages/ScreeningPage";
import { SihScreeningPage } from "@/pages/SihScreeningPage";
import { CasesPage } from "@/pages/CasesPage";
import { CaseDetailPage } from "@/pages/CaseDetailPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { ModelsPage } from "@/pages/ModelsPage";
import { DatasetsPage } from "@/pages/DatasetsPage";
import { SecurityPage } from "@/pages/SecurityPage";
import { AuditPage } from "@/pages/AuditPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AdminPage } from "@/pages/admin/AdminPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminAuthorizationsPage } from "@/pages/admin/AdminAuthorizationsPage";
import { AuthorizationGatePage } from "@/pages/auth/AuthorizationGatePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AccessDeniedPage } from "@/pages/AccessDeniedPage";

function ProtectedRoute({
  children,
  role,
  permission,
  allowedRoles,
}: {
  children?: React.ReactNode;
  role?: AppRole;
  permission?: Permission;
  allowedRoles?: AppRole[];
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-signal-blue border-t-transparent rounded-full animate-spin" />
          Initializing secure session…
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (user && (user.status === "pending" || user.status === "rejected") && user.role !== "admin" && location.pathname !== "/authorization-gate") {
    return <Navigate to="/authorization-gate" replace />;
  }
  if (role && user && !roleAtLeast(user.role, role)) {
    return <Navigate to="/access-denied" replace />;
  }
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />;
  }
  if (permission && user && !hasPermission(user.role, permission)) {
    return <Navigate to="/access-denied" replace />;
  }
  return <>{children ?? <Outlet />}</>;
}

function UnauthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  if (isAuthenticated) {
    if (user && (user.status === "pending" || user.status === "rejected") && user.role !== "admin") {
      return <Navigate to="/authorization-gate" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public landing page — no auth required */}
      <Route path="/" element={<LandingPage />} />

      {/* Member Authorization Gate (Awaiting admin clearance) */}
      <Route path="/authorization-gate" element={<AuthorizationGatePage />} />

      {/* Auth pages — redirect to dashboard if already logged in */}
      <Route element={<UnauthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected app — all require auth */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell>
              <Outlet />
            </AppShell>
          </ProtectedRoute>
        }
      >
        {/* Core routes */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/screening"
          element={
            <ProtectedRoute permission="cases:create">
              <ScreeningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sih-screening"
          element={
            <ProtectedRoute permission="cases:create">
              <SihScreeningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases"
          element={
            <ProtectedRoute permission="cases:view_assigned">
              <CasesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cases/:id"
          element={
            <ProtectedRoute permission="cases:view_assigned">
              <CaseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute permission="reports:access">
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Analytics — Supervisor, Admin, and Analyst */}
        <Route
          path="/analytics"
          element={
            <ProtectedRoute permission="analytics:view">
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />

        {/* Audit Log — Supervisor and Admin */}
        <Route
          path="/audit"
          element={
            <ProtectedRoute permission="audit:view">
              <AuditPage />
            </ProtectedRoute>
          }
        />

        {/* AI Models & Datasets — Inspectable by Analyst, Supervisor, Admin */}
        <Route
          path="/models"
          element={
            <ProtectedRoute permission="models:inspect">
              <ModelsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/datasets"
          element={
            <ProtectedRoute permission="datasets:review">
              <DatasetsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin only — Security Center, Admin Dashboard, User Management */}
        <Route
          path="/security"
          element={
            <ProtectedRoute role="admin">
              <SecurityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute role="admin">
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/authorizations"
          element={
            <ProtectedRoute role="admin">
              <AdminAuthorizationsPage />
            </ProtectedRoute>
          }
        />

        {/* Fallbacks */}
        <Route path="/access-denied" element={<AccessDeniedPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

