import { describe, it, expect, vi } from "vitest";
import {
  resolveValidActorId,
  AUTHORITATIVE_SYSTEM_ACTOR_ID,
  ROSTER_PROFILE_MAP,
  auditSecurityEvent,
} from "../lib/security";
import { listAuditLogs } from "../lib/db";

describe("TRUSTGATE AI AUDIT LOG & AUTH INTEGRITY SUITE", () => {
  it("AUDIT-001: Fallback actor ID matches authoritative admin profile UUID", () => {
    expect(AUTHORITATIVE_SYSTEM_ACTOR_ID).toBe("1400f02a-dbaa-40d0-9e56-de2d00d30b88");
  });

  it("AUDIT-002: Maps roster string IDs to genuine PostgreSQL profile UUIDs", () => {
    expect(ROSTER_PROFILE_MAP["officer-duty-roster"]).toBe("d10e0c8e-4eb6-4b4c-8e16-7e0037e1fe33");
    expect(resolveValidActorId("officer-duty-roster")).toBe("d10e0c8e-4eb6-4b4c-8e16-7e0037e1fe33");
    expect(resolveValidActorId("supervisor-duty-roster")).toBe("90cb3e0d-6bb6-435b-b9b2-8cf4afdbcbf8");
    expect(resolveValidActorId("analyst-duty-roster")).toBe("eeafc303-c06b-46a5-b6b8-c38989520e9b");
    expect(resolveValidActorId("admin-duty-roster")).toBe("1400f02a-dbaa-40d0-9e56-de2d00d30b88");
    expect(resolveValidActorId("field-officer-airgap-01")).toBe("1400f02a-dbaa-40d0-9e56-de2d00d30b88");
    expect(resolveValidActorId("90cb3e0d-6bb6-435b-b9b2-8cf4afdbcbf8")).toBe("90cb3e0d-6bb6-435b-b9b2-8cf4afdbcbf8");
  });

  it("AUDIT-003: Leaves valid custom UUIDs intact", () => {
    const validUuid = "143089fe-c1e8-4391-80ac-3e29ca3ad426";
    expect(resolveValidActorId(validUuid)).toBe(validUuid);
  });

  it("AUDIT-004: Dispatches trustgate:audit_log_added and audit_logs_changed window events", async () => {
    const addedSpy = vi.fn();
    const changedSpy = vi.fn();
    window.addEventListener("trustgate:audit_log_added", addedSpy);
    window.addEventListener("audit_logs_changed", changedSpy);

    await auditSecurityEvent({
      actorId: "06d9077b-2a97-460e-b6ed-38d6a16581c3",
      action: "USER_LOGIN",
      eventType: "auth.login.success",
      result: "SUCCESS",
      metadata: { email: "officer@trustgate.ai" },
    });

    expect(addedSpy).toHaveBeenCalled();
    expect(changedSpy).toHaveBeenCalled();

    window.removeEventListener("trustgate:audit_log_added", addedSpy);
    window.removeEventListener("audit_logs_changed", changedSpy);
  });

  it("AUDIT-005: listAuditLogs returns enriched records without crashing", async () => {
    const logs = await listAuditLogs({ limit: 50 });
    expect(Array.isArray(logs)).toBe(true);
    if (logs.length > 0) {
      expect(logs[0]).toHaveProperty("action");
      expect(logs[0]).toHaveProperty("event_type");
      expect(logs[0]).toHaveProperty("actor");
    }
  });
});
