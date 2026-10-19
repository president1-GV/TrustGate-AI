/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  REAL_SHOWCASE_SPECIMENS,
  resolveSpecimenUrl,
  registerUserScannedSpecimen,
  getUserScannedSpecimens,
} from "@/lib/specimenResolver";
import fs from "fs";
import path from "path";

describe("TRUSTGATE AI — 10 LIVE CREDENTIAL SPECIMENS & RESOLVER SUITE", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("SPEC-01: Exactly 10 authoritative specimens exist in REAL_SHOWCASE_SPECIMENS", () => {
    expect(REAL_SHOWCASE_SPECIMENS).toHaveLength(10);
  });

  it("SPEC-02: Every showcase specimen is strictly Passport, Visa, or National Identity (Aadhaar)", () => {
    const allowedPatterns = ["passport", "visa", "aadhaar", "national identity", "id"];
    for (const specimen of REAL_SHOWCASE_SPECIMENS) {
      const typeLower = specimen.document_type.toLowerCase();
      const matches = allowedPatterns.some((pattern) => typeLower.includes(pattern));
      expect(matches).toBe(true);
      expect(specimen.image_url).toMatch(/^\/specimens\/capture-.*\.jpg$/);
    }
  });

  it("SPEC-03: All 10 showcase specimen files physically exist on disk and are valid JPEGs", () => {
    for (const specimen of REAL_SHOWCASE_SPECIMENS) {
      const filePath = path.join(process.cwd(), "public", specimen.image_url);
      expect(fs.existsSync(filePath)).toBe(true);

      const buffer = fs.readFileSync(filePath);
      expect(buffer.length).toBeGreaterThan(1000);
      // JPEG magic bytes: 0xFF, 0xD8
      expect(buffer[0]).toBe(0xff);
      expect(buffer[1]).toBe(0xd8);
    }
  });

  it("SPEC-04: registerUserScannedSpecimen persists uploaded image in localStorage and sessionStorage", () => {
    const fakeDataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...";
    registerUserScannedSpecimen({
      id: "case-user-001",
      case_code: "TG-LIVE-USER-9999",
      document_type: "Passport (User Uploaded)",
      country_code: "USA",
      risk_level: "LOW",
      image_url: fakeDataUrl,
    });

    // Check localStorage cache for case
    expect(localStorage.getItem("tg_doc_img_TG-LIVE-USER-9999")).toBe(fakeDataUrl);
    expect(localStorage.getItem("tg_doc_img_case-user-001")).toBe(fakeDataUrl);

    // Check getUserScannedSpecimens
    const scanned = getUserScannedSpecimens();
    expect(scanned.length).toBeGreaterThanOrEqual(1);
    expect(scanned[0].case_code).toBe("TG-LIVE-USER-9999");
    expect(scanned[0].image_url).toBe(fakeDataUrl);
  });

  it("SPEC-05: resolveSpecimenUrl returns cached data URL for user scanned cases", () => {
    const fakeDataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...";
    localStorage.setItem("tg_doc_img_TG-TEST-CASE-8888", fakeDataUrl);

    const resolved = resolveSpecimenUrl(null, "TG-TEST-CASE-8888", "Passport");
    expect(resolved).toBe(fakeDataUrl);
  });

  it("SPEC-06: resolveSpecimenUrl resolves valid category fallbacks for unknown IDs without crashing", () => {
    const resolvedPassport = resolveSpecimenUrl(null, "TG-UNKNOWN-PASS", "Passport");
    expect(resolvedPassport).toMatch(/^\/specimens\/capture-.*\.jpg$/);

    const resolvedAadhaar = resolveSpecimenUrl(null, "TG-UNKNOWN-AADH", "Aadhaar Card");
    expect(resolvedAadhaar).toMatch(/^\/specimens\/capture-.*\.jpg$/);

    const resolvedVisa = resolveSpecimenUrl(null, "TG-UNKNOWN-VISA", "Visa");
    expect(resolvedVisa).toMatch(/^\/specimens\/capture-.*\.jpg$/);
  });

  it("SPEC-07: registerUserScannedSpecimen fires tg:db_updated and updates tg:last_db_change", () => {
    let dbUpdatedFired = false;
    let caseSavedFired = false;
    const onDbUpdate = () => { dbUpdatedFired = true; };
    const onCaseSaved = () => { caseSavedFired = true; };

    window.addEventListener("tg:db_updated", onDbUpdate);
    window.addEventListener("trustgate:case_saved", onCaseSaved);

    registerUserScannedSpecimen({
      id: "case-event-001",
      case_code: "TG-LIVE-EVENT-1234",
      document_type: "Visa",
      country_code: "DEU",
      risk_level: "LOW",
      image_url: "/specimens/capture-1790073888433-da671263-a862-4ab0-9b05-29a8395dd733.jpg",
    });

    window.removeEventListener("tg:db_updated", onDbUpdate);
    window.removeEventListener("trustgate:case_saved", onCaseSaved);

    expect(dbUpdatedFired).toBe(true);
    expect(caseSavedFired).toBe(true);
    expect(localStorage.getItem("tg:last_db_change")).toBeTruthy();
  });

  it("SPEC-08: getUserScannedSpecimens returns latest items at index 0 and limits to 20", () => {
    for (let i = 1; i <= 25; i++) {
      registerUserScannedSpecimen({
        id: `case-num-${i}`,
        case_code: `TG-NUM-${i}`,
        document_type: "Passport",
        country_code: "USA",
        risk_level: "LOW",
        image_url: "/specimens/capture-1790478296233-94e9f5a0-5482-43e9-ba76-a03b449c3d44.jpg",
      });
    }

    const items = getUserScannedSpecimens();
    expect(items.length).toBe(20);
    expect(items[0].case_code).toBe("TG-NUM-25");
  });
});
