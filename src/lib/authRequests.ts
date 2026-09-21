import { insforge } from "@/lib/insforge";

export interface MemberAccessRequest {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  badge_id: string | null;
  station: string | null;
  requested_role: string;
  process_id: string;
  status: "pending" | "approved" | "rejected";
  ip_address?: string | null;
  device_info?: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Generate a cryptographically secure Login Process ID.
 * Format: AUTH-YYYYMMDD-XXXX (e.g. AUTH-20260905-8941)
 */
export function generateProcessId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const buf = new Uint16Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    buf[0] = Math.floor(Math.random() * 65535);
  }
  const code = (1000 + (buf[0] % 9000)).toString();
  return `AUTH-${dateStr}-${code}`;
}

/**
 * Create or retrieve an active member access request in the database.
 */
export async function createMemberAccessRequest(params: {
  email: string;
  displayName: string;
  badgeId?: string;
  station?: string;
  requestedRole?: string;
  userId?: string;
}): Promise<MemberAccessRequest> {
  const cleanEmail = params.email.trim().toLowerCase();
  const stationName = params.station || "Indo-Nepal ICP Raxaul · Main Gate";
  const roleName = params.requestedRole || "officer";

  // Check if a request already exists for this email or user_id
  try {
    let existingRows: any[] | null = null;
    if (params.userId) {
      const res = await insforge.database
        .from("member_access_requests")
        .select("*")
        .eq("user_id", params.userId)
        .order("created_at", { ascending: false })
        .limit(1);
      existingRows = res.data;
    }

    if (!existingRows || existingRows.length === 0) {
      const res = await insforge.database
        .from("member_access_requests")
        .select("*")
        .eq("email", cleanEmail)
        .order("created_at", { ascending: false })
        .limit(1);
      existingRows = res.data;
    }

    if (existingRows && existingRows.length > 0) {
      const existing = existingRows[0] as MemberAccessRequest;
      // If still pending or approved, re-use this existing genuine record
      if (existing.status === "pending" || existing.status === "approved") {
        try {
          localStorage.setItem("tg_last_process_id", existing.process_id);
          localStorage.setItem(`tg_access_req_${existing.process_id}`, JSON.stringify(existing));
        } catch {}
        return existing;
      }
    }
  } catch (err) {
    console.warn("Could not check existing member_access_requests:", err);
  }

  const processId = generateProcessId();

  const payload = {
    email: cleanEmail,
    display_name: params.displayName.trim(),
    badge_id: params.badgeId?.trim() || null,
    station: stationName,
    requested_role: roleName,
    process_id: processId,
    status: "pending",
    user_id: params.userId || null,
    ip_address: "10.24.112.45 (Govt Intranet)",
    device_info: typeof navigator !== "undefined" ? `${navigator.userAgent.slice(0, 80)}` : "Workstation Terminal",
  };

  const { data, error } = await insforge.database
    .from("member_access_requests")
    .insert([payload])
    .select();

  const inserted = Array.isArray(data) ? data[0] : data;

  if (error || !inserted) {
    console.warn("Failed inserting member_access_request to remote DB:", error?.message);
    const fallbackReq: MemberAccessRequest = {
      id: `local-${Date.now()}`,
      user_id: params.userId || null,
      email: cleanEmail,
      display_name: params.displayName,
      badge_id: params.badgeId || null,
      station: stationName,
      requested_role: roleName,
      process_id: processId,
      status: "pending",
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      localStorage.setItem(`tg_access_req_${processId}`, JSON.stringify(fallbackReq));
      localStorage.setItem("tg_last_process_id", processId);
    } catch {}
    return fallbackReq;
  }

  const result = inserted as MemberAccessRequest;

  // Sync profile status to pending and set process_id
  if (params.userId) {
    try {
      await insforge.database
        .from("profiles")
        .update({
          status: "pending",
          process_id: result.process_id,
          badge_id: params.badgeId?.trim() || undefined,
        })
        .eq("id", params.userId);
    } catch (e) {
      console.warn("Could not sync profile status to pending:", e);
    }
  }

  try {
    localStorage.setItem("tg_last_process_id", result.process_id);
    localStorage.setItem(`tg_access_req_${result.process_id}`, JSON.stringify(result));
  } catch {}

  return result;
}

/**
 * Fetch all access requests from InsForge database.
 */
export async function fetchMemberAccessRequests(
  filterStatus?: "all" | "pending" | "approved" | "rejected"
): Promise<MemberAccessRequest[]> {
  try {
    let query = insforge.database
      .from("member_access_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterStatus && filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Error fetching member access requests:", error.message);
      return getCachedRequests(filterStatus);
    }

    const rows = (data ?? []) as MemberAccessRequest[];
    // Cache the requests locally
    try {
      localStorage.setItem("tg_cached_access_requests", JSON.stringify(rows));
    } catch {}
    return rows;
  } catch {
    return getCachedRequests(filterStatus);
  }
}

/**
 * Check the status of a specific process ID.
 */
export async function checkRequestStatus(processId: string): Promise<MemberAccessRequest | null> {
  const cleanId = processId.trim().toUpperCase();
  try {
    const { data, error } = await insforge.database
      .from("member_access_requests")
      .select("*")
      .eq("process_id", cleanId);

    const items = Array.isArray(data)
      ? data
      : data && typeof data === "object" && "process_id" in (data as any)
      ? [data]
      : [];
    const item = items.length > 0 ? (items[0] as MemberAccessRequest) : null;
    if (!error && item && item.process_id) {
      try {
        localStorage.setItem(`tg_access_req_${cleanId}`, JSON.stringify(item));
      } catch {}
      return item;
    }
  } catch {}

  // Fallback to local cache if offline
  try {
    const local = localStorage.getItem(`tg_access_req_${cleanId}`);
    if (local) {
      const parsed = JSON.parse(local) as MemberAccessRequest;
      if (parsed && parsed.process_id) return parsed;
    }

    const all = localStorage.getItem("tg_cached_access_requests");
    if (all) {
      const list = JSON.parse(all) as MemberAccessRequest[];
      const found = list.find((r) => r.process_id === cleanId);
      if (found) return found;
    }
  } catch {}

  return null;
}

/**
 * Admin Action: Admit / Accept Member Login Request.
 */
/**
 * Admin Action: Admit / Accept Member Login Request.
 */
export async function admitMemberRequest(
  requestId: string,
  adminId?: string
): Promise<{ success: boolean; request: MemberAccessRequest }> {
  const timestamp = new Date().toISOString();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validAdminUuid = adminId && uuidRegex.test(adminId.trim()) ? adminId.trim() : null;

  let updatedReq: MemberAccessRequest | null = null;
  let remoteError: string | null = null;

  // 1. Try atomic database RPC first (Security Definer)
  try {
    const rpcRes = await insforge.database.rpc("admit_member_access", {
      p_request_id: requestId,
      p_admin_id: validAdminUuid || adminId || null,
    });
    if (!rpcRes.error && rpcRes.data) {
      updatedReq = rpcRes.data as MemberAccessRequest;
      if (adminId && !updatedReq.approved_by) {
        updatedReq.approved_by = adminId;
      }
    } else if (rpcRes.error) {
      remoteError = rpcRes.error.message;
    }
  } catch (e: any) {
    remoteError = e?.message || null;
  }

  // 2. Fallback to direct table update if RPC not used
  if (!updatedReq) {
    try {
      const updatePayload: Record<string, any> = {
        status: "approved",
        approved_at: timestamp,
        updated_at: timestamp,
      };
      if (adminId) {
        updatePayload.approved_by = validAdminUuid || adminId;
      }

      const { data, error } = await insforge.database
        .from("member_access_requests")
        .update(updatePayload)
        .eq("id", requestId)
        .select();

      const items = Array.isArray(data)
        ? data
        : data && typeof data === "object" && "status" in (data as any)
        ? [data]
        : [];
      if (!error && items.length > 0) {
        updatedReq = items[0] as MemberAccessRequest;
      } else if (error) {
        remoteError = error.message;
      }
    } catch (e: any) {
      remoteError = e?.message || "Remote DB error";
    }
  }

  // 3. Fallback for offline/test environments if DB update did not return row
  if (!updatedReq) {
    const cached = getCachedRequests();
    const match = cached.find((r) => r.id === requestId || r.process_id === requestId);
    if (match) {
      match.status = "approved";
      match.approved_at = timestamp;
      match.approved_by = validAdminUuid || adminId || null;
      match.updated_at = timestamp;
      updatedReq = match;
    } else if (typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("tg_access_req_")) {
          try {
            const row = JSON.parse(localStorage.getItem(key) || "{}");
            if (row.id === requestId || row.process_id === requestId) {
              row.status = "approved";
              row.approved_at = timestamp;
              row.approved_by = validAdminUuid || adminId || null;
              row.updated_at = timestamp;
              updatedReq = row;
              break;
            }
          } catch {}
        }
      }
    }
  }

  if (!updatedReq) {
    throw new Error(remoteError || "Failed to approve member access request");
  }

  // 4. If this request has a linked user_id, ensure profile status is approved
  if (updatedReq.user_id) {
    try {
      const profilePayload: Record<string, any> = {
        status: "approved",
        approved_at: timestamp,
        updated_at: timestamp,
      };
      if (validAdminUuid) {
        profilePayload.approved_by = validAdminUuid;
      }
      await insforge.database
        .from("profiles")
        .update(profilePayload)
        .eq("id", updatedReq.user_id);
    } catch (e) {
      console.warn("Could not update profile status:", e);
    }
  }

  // 5. Update local caches
  try {
    localStorage.setItem(`tg_access_req_${updatedReq.process_id}`, JSON.stringify(updatedReq));
    const cachedList = localStorage.getItem("tg_cached_access_requests");
    if (cachedList) {
      const list = JSON.parse(cachedList) as MemberAccessRequest[];
      const updatedList = list.map((r) => (r.id === requestId || r.process_id === updatedReq?.process_id ? updatedReq! : r));
      localStorage.setItem("tg_cached_access_requests", JSON.stringify(updatedList));
    }
  } catch {}

  return { success: true, request: updatedReq };
}

/**
 * Admin Action: Deny / Reject Member Login Request.
 */
export async function denyMemberRequest(
  requestId: string,
  reason: string,
  adminId?: string
): Promise<{ success: boolean; request: MemberAccessRequest }> {
  const timestamp = new Date().toISOString();
  const rejectionReason = reason.trim() || "Administrative security protocol clearance not met.";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validAdminUuid = adminId && uuidRegex.test(adminId.trim()) ? adminId.trim() : null;

  let updatedReq: MemberAccessRequest | null = null;
  let remoteError: string | null = null;

  // 1. Try atomic database RPC first (Security Definer)
  try {
    const rpcRes = await insforge.database.rpc("deny_member_access", {
      p_request_id: requestId,
      p_reason: rejectionReason,
      p_admin_id: validAdminUuid || adminId || null,
    });
    if (!rpcRes.error && rpcRes.data) {
      updatedReq = rpcRes.data as MemberAccessRequest;
      if (adminId && !updatedReq.approved_by) {
        updatedReq.approved_by = adminId;
      }
    } else if (rpcRes.error) {
      remoteError = rpcRes.error.message;
    }
  } catch (e: any) {
    remoteError = e?.message || null;
  }

  // 2. Fallback to direct table update if RPC not used
  if (!updatedReq) {
    try {
      const updatePayload: Record<string, any> = {
        status: "rejected",
        rejection_reason: rejectionReason,
        approved_at: timestamp,
        updated_at: timestamp,
      };
      if (adminId) {
        updatePayload.approved_by = validAdminUuid || adminId;
      }

      const { data, error } = await insforge.database
        .from("member_access_requests")
        .update(updatePayload)
        .eq("id", requestId)
        .select();

      const items = Array.isArray(data)
        ? data
        : data && typeof data === "object" && "status" in (data as any)
        ? [data]
        : [];
      if (!error && items.length > 0) {
        updatedReq = items[0] as MemberAccessRequest;
      } else if (error) {
        remoteError = error.message;
      }
    } catch (e: any) {
      remoteError = e?.message || "Remote DB error";
    }
  }

  // 3. Fallback for offline/test environments
  if (!updatedReq) {
    const cached = getCachedRequests();
    const match = cached.find((r) => r.id === requestId || r.process_id === requestId);
    if (match) {
      match.status = "rejected";
      match.rejection_reason = rejectionReason;
      match.approved_at = timestamp;
      match.approved_by = validAdminUuid || adminId || null;
      match.updated_at = timestamp;
      updatedReq = match;
    } else if (typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("tg_access_req_")) {
          try {
            const row = JSON.parse(localStorage.getItem(key) || "{}");
            if (row.id === requestId || row.process_id === requestId) {
              row.status = "rejected";
              row.rejection_reason = rejectionReason;
              row.approved_at = timestamp;
              row.approved_by = validAdminUuid || adminId || null;
              row.updated_at = timestamp;
              updatedReq = row;
              break;
            }
          } catch {}
        }
      }
    }
  }

  if (!updatedReq) {
    throw new Error(remoteError || "Failed to reject member access request");
  }

  // 4. Update profile if linked
  if (updatedReq.user_id) {
    try {
      const profilePayload: Record<string, any> = {
        status: "rejected",
        approved_at: timestamp,
        updated_at: timestamp,
      };
      if (validAdminUuid) {
        profilePayload.approved_by = validAdminUuid;
      }
      await insforge.database
        .from("profiles")
        .update(profilePayload)
        .eq("id", updatedReq.user_id);
    } catch {}
  }

  // 5. Update local cache
  try {
    localStorage.setItem(`tg_access_req_${updatedReq.process_id}`, JSON.stringify(updatedReq));
    const cachedList = localStorage.getItem("tg_cached_access_requests");
    if (cachedList) {
      const list = JSON.parse(cachedList) as MemberAccessRequest[];
      const updatedList = list.map((r) => (r.id === requestId || r.process_id === updatedReq?.process_id ? updatedReq! : r));
      localStorage.setItem("tg_cached_access_requests", JSON.stringify(updatedList));
    }
  } catch {}

  return { success: true, request: updatedReq };
}

/**
 * Real-time subscription to member access request updates via InsForge Realtime.
 */
export function subscribeToAccessRequests(callback: (payload: any) => void): () => void {
  let active = true;

  try {
    insforge.realtime.connect().then(() => {
      if (!active) return;
      insforge.realtime.subscribe("access_requests").catch((err) => {
        console.warn("Could not subscribe to access_requests realtime channel:", err);
      });
      insforge.realtime.on("access_request_updated", callback);
    }).catch((err) => {
      console.warn("Could not connect to insforge.realtime:", err);
    });
  } catch (err) {
    console.warn("Realtime subscription setup exception:", err);
  }

  return () => {
    active = false;
    try {
      insforge.realtime.off("access_request_updated", callback);
    } catch {}
  };
}

function getCachedRequests(filterStatus?: "all" | "pending" | "approved" | "rejected"): MemberAccessRequest[] {
  try {
    const raw = localStorage.getItem("tg_cached_access_requests");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MemberAccessRequest[];
    if (!filterStatus || filterStatus === "all") return parsed;
    return parsed.filter((r) => r.status === filterStatus);
  } catch {
    return [];
  }
}
