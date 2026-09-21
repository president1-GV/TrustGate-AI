# TrustGate AI Billion — Incident Response & Breach Management Plan

**Document ID:** IR-PLAN-2026  
**Version:** 1.0  
**Effective Date:** September 2026  
**Classification:** CONFIDENTIAL — SECURITY OPERATIONS  
**Applicability:** All Engineering, Security Operations, and Administration Personnel  

---

## 1. Objectives & Scope

This Incident Response Plan (IRP) defines the procedures for detecting, containing, investigating, and recovering from security incidents affecting TrustGate AI Billion. Given the critical nature of sovereign identity screening, rapid containment and forensic preservation are paramount.

---

## 2. Incident Classification Matrix

| Severity Level | Definition | Examples | Max Response Time | Escalation Target |
|---|---|---|---|---|
| **P1 — CRITICAL** | Active compromise of core system, database exfiltration, or total bypass of screening authentication. | Service key leak; mass exfiltration of document images; unauthorized database drop or mass alteration; unauthorized admin creation. | **< 15 minutes** | Lead Architect, CISO, Legal, Executive Leadership |
| **P2 — HIGH** | Partial bypass of authorization, compromised supervisor account, or localized denial-of-service. | Privilege escalation from officer to supervisor; tampering with risk score overrides; unhandled file upload RCE attempt. | **< 1 hour** | Lead Security Engineer, Backend Team Lead |
| **P3 — MEDIUM** | Ineffective security control with no active exploitation, localized brute force, or suspicious anomaly rate. | Spike in failed authentication attempts; rate limit triggers; client-side CSP violation reports. | **< 4 hours** | On-call Security Engineer |
| **P4 — LOW** | Minor security misconfiguration, non-exploitable cosmetic issue, or low-risk dependency warning. | Outdated non-production dependency; minor logging discrepancy. | **< 24 hours** | Development Team |

---

## 3. Incident Lifecycle Phases

```
┌─────────────────┐       ┌────────────────────────┐       ┌──────────────────────┐
│  1. DETECTION   │ ----> │ 2. CONTAINMENT         │ ----> │ 3. ERADICATION       │
│  & TRIAGE       │       │ • Revoke JWT sessions  │       │ • Rotate secrets     │
│                 │       │ • Lock accounts        │       │ • Patch RLS / code   │
└─────────────────┘       └────────────────────────┘       └──────────────────────┘
                                                                       │
                                                                       ▼
┌─────────────────┐       ┌────────────────────────┐       ┌──────────────────────┐
│  6. REGULATORY  │ <---- │ 5. POST-MORTEM         │ <---- │ 4. RECOVERY          │
│  DISCLOSURE     │       │ • Root cause analysis  │       │ • Restore data       │
│                 │       │ • Update policies      │       │ • Verify integrity   │
└─────────────────┘       └────────────────────────┘       └──────────────────────┘
```

---

## 4. Operational Playbooks

### Playbook A: Compromised User Credentials / Leaked Session Token
1. **Immediate Revocation**:
   - Access InsForge Auth administration.
   - Terminate active refresh tokens for the compromised account:
     ```sql
     -- Invalidate user sessions immediately
     SELECT auth.revoke_user_sessions('<COMPROMISED_USER_UUID>');
     ```
2. **Account Suspension**:
   - Update user profile status in `profiles` to `SUSPENDED`.
3. **Forensic Audit Query**:
   - Query `audit_logs` for all actions taken by the actor ID within the last 48 hours:
     ```sql
     SELECT id, action, entity_type, entity_id, created_at, metadata
     FROM public.audit_logs
     WHERE actor_id = '<COMPROMISED_USER_UUID>'
     ORDER BY created_at DESC;
     ```
4. **Impact Assessment**: Determine if any cases were illicitly approved (`CLEARED`), modified, or exported. Revert cases to `UNDER_REVIEW`.

---

### Playbook B: Suspected Storage Bucket Exposure
1. **Verify Bucket Privacy**:
   - Inspect InsForge Storage bucket metadata:
     ```bash
     insforge storage list-buckets
     ```
   - Ensure `screening-documents` is set to `public: false`.
2. **Revoke Active Object URLs**:
   - Deploy emergency frontend patch or force page reload across active officer terminals.
3. **Audit Access Logs**:
   - Inspect storage download access logs for anomalous IP addresses or bulk downloading patterns.

---

### Playbook C: Unauthorized Risk Override Attempt
1. **Identify Anomalous Approvals**:
   ```sql
   SELECT a.created_at, a.actor_id, p.email, a.entity_id as case_id, a.metadata
   FROM public.audit_logs a
   JOIN public.profiles p ON p.id = a.actor_id
   WHERE a.action = 'RISK_OVERRIDE'
     AND (a.metadata->>'actor_role') NOT IN ('supervisor', 'admin')
   ORDER BY a.created_at DESC;
   ```
2. **Automated Rollback**:
   - Revert any unauthorized `CLEARED` status back to `FLAGGED`.
   - Dispatch security event alert to the active administrator channel.

---

## 5. Regulatory Notification & Disclosure Procedures

In accordance with GDPR Art. 33/34 and national digital data protection mandates:
1. **72-Hour Notification Window**: If confirmed that unencrypted PII or identity documents have been breached, notice must be prepared for the Data Protection Authority within 72 hours of becoming aware.
2. **Notice Content**:
   - Nature and categories of personal data affected (e.g. passport numbers, names, photos).
   - Estimated number of individuals impacted.
   - Recommended mitigations for affected identity holders.
   - Contact point of the Data Protection Officer (DPO).
3. **Internal Documentation**: Complete forensic dossier must be preserved in `/security/incidents/` with full timestamped database snapshots.
