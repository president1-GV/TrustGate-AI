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
    expect(AUTHORITATIVE_SYSTEM_ACTOR_ID).toBe("d78d7bfa-d033-412d-8d20-987e0019467c");
  });

  it("AUDIT-002: Maps roster string IDs to genuine PostgreSQL profile UUIDs", () => {
    expect(ROSTER_PROFILE_MAP["officer-duty-roster"]).toBe("06d9077b-2a97-460e-b6ed-38d6a16581c3");
    expect(resolveValidActorId("officer-duty-roster")).toBe("06d9077b-2a97-460e-b6ed-38d6a16581c3");
    expect(resolveValidActorId("supervisor-duty-roster")).toBe("e49cf4a5-e63d-4cac-a54a-436f47da9e52");
    expect(resolveValidActorId("analyst-duty-roster")).toBe("59119414-9a9b-4b00-bade-16e0b1e11ed1");
    expect(resolveValidActorId("admin-duty-roster")).toBe("d78d7bfa-d033-412d-8d20-987e0019467c");
    expect(resolveValidActorId("field-officer-airgap-01")).toBe("d78d7bfa-d033-412d-8d20-987e0019467c");
    expect(resolveValidActorId("90cb3e0d-6bb6-435b-b9b2-8cf4afdbcbf8")).toBe("d78d7bfa-d033-412d-8d20-987e0019467c");
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
