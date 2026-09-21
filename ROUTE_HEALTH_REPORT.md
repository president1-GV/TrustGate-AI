# TRUSTGATE AI BILLION — ROUTE & APPLICATION HEALTH REPORT
**Document Reference**: `ROUTE_HEALTH_REPORT.md`  
**Phase Reference**: Phase 28 — Route & Website Health Check  
**Inspection Date**: 2026-09-05T23:35:00Z  
**Verification Result**: 23/23 Routes Audited · ZERO Broken Links · Clean Router Tree  

---

## 1. Route Verification Summary Table

| Path | Component | Guard Type | Required Permission / Role | Route Status | Dynamic Params |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `/` | `LandingPage` | Public | None | ✅ HEALTHY | None |
| `/login` | `LoginPage` | Unauth Only | Redirects to `/dashboard` if authenticated | ✅ HEALTHY | None |
| `/register` | `RegisterPage` | Unauth Only | Redirects to `/dashboard` if authenticated | ✅ HEALTHY | None |
| `/forgot-password` | `ForgotPasswordPage` | Unauth Only | Redirects to `/dashboard` if authenticated | ✅ HEALTHY | None |
| `/reset-password` | `ResetPasswordPage` | Unauth Only | Token in URL query / hash | ✅ HEALTHY | Query parameters |
| `/authorization-gate`| `AuthorizationGatePage` | Auth Guard | Enforces `status === "pending"` | ✅ HEALTHY | None |
| `/dashboard` | `DashboardPage` | AppShell Guard | Authenticated Active User | ✅ HEALTHY | None |
| `/screening` | `ScreeningPage` | AppShell Guard | `permission: cases:create` | ✅ HEALTHY | None |
| `/sih-screening` | `SihScreeningPage` | AppShell Guard | `permission: cases:create` | ✅ HEALTHY | Tab query parameters |
| `/cases` | `CasesPage` | AppShell Guard | `permission: cases:view_assigned` | ✅ HEALTHY | Filter query parameters |
| `/cases/:id` | `CaseDetailPage` | AppShell Guard | `permission: cases:view_assigned` | ✅ HEALTHY | `:id` (UUID validated) |
| `/reports` | `ReportsPage` | AppShell Guard | `permission: reports:access` | ✅ HEALTHY | None |
| `/settings` | `SettingsPage` | AppShell Guard | Authenticated Active User | ✅ HEALTHY | None |
| `/analytics` | `AnalyticsPage` | AppShell Guard | `permission: analytics:view` | ✅ HEALTHY | None |
| `/audit` | `AuditPage` | AppShell Guard | `permission: audit:view` | ✅ HEALTHY | Filter query parameters |
| `/models` | `ModelsPage` | AppShell Guard | `permission: models:inspect` | ✅ HEALTHY | None |
| `/datasets` | `DatasetsPage` | AppShell Guard | `permission: datasets:review` | ✅ HEALTHY | None |
| `/security` | `SecurityPage` | AppShell Guard | `role: admin` | ✅ HEALTHY | None |
| `/admin` | `AdminPage` | AppShell Guard | `role: admin` | ✅ HEALTHY | None |
| `/admin/users` | `AdminUsersPage` | AppShell Guard | `role: admin` | ✅ HEALTHY | None |
| `/admin/authorizations`| `AdminAuthorizationsPage` | AppShell Guard | `role: admin` | ✅ HEALTHY | None |
| `/access-denied` | `AccessDeniedPage` | Public Fallback| None | ✅ HEALTHY | None |
| `*` | `NotFoundPage` | Catch-All 404 | None | ✅ HEALTHY | None |

---

## 2. Dynamic Routing & Security Bounds

1. **UUID Path Injection Defense on `/cases/:id`**:
   - The parameter `:id` is consumed by `useParams()` in `CaseDetailPage.tsx`.
   - The ID is validated against UUID v4 format. If invalid or nonexistent in InsForge PostgREST, a user-friendly error card is displayed with a secure redirect button back to `/cases`.
   - Insecure Direct Object Reference (IDOR) is completely neutralized by PostgreSQL RLS: even with a valid case UUID, queries fail if the case does not belong or is not assigned to the requesting officer.

2. **Authorization Gate Trapping**:
   - Newly registered officers receive `status = "pending"`.
   - `ProtectedRoute` in `src/router/index.tsx` strictly checks:
     ```typescript
     if (user && user.status === "pending" && user.role !== "admin" && location.pathname !== "/authorization-gate") {
       return <Navigate to="/authorization-gate" replace />;
     }
     ```
   - Officers awaiting clearance cannot access any internal border tools, cases, or reports.

3. **Single Source of Truth Continuity**:
   - Navigating between `/screening` and `/sih-screening` seamlessly preserves the active document, cryptographic hash, and forensic results via `ScreeningContext`.
   - Zero state discrepancies exist between the two operational dashboards.
