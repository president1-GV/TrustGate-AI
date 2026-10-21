# TrustGate AI — Security Hardening Report
**Date:** October 21, 2026
**Scope:** Full codebase audit + hardening of TrustGate AI Billion
**Status:** ✅ All identified vulnerabilities remediated

## Vulnerabilities Fixed

### CRITICAL — Client-Side Privilege Escalation (OfficerSwitcherModal)
- Added `canSwitch()` role-rank ceiling — cannot switch to a role higher than your own
- Blocked escalation attempts audited via `auditSecurityEvent("ROLE_SWITCH_DENIED")`
- Higher-privilege cards visually disabled for lower-privilege users

### CRITICAL — JWT Access Token in localStorage
- All token writes migrated to `sessionStorage` (tab-scoped, cleared on close)
- Migration path auto-clears `localStorage` entry on first load
- `logout()` clears both storages
- `tg_authenticated_session` (role cache) also moved to `sessionStorage`

### HIGH — No Login Rate Limiting
- Added per-email rate limiter: 5 attempts → 15-minute lockout
- Generic error messages prevent email enumeration
- Failed attempts audited with attempt count metadata

### HIGH — Localhost in Production CSP
- Removed `http://localhost:8000` and `http://127.0.0.1:8000` from `connect-src`
- Added `base-uri 'self'` and `form-action 'self'` to both `index.html` and `vercel.json`

### HIGH — Missing Security Headers
- Added to `vercel.json`: `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`,
  `Cross-Origin-Embedder-Policy`, `X-Permitted-Cross-Domain-Policies`,
  `X-XSS-Protection`, `Cache-Control: no-store`

### MEDIUM — XSS via AI Output in Print Certificate
- Added `esc()` HTML escaper applied to all AI-provided values in `FaceForensicsCard.tsx`
- Added `noopener,noreferrer` to `window.open()` and nulled `printWindow.opener`

### MEDIUM — Weak Password Policy
- Login: `min(8)`, `max(128)`
- Register: requires uppercase + lowercase + number + `max(128)`
- New helpers: `validatePasswordStrength()`, `validateEmail()` in `security.ts`

### MEDIUM — Error Messages Leak Internal Details
- `sanitizeErrorMessage()` now strips stack traces, webpack/vite paths, CORS details

### LOW — Raw User-Agent Stored in Database
- `authRequests.ts` now strips non-standard chars and caps UA string at 60 chars

## Files Modified
- src/components/layout/OfficerSwitcherModal.tsx
- src/providers/AuthProvider.tsx
- src/lib/insforge.ts
- src/lib/db.ts
- src/lib/security.ts
- src/lib/authRequests.ts
- src/pages/auth/LoginPage.tsx
- src/pages/auth/RegisterPage.tsx
- src/components/screening/FaceForensicsCard.tsx
- src/pages/SettingsPage.tsx
- index.html
- vercel.json
- vite.config.ts
- scripts/security-check.cjs
