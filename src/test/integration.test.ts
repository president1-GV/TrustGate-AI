/**
 * TRUSTGATE AI — Integration smoke tests
 *
 * Runs against the live InsForge backend.
 * Credentials are loaded from environment variables — NEVER hardcoded.
 *
 * Required env vars (set in .env.integration or CI secrets):
 *   INTEGRATION_BASE_URL        — InsForge project URL
 *   INTEGRATION_ANON_KEY        — InsForge anon (public) key
 *   INTEGRATION_ADMIN_EMAIL     — Admin demo account email
 *   INTEGRATION_ADMIN_PASSWORD  — Admin demo account password
 *   INTEGRATION_SUP_EMAIL       — Supervisor demo account email
 *   INTEGRATION_SUP_PASSWORD    — Supervisor demo account password
 *   INTEGRATION_OFFICER_EMAIL   — Officer demo account email
 *   INTEGRATION_OFFICER_PASSWORD — Officer demo account password
 *
 * Usage:
 *   node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts
 */

// Must be called before any module imports that need to be un-mocked
import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
vi.unmock("@insforge/sdk");
vi.unmock("react-router-dom");
import { createClient } from "@insforge/sdk";
import type { InsForgeClient } from "@insforge/sdk";

// ── Load credentials from env — NEVER hardcode these ────────────────────────
const BASE_URL = process.env.INTEGRATION_BASE_URL ?? "";
const ANON_KEY = process.env.INTEGRATION_ANON_KEY ?? "";

const DEMO_ACCOUNTS = {
  admin: {
    email: process.env.INTEGRATION_ADMIN_EMAIL ?? "",
    password: process.env.INTEGRATION_ADMIN_PASSWORD ?? "",
    role: "admin",
  },
  supervisor: {
    email: process.env.INTEGRATION_SUP_EMAIL ?? "",
    password: process.env.INTEGRATION_SUP_PASSWORD ?? "",
    role: "supervisor",
  },
  officer: {
    email: process.env.INTEGRATION_OFFICER_EMAIL ?? "",
    password: process.env.INTEGRATION_OFFICER_PASSWORD ?? "",
    role: "officer",
  },
};

// Guard — skip entire test file gracefully if env vars not configured
const SKIP_REASON =
  !BASE_URL || !ANON_KEY || !DEMO_ACCOUNTS.admin.email
    ? "Integration env vars not configured. Create .env.integration from .env.integration.example."
    : undefined;

let client: InsForgeClient;

beforeAll(() => {
  if (SKIP_REASON) return;
  client = createClient({ baseUrl: BASE_URL, anonKey: ANON_KEY });
});

afterAll(async () => {
  if (!client) return;
  await client.auth.signOut().catch(() => undefined);
});

// ── Backend health ─────────────────────────────────────────────────────────────
describe("Backend connectivity", () => {
  it("InsForge health endpoint returns ok", async () => {
    if (SKIP_REASON) { console.warn("SKIP:", SKIP_REASON); return; }
    const res = await fetch(`${BASE_URL}/api/health`);
    const json = (await res.json()) as { status: string };
    expect(json.status).toBe("ok");
  });

  it("Auth config is accessible", async () => {
    if (SKIP_REASON) { console.warn("SKIP:", SKIP_REASON); return; }
    const { data } = await client.auth.getPublicAuthConfig();
    expect(data).toBeTruthy();
  });
});

// ── Authentication ─────────────────────────────────────────────────────────────
describe.each(Object.values(DEMO_ACCOUNTS))(
  "Auth — $role",
  ({ email, password, role }) => {
    it(`can sign in as ${role}`, async () => {
      if (SKIP_REASON || !email || !password) { console.warn("SKIP:", SKIP_REASON ?? "missing credentials"); return; }
      const { error } = await client.auth.signInWithPassword({ email, password });
      expect(error).toBeNull();
    });

    it(`RPC current_app_role returns '${role}'`, async () => {
      if (SKIP_REASON || !email) return;
      const { data, error } = await client.database.rpc("current_app_role", {});
      expect(error).toBeNull();
      expect(data).toBe(role);
    });

    it("profile row exists with display_name", async () => {
      if (SKIP_REASON || !email) return;
      const { data: u } = await client.auth.getCurrentUser();
      expect(u?.user?.id).toBeTruthy();
      const { data: profile, error } = await client.database
        .from("profiles")
        .select("id,display_name,badge_id")
        .eq("id", u!.user!.id)
        .maybeSingle();
      expect(error).toBeNull();
      expect(profile?.display_name).toBeTruthy();
    });

    afterAll(async () => {
      if (!client) return;
      await client.auth.signOut().catch(() => undefined);
    });
  }
);

// ── Seed data ─────────────────────────────────────────────────────────────────
describe("Seed data integrity", () => {
  beforeAll(async () => {
    if (SKIP_REASON) return;
    const { error } = await client.auth.signInWithPassword({
      email: DEMO_ACCOUNTS.admin.email,
      password: DEMO_ACCOUNTS.admin.password,
    });
    if (error) throw error;
  });

  afterAll(async () => {
    if (!client) return;
    await client.auth.signOut().catch(() => undefined);
  });

  it("roles table has exactly 3 rows", async () => {
    if (SKIP_REASON) return;
    const { data, error } = await client.database.from("roles").select("name").order("name");
    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect(data!.map((r: { name: string }) => r.name)).toEqual(["admin", "officer", "supervisor"]);
  });

  it("model_versions table has 5 seeded rows", async () => {
    if (SKIP_REASON) return;
    const { data, error } = await client.database.from("model_versions").select("key,status").order("key");
    expect(error).toBeNull();
    expect(data).toHaveLength(5);
    const keys = data!.map((m: { key: string }) => m.key);
    expect(keys).toEqual(["document", "face", "ocr", "risk", "tampering"]);
    data!.forEach((m: { status: string }) => expect(m.status).toBe("prototype"));
  });

  it("settings table has 5 seeded rows", async () => {
    if (SKIP_REASON) return;
    const { data, error } = await client.database.from("settings").select("key,value").order("key");
    expect(error).toBeNull();
    expect(data).toHaveLength(5);
    const keys = data!.map((s: { key: string }) => s.key);
    expect(keys).toContain("retention_days");
    expect(keys).toContain("high_risk_threshold");
  });

  it("demo cases exist (at least 8)", async () => {
    if (SKIP_REASON) return;
    const { data, error } = await client.database
      .from("cases").select("case_code,risk_level,is_demo").like("case_code", "TG-DEMO%").order("case_code");
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(8);
    (data ?? []).forEach((c: { is_demo: boolean }) => expect(c.is_demo).toBe(true));
  });
});

// ── Case CRUD ─────────────────────────────────────────────────────────────────
describe("Case management CRUD", () => {
  let caseId: string | null = null;
  let userId: string | null = null;

  beforeAll(async () => {
    if (SKIP_REASON) return;
    const { error } = await client.auth.signInWithPassword({
      email: DEMO_ACCOUNTS.officer.email,
      password: DEMO_ACCOUNTS.officer.password,
    });
    if (error) throw error;
    const { data: u } = await client.auth.getCurrentUser();
    userId = u?.user?.id ?? null;
  });

  afterAll(async () => {
    if (!client) return;
    await client.auth.signOut().catch(() => undefined);
  });

  it("officer can create a case", async () => {
    if (SKIP_REASON || !userId) return;
    const code = `TG-TEST-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await client.database.from("cases").insert([{
      case_code: code, created_by: userId!, assigned_to: userId!,
      document_type: "passport", country_code: "US",
      status: "UNDER_REVIEW", risk_score: 42, risk_level: "MEDIUM",
      processing_time_ms: 3100, review_status: "OPEN", priority: "NORMAL",
      is_demo: true, ai_risk_score: 42,
    }]).select("id,case_code").maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    caseId = data?.id ?? null;
  });

  it("officer can read their own case", async () => {
    if (SKIP_REASON || !caseId) return;
    const { data, error } = await client.database
      .from("cases").select("id,case_code,risk_level,status").eq("id", caseId!).maybeSingle();
    expect(error).toBeNull();
    expect(data?.id).toBe(caseId);
  });

  it("officer can insert a risk_score for the case", async () => {
    if (SKIP_REASON || !caseId) return;
    const { error } = await client.database.from("risk_scores").insert([{
      case_id: caseId!, score: 42, level: "MEDIUM",
      recommended_action: "Escalate to supervisor for review.",
      engine_version: "explainable-v1",
    }]);
    expect(error).toBeNull();
  });

  it("officer can insert a finding", async () => {
    if (SKIP_REASON || !caseId) return;
    const { error } = await client.database.from("findings").insert([{
      case_id: caseId!, title: "Test finding", severity: "MEDIUM",
      evidence: "Integration test", model_name: "test-v1",
    }]);
    expect(error).toBeNull();
  });

  it("officer can update case notes", async () => {
    if (SKIP_REASON || !caseId) return;
    const { error } = await client.database
      .from("cases").update({ notes: "Integration test notes." }).eq("id", caseId!);
    expect(error).toBeNull();
  });
});

// ── Audit trail ───────────────────────────────────────────────────────────────
describe("Audit log", () => {
  let userId: string | null = null;

  beforeAll(async () => {
    if (SKIP_REASON) return;
    const { error } = await client.auth.signInWithPassword({
      email: DEMO_ACCOUNTS.admin.email,
      password: DEMO_ACCOUNTS.admin.password,
    });
    if (error) throw error;
    const { data: u } = await client.auth.getCurrentUser();
    userId = u?.user?.id ?? null;
  });

  afterAll(async () => {
    if (!client) return;
    await client.auth.signOut().catch(() => undefined);
  });

  it("can insert an audit event", async () => {
    if (SKIP_REASON || !userId) return;
    const { error } = await client.database.from("audit_logs").insert([{
      actor_id: userId!, action: "INTEGRATION_TEST",
      event_type: "test.smoke", result: "SUCCESS", metadata: { test: true },
    }]);
    expect(error).toBeNull();
  });

  it("can read audit logs", async () => {
    if (SKIP_REASON) return;
    const { data, error } = await client.database
      .from("audit_logs").select("id,action,event_type,result")
      .order("created_at", { ascending: false }).limit(5);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("audit_logs does not allow UPDATE (immutable ledger)", async () => {
    if (SKIP_REASON) return;
    const { data: rows } = await client.database.from("audit_logs").select("id").limit(1);
    if (!rows?.length) return;
    const { error } = await client.database
      .from("audit_logs").update({ result: "TAMPERED" }).eq("id", rows[0].id);
    expect(error).not.toBeNull();
  });
});

// ── Notifications ─────────────────────────────────────────────────────────────
describe("Notifications", () => {
  let userId: string | null = null;

  beforeAll(async () => {
    if (SKIP_REASON) return;
    const { error } = await client.auth.signInWithPassword({
      email: DEMO_ACCOUNTS.admin.email,
      password: DEMO_ACCOUNTS.admin.password,
    });
    if (error) throw error;
    const { data: u } = await client.auth.getCurrentUser();
    userId = u?.user?.id ?? null;
  });

  afterAll(async () => {
    if (!client) return;
    await client.auth.signOut().catch(() => undefined);
  });

  it("can read own notifications", async () => {
    if (SKIP_REASON || !userId) return;
    const { data, error } = await client.database
      .from("notifications").select("id,title,kind,read_at").eq("user_id", userId!).limit(20);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("can mark a notification as read", async () => {
    if (SKIP_REASON || !userId) return;
    const { data: inserted } = await client.database.from("notifications").insert([{
      user_id: userId!, title: "Test Notification",
      body: "Integration test notification body.", kind: "info",
    }]).select("id").maybeSingle();
    if (!inserted?.id) return;
    const { error } = await client.database.from("notifications")
      .update({ read_at: new Date().toISOString() }).eq("id", inserted.id).eq("user_id", userId!);
    expect(error).toBeNull();
  });
});

// ── RLS isolation ─────────────────────────────────────────────────────────────
describe("RLS — access isolation", () => {
  it("unauthenticated client gets empty results (not an error)", async () => {
    if (SKIP_REASON) return;
    await client.auth.signOut();
    const { data, error } = await client.database.from("cases").select("id").limit(5);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("unauthenticated client cannot read model_versions (RLS blocks anon)", async () => {
    if (SKIP_REASON) return;
    const { data } = await client.database.from("model_versions").select("key").limit(5);
    expect(data).toEqual([]);
  });
});
