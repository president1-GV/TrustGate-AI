import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { resolveSpecimenUrl } from "@/lib/specimenResolver";
import { DocumentViewer } from "@/components/screening/DocumentViewer";

describe("Screening Workspace & Reset Option Verification", () => {
  it("resolveSpecimenUrl returns empty string when no document, case, or type is provided", () => {
    expect(resolveSpecimenUrl()).toBe("");
    expect(resolveSpecimenUrl(undefined)).toBe("");
    expect(resolveSpecimenUrl(null)).toBe("");
    expect(resolveSpecimenUrl("")).toBe("");
  });

  it("resolveSpecimenUrl still correctly resolves real historical case specimens when case_code is provided", () => {
    const passportRes = resolveSpecimenUrl(null, "TG-TEST", "PASSPORT");
    expect(passportRes).toContain("/specimens/");

    const aadhaarRes = resolveSpecimenUrl(null, "TG-TEST-AADHAAR", "AADHAAR");
    expect(aadhaarRes).toContain("/specimens/");
  });

  it("DocumentViewer starts empty with DocumentPlaceholder reticle and NO pre-loaded fake image", () => {
    const handleCamera = vi.fn();
    const handleUpload = vi.fn();
    const handleReset = vi.fn();

    render(
      <DocumentViewer
        imageUrl={undefined}
        onActivateCamera={handleCamera}
        onUploadFile={handleUpload}
        onResetDocument={handleReset}
      />
    );

    // Verify DocumentPlaceholder is displayed
    expect(screen.getByText(/BORDER INSPECTION SCANNER/i)).toBeInTheDocument();
    expect(screen.getByText(/Activate Live Laptop Camera/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Passport Document/i)).toBeInTheDocument();

    // Verify NO preloaded <img> is displayed
    const images = screen.queryAllByRole("img");
    expect(images.length).toBe(0);
  });

  it("DocumentViewer renders uploaded document when imageUrl is provided", () => {
    const testUrl = "/specimens/capture-1790174249711-72192df1-1ece-4d02-8327-e1468fb5ae53.jpg";
    render(
      <DocumentViewer
        imageUrl={testUrl}
      />
    );

    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe(testUrl);
  });

  it("Clicking Reset button invokes onResetDocument to clear workspace and resets view", () => {
    const handleReset = vi.fn();
    const testUrl = "/specimens/capture-1790174249711-72192df1-1ece-4d02-8327-e1468fb5ae53.jpg";

    render(
      <DocumentViewer
        imageUrl={testUrl}
        onResetDocument={handleReset}
      />
    );

    const resetBtn = screen.getByTitle(/Reset Workspace & Clear Document/i);
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);

    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it("DocumentViewer correctly displays blob URLs directly from file uploads", () => {
    const blobUrl = "blob:http://localhost:5173/550e8400-e29b-41d4-a716-446655440000";

    render(
      <DocumentViewer
        imageUrl={blobUrl}
      />
    );

    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe(blobUrl);
  });
});
