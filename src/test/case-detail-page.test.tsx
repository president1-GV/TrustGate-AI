import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CaseDetailPage } from "@/pages/CaseDetailPage";
import { useAuthStore } from "@/store/auth";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: () => ({ id: "0d6a0eb6-6e91-471a-b8ab-9a8845ae9dec" }),
  };
});

vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    fetchCaseDetails: vi.fn(),
    fetchBlockchainAnchor: vi.fn().mockResolvedValue(null),
  };
});

import * as dbModule from "@/lib/db";

describe("CaseDetailPage Rendering & Fault Tolerance", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    useAuthStore.getState().setSession({
      id: "1400f02a-dbaa-40d0-9e56-de2d00d30b88",
      email: "officer@trustgate.ai",
      name: "Chief Security Officer",
      role: "admin",
      badgeId: "ADMIN-001",
      station: "Central Command",
    });
  });

  it("renders case 0d6a0eb6-6e91-471a-b8ab-9a8845ae9dec cleanly with Aadhaar data", async () => {
    // Mock fetchCaseDetails returning realistic data from case 0d6a0eb6-6e91-471a-b8ab-9a8845ae9dec
    const mockCase: dbModule.CaseDetailBundle = {
      row: {
        id: "0d6a0eb6-6e91-471a-b8ab-9a8845ae9dec",
        case_code: "TG-MUYZAA3B-2BB32F8C",
        created_by: "1400f02a-dbaa-40d0-9e56-de2d00d30b88",
        created_at: "2026-10-08T03:29:58.52259+00:00",
        updated_at: "2026-10-08T03:29:58.52259+00:00",
        document_type: "aadhaar",
        country_code: null,
        status: "UNDER_REVIEW",
        risk_score: 13,
        risk_level: "LOW",
        processing_time_ms: 8498,
        review_status: "OPEN",
        priority: "LOW",
        is_demo: false,
        notes: null,
        profiles: { display_name: "Chief Security Officer", badge_id: "ADMIN-001" },
        assigned: { display_name: "Chief Security Officer" },
      },
      documents: [
        {
          id: "237d6734-9828-4d4b-b07e-02c71afdf94f",
          case_id: "0d6a0eb6-6e91-471a-b8ab-9a8845ae9dec",
          document_type: "aadhaar",
          country_code: null,
          image_quality_score: 48,
          processing_status: "COMPLETED",
          created_at: "2026-10-08T03:29:58.52259+00:00",
          images: [],
          ocr: {
            id: "116446cc-8108-434c-8685-66e453138829",
            provider: "tesseract.js",
            raw_text: "Government of India\n7208 5852 3813\nVinitbhai Mukeshbhai Chaudhari",
            overall_confidence: 0.48,
            fields: [
              {
                id: "4d01c770-d921-4be1-b0d6-2630ecd27864",
                field_name: "DOCUMENT_NUMBER",
                field_value: "7208 5852 3813",
                confidence: 0.95,
                bounding_box: { h: 0, w: 0, x: 0, y: 0 },
                source: "ocr",
                validation_status: "UNVALIDATED",
              },
              {
                id: "2fe8bedc-4d99-493e-b257-c81ad43df691",
                field_name: "FULL_NAME",
                field_value: "Vinitbhai Mukeshbhai Chaudhari",
                confidence: 0.85,
                bounding_box: { h: 0, w: 0, x: 0, y: 0 },
                source: "ocr",
                validation_status: "UNVALIDATED",
              },
            ],
          },
          mrz: {
            id: "171c2ef2-1d25-4bcd-a4a3-177a71308873",
            present: false,
            format: null,
            document_number: null,
            date_of_birth: null,
            expiry_date: null,
            nationality: null,
            sex: null,
            check_digits_valid: false,
            composite_valid: false,
            raw_lines: "[]",
          },
          tampering: {
            id: "b7fdc0ec-5651-4f07-9ac4-fb462bd720c3",
            probability: 100,
            confidence: 84,
            severity: "NONE",
            regions: [],
          },
          face: {
            id: "f2ee15b9-6742-4b78-871d-594e5863d3ab",
            detected: true,
            quality: 6800,
            similarity: 9200,
            pose_yaw: 0,
            pose_pitch: 0,
            blur_score: 0.637,
            result_label: "FACE_DETECTED",
            bounding_box: { h: 676, w: 152, x: 21, y: 156 },
          },
        },
      ],
      validations: [],
      risk: {
        id: "7eaf2342-052f-4f8e-b9bb-61c056f2c7ff",
        score: 13,
        level: "LOW",
        recommended_action: "Proceed with clearance workflow. Aadhaar identity verified.",
        engine_version: "explainable-v1",
        factors: [],
      },
      findings: [],
      reports: [],
      audits: [],
    };

    vi.mocked(dbModule.fetchCaseDetails).mockResolvedValue(mockCase);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/cases/0d6a0eb6-6e91-471a-b8ab-9a8845ae9dec"]}>
          <Routes>
            <Route path="/cases/:id" element={<CaseDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/TG-MUYZAA3B-2BB32F8C/i).length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/Vinitbhai Mukeshbhai Chaudhari/i).length).toBeGreaterThan(0);
  });

  it("handles null OCR, null MRZ, null tampering, and null face gracefully without crashing", async () => {
    const minimalCase: dbModule.CaseDetailBundle = {
      row: {
        id: "minimal-case-123",
        case_code: "TG-MINIMAL-001",
        created_by: "user-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        document_type: "id",
        status: "PENDING",
        review_status: "OPEN",
        priority: "NORMAL",
        is_demo: false,
      },
      documents: [
        {
          id: "doc-min",
          case_id: "minimal-case-123",
          document_type: "id",
          processing_status: "COMPLETED",
          created_at: new Date().toISOString(),
          images: [],
          ocr: null,
          mrz: null,
          tampering: null,
          face: null,
        },
      ],
      validations: [],
      risk: null,
      findings: [],
      reports: [],
      audits: [],
    };

    vi.mocked(dbModule.fetchCaseDetails).mockResolvedValue(minimalCase);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/cases/minimal-case-123"]}>
          <Routes>
            <Route path="/cases/:id" element={<CaseDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/TG-MINIMAL-001/i).length).toBeGreaterThan(0);
    });
  });
});
