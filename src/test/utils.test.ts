import { describe, it, expect } from "vitest";
import {
  cn,
  riskLevelOf,
  riskColor,
  severityColor,
  statusColor,
  formatDuration,
  pct,
  clamp,
  shortId,
} from "@/lib/utils";

describe("cn()", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("deduplicates tailwind classes", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});

describe("riskLevelOf()", () => {
  it("returns LOW for score 0", () => expect(riskLevelOf(0)).toBe("LOW"));
  it("returns LOW for score 29", () => expect(riskLevelOf(29)).toBe("LOW"));
  it("returns MEDIUM for score 30", () => expect(riskLevelOf(30)).toBe("MEDIUM"));
  it("returns MEDIUM for score 69", () => expect(riskLevelOf(69)).toBe("MEDIUM"));
  it("returns HIGH for score 70", () => expect(riskLevelOf(70)).toBe("HIGH"));
  it("returns HIGH for score 100", () => expect(riskLevelOf(100)).toBe("HIGH"));
  it("clamps below 0 to LOW", () => expect(riskLevelOf(-5)).toBe("LOW"));
  it("clamps above 100 to HIGH", () => expect(riskLevelOf(110)).toBe("HIGH"));
  it("handles null as LOW", () => expect(riskLevelOf(null)).toBe("LOW"));
  it("handles undefined as LOW", () => expect(riskLevelOf(undefined)).toBe("LOW"));
});

describe("riskColor()", () => {
  it("returns green classes for LOW", () => {
    expect(riskColor("LOW").text).toContain("risk-low");
  });
  it("returns amber classes for MEDIUM", () => {
    expect(riskColor("MEDIUM").text).toContain("risk-medium");
  });
  it("returns red classes for HIGH", () => {
    expect(riskColor("HIGH").text).toContain("risk-high");
  });
});

describe("severityColor()", () => {
  it("returns emerald for PASS", () =>
    expect(severityColor("PASS")).toContain("emerald"));
  it("returns amber for WARNING", () =>
    expect(severityColor("WARNING")).toContain("amber"));
  it("returns orange for HIGH", () =>
    expect(severityColor("HIGH")).toContain("orange"));
  it("returns rose for CRITICAL", () =>
    expect(severityColor("CRITICAL")).toContain("rose"));
  it("handles lowercase", () =>
    expect(severityColor("pass")).toContain("emerald"));
});

describe("statusColor()", () => {
  it("returns green for CLEARED", () =>
    expect(statusColor("CLEARED")).toContain("risk-low"));
  it("returns amber for FLAGGED", () =>
    expect(statusColor("FLAGGED")).toContain("risk-medium"));
  it("returns red for ESCALATED", () =>
    expect(statusColor("ESCALATED")).toContain("risk-high"));
  it("handles unknown status gracefully", () =>
    expect(typeof statusColor("UNKNOWN")).toBe("string"));
});

describe("formatDuration()", () => {
  it("formats 0ms", () => expect(formatDuration(0)).toBe("0s"));
  it("formats ms under 1s", () => expect(formatDuration(500)).toBe("500ms"));
  it("formats seconds", () => expect(formatDuration(4800)).toBe("4.8s"));
  it("formats minutes", () => expect(formatDuration(90000)).toBe("1m 30s"));
  it("handles null", () => expect(formatDuration(null)).toBe("0s"));
  it("handles undefined", () => expect(formatDuration(undefined)).toBe("0s"));
});

describe("pct()", () => {
  it("formats 0 as 0%", () => expect(pct(0)).toBe("0%"));
  it("formats 100 as 100%", () => expect(pct(100)).toBe("100%"));
  it("respects digits", () => expect(pct(98.765, 1)).toBe("98.8%"));
  it("handles NaN gracefully", () => expect(pct(NaN)).toBe("0%"));
});

describe("clamp()", () => {
  it("clamps min", () => expect(clamp(-5, 0, 100)).toBe(0));
  it("clamps max", () => expect(clamp(150, 0, 100)).toBe(100));
  it("passes through in-range", () => expect(clamp(50, 0, 100)).toBe(50));
});

describe("shortId()", () => {
  it("truncates to 8 chars by default", () =>
    expect(shortId("abcdef1234567890")).toBe("abcdef12"));
  it("respects custom length", () =>
    expect(shortId("abcdef1234567890", 4)).toBe("abcd"));
  it("returns em-dash for empty string", () => expect(shortId("")).toBe("—"));
});
