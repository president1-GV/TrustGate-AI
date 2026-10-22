/**
 * Persona and Officer Batch/Badge ID Resolver
 * Provides authoritative Batch IDs for demo personas and fallback resolution.
 */
export const DEMO_BATCH_IDS = {
  admin: "ADM-001",
  supervisor: "SUP-4402",
  officer: "FO-8921",
  analyst: "FOR-1109",
  airgap: "AIRGAP-001",
} as const;

export interface DemoPersonaConfig {
  role: "admin" | "supervisor" | "officer" | "analyst";
  label: string;
  email: string;
  batchId: string;
  badgeId: string;
  desc: string;
  station: string;
  clearance: string;
}

export const DEMO_PERSONAS: DemoPersonaConfig[] = [
  {
    role: "officer",
    label: "Officer",
    email: "officer@trustgate.ai",
    batchId: "FO-8921",
    badgeId: "FO-8921",
    desc: "Screening & Verification",
    station: "Indo-Nepal ICP Raxaul · Lane 04",
    clearance: "Level 1 — Operational Screener",
  },
  {
    role: "supervisor",
    label: "Supervisor",
    email: "supervisor@trustgate.ai",
    batchId: "SUP-4402",
    badgeId: "SUP-4402",
    desc: "All Cases & Risk Override",
    station: "Indo-Nepal ICP Raxaul · Command & Escalation Desk",
    clearance: "Level 2 — Supervisory Authority",
  },
  {
    role: "admin",
    label: "Admin",
    email: "admin@trustgate.ai",
    batchId: "ADM-001",
    badgeId: "ADM-001",
    desc: "Full Access & Security Center",
    station: "ICP Central Command · Headquarters",
    clearance: "Level 4 — Full Border Administrator",
  },
  {
    role: "analyst",
    label: "Analyst",
    email: "analyst@trustgate.ai",
    batchId: "FOR-1109",
    badgeId: "FOR-1109",
    desc: "Read-only Analytics",
    station: "Forensic Document Lab · HQ",
    clearance: "Level 3 — Forensic Document Examiner",
  },
];

export function resolveUserBatchId(user?: {
  role?: string | null;
  email?: string | null;
  badgeId?: string | null;
  batchId?: string | null;
} | null): string {
  if (!user) return DEMO_BATCH_IDS.officer;
  if (user.batchId && user.batchId.trim()) return user.batchId.trim();
  if (user.badgeId && user.badgeId.trim()) return user.badgeId.trim();

  const email = (user.email || "").toLowerCase().trim();
  const role = (user.role || "").toLowerCase().trim();

  if (email === "admin@trustgate.ai" || role === "admin") return DEMO_BATCH_IDS.admin;
  if (email === "supervisor@trustgate.ai" || role === "supervisor") return DEMO_BATCH_IDS.supervisor;
  if (email === "analyst@trustgate.ai" || role === "analyst") return DEMO_BATCH_IDS.analyst;
  if (email === "officer@trustgate.ai" || role === "officer") return DEMO_BATCH_IDS.officer;
  if (email.includes("airgap")) return DEMO_BATCH_IDS.airgap;

  return DEMO_BATCH_IDS.officer;
}
