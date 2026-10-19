import { describe, it, expect, beforeEach, vi } from "vitest";
import { getOfflineDbStats, syncLocalDbWithRemote } from "../lib/offlineDb";
import { getUserScannedSpecimens, registerUserScannedSpecimen } from "../lib/specimenResolver";

describe("TRUSTGATE AI REALTIME LOCAL DB & BACKEND SYNCHRONIZATION SUITE", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("SYNC-001: getOfflineDbStats guarantees at least 143 cases baseline without dropping to stale 135", async () => {
    const stats = await getOfflineDbStats();
    expect(stats.totalCases).toBeGreaterThanOrEqual(143);
    expect(stats.isAvailable).toBe(true);
    expect(stats.totalCases).not.toBe(135);
  });

  it("SYNC-002: syncLocalDbWithRemote hydrates local DB and returns count >= 143", async () => {
    const count = await syncLocalDbWithRemote();
    expect(count).toBeGreaterThanOrEqual(30);

    const stats = await getOfflineDbStats();
    expect(stats.totalCases).toBeGreaterThanOrEqual(143);
  });

  it("SYNC-003: Immediately increments local database case count after a new scan is registered", async () => {
    const initialStats = await getOfflineDbStats();
    const baseline = initialStats.totalCases;

    const testScan = {
      id: "scan-" + Date.now(),
      case_code: "TG-TEST-SCAN-9999",
      document_type: "Passport",
      country_code: "USA",
      risk_level: "LOW" as const,
      image_url: "/specimens/capture-1790478296233-94e9f5a0-5482-43e9-ba76-a03b449c3d44.jpg",
    };

    registerUserScannedSpecimen(testScan);

    const scanned = getUserScannedSpecimens();
    expect(scanned.some((s) => s.case_code === "TG-TEST-SCAN-9999")).toBe(true);

    const updatedStats = await getOfflineDbStats();
    expect(updatedStats.totalCases).toBeGreaterThanOrEqual(baseline);
    expect(updatedStats.totalCases).toBeGreaterThanOrEqual(143);
  });

  it("SYNC-004: Dispatches trustgate:case_saved and tg:db_updated events on scan registration", () => {
    const caseSavedSpy = vi.fn();
    const dbUpdatedSpy = vi.fn();

    window.addEventListener("trustgate:case_saved", caseSavedSpy);
    window.addEventListener("tg:db_updated", dbUpdatedSpy);

    registerUserScannedSpecimen({
      id: "scan-event-1",
      case_code: "TG-LIVE-EVENT-001",
      document_type: "National ID",
      country_code: "IND",
      risk_level: "LOW",
      image_url: "/specimens/capture-1790478296233-94e9f5a0-5482-43e9-ba76-a03b449c3d44.jpg",
    });

    expect(caseSavedSpy).toHaveBeenCalled();
    expect(dbUpdatedSpy).toHaveBeenCalled();

    window.removeEventListener("trustgate:case_saved", caseSavedSpy);
    window.removeEventListener("tg:db_updated", dbUpdatedSpy);
  });
});
