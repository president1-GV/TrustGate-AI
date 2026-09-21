import { describe, it, expect, vi } from "vitest";
import {
  generateProcessId,
  createMemberAccessRequest,
  admitMemberRequest,
  denyMemberRequest,
  checkRequestStatus,
  subscribeToAccessRequests,
} from "@/lib/authRequests";

describe("Member Access Authority Real-Time Database Suite", () => {
  it("MEMBER-AUTH-01: generateProcessId formats valid cryptographic ID (AUTH-YYYYMMDD-XXXX)", () => {
    const id1 = generateProcessId();
    const id2 = generateProcessId();

    expect(id1).toMatch(/^AUTH-\d{8}-\d{4}$/);
    expect(id2).toMatch(/^AUTH-\d{8}-\d{4}$/);
    expect(id1).not.toBe(id2);
  });

  it("MEMBER-AUTH-02: createMemberAccessRequest initializes real officer request with status 'pending'", async () => {
    const req = await createMemberAccessRequest({
      email: "test.border.officer@domain.gov",
      displayName: "Officer Rahul Sen",
      badgeId: "TG-9941",
      station: "Indo-Nepal ICP Raxaul · Terminal 01",
      requestedRole: "officer",
      userId: "test-user-uuid-1234",
    });

    expect(req).toBeDefined();
    expect(req.status).toBe("pending");
    expect(req.display_name).toBe("Officer Rahul Sen");
    expect(req.email).toBe("test.border.officer@domain.gov");
    expect(req.badge_id).toBe("TG-9941");
    expect(req.process_id).toMatch(/^AUTH-\d{8}-\d{4}$/);
  });

  it("MEMBER-AUTH-03: checkRequestStatus retrieves the cached/db request by process_id", async () => {
    const created = await createMemberAccessRequest({
      email: "status.check@border.nic.in",
      displayName: "Inspector Kavita Sharma",
      badgeId: "TG-5520",
    });

    const fetched = await checkRequestStatus(created.process_id);
    expect(fetched).toBeDefined();
    expect(fetched?.process_id).toBe(created.process_id);
    expect(fetched?.display_name).toBe("Inspector Kavita Sharma");
  });

  it("MEMBER-AUTH-04: admin admission approves request and updates status to 'approved'", async () => {
    const req = await createMemberAccessRequest({
      email: "admit.test@border.gov",
      displayName: "Officer Vikram Malhotra",
      badgeId: "TG-8812",
      userId: "user-to-admit-123",
    });

    const admitted = await admitMemberRequest(req.id, "admin-user-uuid");
    expect(admitted.success).toBe(true);
    expect(admitted.request.status).toBe("approved");
    expect(admitted.request.approved_by).toBe("admin-user-uuid");
    expect(admitted.request.approved_at).toBeDefined();
  });

  it("MEMBER-AUTH-05: admin denial rejects request with recorded reason", async () => {
    const req = await createMemberAccessRequest({
      email: "deny.test@border.gov",
      displayName: "Suspicious Registrant",
      badgeId: "BADGE-INVALID",
      userId: "user-to-deny-456",
    });

    const denied = await denyMemberRequest(req.id, "Duty roster verification failed", "admin-user-uuid");
    expect(denied.success).toBe(true);
    expect(denied.request.status).toBe("rejected");
    expect(denied.request.rejection_reason).toBe("Duty roster verification failed");
  });

  it("MEMBER-AUTH-06: subscribeToAccessRequests wires listener and returns cleanup function", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAccessRequests(listener);

    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
  });
});
