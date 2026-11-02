import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScreeningPage } from "@/pages/ScreeningPage";
import { CaseDetailPage } from "@/pages/CaseDetailPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { useAuthStore } from "@/store/auth";
import * as dbModule from "@/lib/db";

// Global mock state for ScreeningContext
const mockContextState = {
  pipelineResult: null as any,
  processingRunId: null as any,
  documentImage: "data:image/jpeg;base64,sample",
  documentMimeType: "image/jpeg",
  stageModules: [],
  overallProgress: 100,
  isProcessing: false,
  startAnalysis: vi.fn(),
  resetPipeline: vi.fn(),
};

vi.mock("@/providers/ScreeningContext", () => ({
  useScreeningContext: () => mockContextState,
  ScreeningProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock database functions
vi.mock("@/lib/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db")>();
  return {
    ...actual,
    saveScreeningCase: vi.fn(),
    fetchCaseDetails: vi.fn(),
    fetchBlockchainAnchor: vi.fn().mockResolvedValue(null),
    listReports: vi.fn().mockResolvedValue([
      {
        id: "rep-test-001",
        case_id: "test-case-saved-uuid-1234",
        format: "PDF",
        payload: {
          executive_summary: "Automated biometric and credential screening completed with zero high-risk flags.",
        },
        created_at: "2026-11-03T03:00:00Z",
        storage_url: "/reports/rep-test-001.pdf",
        cases: {
          id: "test-case-saved-uuid-1234",
          case_code: "TG-TEST-CASE-8888",
          risk_level: "LOW",
          document_type: "PASSPORT",
          country_code: "IND",
          status: "UNDER_REVIEW",
        },
      },
    ]),
  };
});

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("TRUSTGATE AI — Screening Save Case & Automatic Navigation Pipeline", () => {
  let queryClient: QueryClient;

  const validMockPipelineResult = {
    pipelineRunId: "run-test-123",
    overallScore: 88,
    verdict: "CLEAR" as const,
    modules: [],
    findings: [],
    docDetect: { documentType: "passport", confidence: 0.95 },
    riskAssessment: { compositeScore: 12, riskLevel: "LOW" as const },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    useAuthStore.getState().setSession({
      id: "officer-admin-uuid",
      email: "chief@trustgate.ai",
      name: "Chief Security Officer",
      role: "admin",
      badgeId: "ADM-001",
      station: "Border Checkpoint Terminal 01",
    });

    mockContextState.pipelineResult = null;
    mockContextState.processingRunId = null;

    localStorage.clear();
    sessionStorage.clear();
  });

  it("SAVE-01: Save button is disabled when screening result is absent", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/screening"]}>
          <ScreeningPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const saveButtons = screen.getAllByRole("button", { name: /Save Case & Open Review/i });
    expect(saveButtons.length).toBeGreaterThan(0);
    expect(saveButtons[0]).toBeDisabled();
  });

  it("SAVE-02: Synchronous double-click guard prevents duplicate concurrent save requests", async () => {
    let resolveSave: (value: any) => void;
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });

    (dbModule.saveScreeningCase as any).mockImplementation(() => savePromise);

    // Provide pipeline result via context
    mockContextState.pipelineResult = validMockPipelineResult;
    mockContextState.processingRunId = "run-test-double-click";

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/screening"]}>
          <ScreeningPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Find the save button (now enabled)
    const saveButton = await screen.findByRole("button", { name: /Save Case & Open Review/i });
    expect(saveButton).toBeEnabled();

    // Click twice rapidly
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    // Only one persistence call should be dispatched
    expect(dbModule.saveScreeningCase).toHaveBeenCalledTimes(1);

    // Resolve save
    resolveSave!({
      caseId: "persisted-case-9999",
      caseCode: "TG-PERSIST-9999",
      status: "SAVED",
    });
  });

  it("SAVE-03: Successfully awaits persistence, invalidates query cache, and automatically navigates to /cases/:id", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const windowEventSpy = vi.spyOn(window, "dispatchEvent");

    (dbModule.saveScreeningCase as any).mockResolvedValueOnce({
      caseId: "persisted-uuid-abc-123",
      caseCode: "TG-PERSISTED-CODE-123",
      status: "SAVED",
    });

    mockContextState.pipelineResult = validMockPipelineResult;
    mockContextState.processingRunId = "run-persist-test";

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/screening"]}>
          <ScreeningPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const saveButton = await screen.findByRole("button", { name: /Save Case & Open Review/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(dbModule.saveScreeningCase).toHaveBeenCalledTimes(1);
    });

    // Verify TanStack Query cache invalidations
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["cases"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["case", "persisted-uuid-abc-123"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["reports"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    });

    // Verify window event dispatches
    expect(windowEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "trustgate:case-saved" })
    );
    expect(windowEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "trustgate:db-updated" })
    );

    // Verify automatic navigation with route and state
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/cases/persisted-uuid-abc-123", {
        state: {
          justSaved: true,
          caseCode: "TG-PERSISTED-CODE-123",
        },
      });
    });
  });

  it("SAVE-04: Displays error notification and retains screening workspace when persistence encounters a failure", async () => {
    (dbModule.saveScreeningCase as any).mockRejectedValueOnce(
      new Error("PostgreSQL connection timeout or RLS denial")
    );

    mockContextState.pipelineResult = validMockPipelineResult;
    mockContextState.processingRunId = "run-failed-save";

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/screening"]}>
          <ScreeningPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const saveButton = await screen.findByRole("button", { name: /Save Case & Open Review/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to save case/i)).toBeInTheDocument();
      expect(screen.getByText(/PostgreSQL connection timeout or RLS denial/i)).toBeInTheDocument();
    });

    // Verification: navigation must NOT occur on failure
    expect(mockNavigate).not.toHaveBeenCalled();

    // Verify Retry button is displayed
    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();
  });

  it("SAVE-05: CaseDetailPage detects justSaved state and shows success banner with report status", async () => {
    (dbModule.fetchCaseDetails as any).mockResolvedValueOnce({
      row: {
        id: "test-case-saved-uuid-1234",
        case_code: "TG-TEST-CASE-8888",
        created_by: "officer-admin-uuid",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        document_type: "PASSPORT",
        country_code: "IND",
        status: "UNDER_REVIEW",
        risk_score: 12,
        risk_level: "LOW",
        processing_time_ms: 1250,
        profiles: { display_name: "Chief Security Officer", badge_id: "ADMIN-001" },
        assigned: { display_name: "Chief Security Officer" },
      },
      documents: [],
      validations: [],
      risk: {
        id: "risk-123",
        score: 12,
        level: "LOW",
        recommended_action: "Proceed with standard clearance",
        engine_version: "v2.0",
        factors: [],
      },
      findings: [],
      reports: [
        {
          id: "rep-001",
          report_type: "EXECUTIVE",
          classification: "CONFIDENTIAL",
          executive_summary: "Automated analysis confirmed zero fraudulent alterations.",
          created_at: new Date().toISOString(),
          station: "Border Checkpoint Terminal 01",
        },
      ],
      audits: [],
      audit: [],
      notes: [],
      alerts: [],
      signatures: [],
    });

    // Simulate arriving from ScreeningPage with state { justSaved: true, caseCode: 'TG-TEST-CASE-8888' }
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/cases/test-case-saved-uuid-1234",
              state: { justSaved: true, caseCode: "TG-TEST-CASE-8888" },
            },
          ]}
        >
          <Routes>
            <Route path="/cases/:id" element={<CaseDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify arrival success banner appears
    await waitFor(() => {
      expect(screen.getByText(/Case saved successfully. Opening case review.../i)).toBeInTheDocument();
    });

    // Verify Case Code and Details render
    expect(screen.getAllByText(/TG-TEST-CASE-8888/i).length).toBeGreaterThan(0);
  });

  it("SAVE-06: ReportsPage filters and auto-selects report when query parameter caseId matches", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reports?caseId=TG-TEST-CASE-8888"]}>
          <Routes>
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(dbModule.listReports).toHaveBeenCalled();
    });

    // Check that the linked report is visible
    await waitFor(() => {
      expect(screen.getByText(/TG-TEST-CASE-8888/i)).toBeInTheDocument();
    });
  });
});
