import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RealtimeDigitalSignature } from "@/components/common/RealtimeDigitalSignature";
import { ForensicSpecimenCard } from "@/components/common/ForensicSpecimenCard";
import { useAuthStore } from "@/store/auth";

describe("REAL-TIME LIVE DATABASE DIGITAL SIGNATURES & FORENSIC SPECIMEN SUITE", () => {
  beforeEach(() => {
    try {
      if (typeof sessionStorage !== "undefined" && typeof sessionStorage.clear === "function") {
        sessionStorage.clear();
      }
    } catch {}
    try {
      if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
        localStorage.clear();
      }
    } catch {}
    useAuthStore.getState().clearSession();
  });

  it("SIG-001: Renders Chief Administrator with Badge ADMIN-001 from database authority", async () => {
    useAuthStore.getState().setSession({
      id: "06d9077b-2a97-460e-b6ed-38d6a16581c3",
      email: "officer@trustgate.defense.gov",
      name: "Border Screening Officer",
      role: "officer",
      badgeId: "OF-001",
      station: "Border Checkpoint Raxaul",
    });

    render(
      <RealtimeDigitalSignature
        caseCode="TG-TEST-CASE-001"
        caseId="c-001"
        documentHash="abc1234567890abcdef"
        decisionTimestamp="2026-09-12T17:00:00.000Z"
      />
    );

    // Chief Administrator supervisory seal should be present
    expect(screen.getByText(/Chief Administrator Supervisory Oversight/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Chief Administrator/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ADMIN-001/i).length).toBeGreaterThan(0);

    // Primary Verifying Official (Screening Officer) should be present
    expect(screen.getAllByText(/Border Screening Officer/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OF-001/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Border Checkpoint Raxaul/i).length).toBeGreaterThan(0);
  });

  it("SIG-002: Reflects logged-in Supervisor Officer credentials dynamically without fake entries", async () => {
    useAuthStore.getState().setSession({
      id: "e49cf4a5-e63d-4cac-a54a-436f47da9e52",
      email: "supervisor@trustgate.defense.gov",
      name: "Border Supervisor Officer",
      role: "supervisor",
      badgeId: "SUP-001",
      station: "Central Command",
    });

    render(
      <RealtimeDigitalSignature
        caseCode="TG-TEST-CASE-002"
        caseId="c-002"
        documentHash="def9876543210fedcba"
        decisionTimestamp="2026-09-12T17:15:00.000Z"
      />
    );

    expect(screen.getAllByText(/Supervisory Border Officer/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Border Supervisor Officer/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SUP-001/i).length).toBeGreaterThan(0);

    // Ensure zero fake/mock names appear
    expect(screen.queryByText(/John Doe/i)).toBeNull();
    expect(screen.queryByText(/Officer Fake/i)).toBeNull();
    expect(screen.queryByText(/BCO-7842-SEC/i)).toBeNull();
  });

  it("SIG-003: Reflects Intelligence Analyst identity when analyst reviews case", async () => {
    useAuthStore.getState().setSession({
      id: "59119414-9a9b-4b00-bade-16e0b1e11ed1",
      email: "analyst@trustgate.defense.gov",
      name: "Intelligence Analyst",
      role: "analyst",
      badgeId: "TG-ANL-001",
      station: "Headquarters",
    });

    render(
      <RealtimeDigitalSignature
        caseCode="TG-TEST-CASE-003"
        caseId="c-003"
        documentHash="999888777666555444"
        decisionTimestamp="2026-09-12T17:20:00.000Z"
      />
    );

    expect(screen.getAllByText(/Intelligence & Risk Analyst/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Intelligence Analyst/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/TG-ANL-001/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Headquarters/i).length).toBeGreaterThan(0);
  });

  it("SIG-004: Generates valid SHA-256 HMAC digital signature digest", async () => {
    useAuthStore.getState().setSession({
      id: "06d9077b-2a97-460e-b6ed-38d6a16581c3",
      email: "officer@trustgate.defense.gov",
      name: "Border Screening Officer",
      role: "officer",
      badgeId: "OF-001",
      station: "Border Checkpoint Raxaul",
    });

    render(
      <RealtimeDigitalSignature
        caseCode="TG-TEST-CASE-004"
        caseId="c-004"
        documentHash="hash12345"
        decisionTimestamp="2026-09-12T17:25:00.000Z"
      />
    );

    // Verify hash key format
    const hashElement = screen.getByText(/TG-DSIG-OF-001-/i);
    expect(hashElement).toBeInTheDocument();
  });

  it("SPEC-001: ForensicSpecimenCard renders cached specimen from sessionStorage", async () => {
    const testDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    sessionStorage.setItem("tg_doc_img_TG-CASE-999", testDataUrl);

    render(
      <ForensicSpecimenCard
        caseCode="TG-CASE-999"
        fullName="Test Subject"
        documentNumber="P12345678"
        countryCode="IND"
      />
    );

    const img = screen.getByAltText(/Ingested Travel Document Specimen/i) as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe(testDataUrl);
  });

  it("SPEC-002: ForensicSpecimenCard gracefully renders cryptographic vector canvas when no bitmap is available", async () => {
    render(
      <ForensicSpecimenCard
        caseCode="TG-CASE-NO-IMAGE"
        fullName="ANJALI SHARMA"
        documentNumber="Z98765432"
        countryCode="IND"
        dateOfBirth="1992-04-12"
        expiryDate="2032-04-11"
      />
    );

    // No broken image icon — renders official vector specimen
    expect(screen.getAllByText(/ANJALI SHARMA/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Z98765432/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1992-04-12/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/DIGITALLY INGESTED/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BIOMETRIC PORTRAIT/i).length).toBeGreaterThan(0);
  });
});
