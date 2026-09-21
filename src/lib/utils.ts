import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, formatISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export function riskLevelOf(score: number | null | undefined): RiskLevel {
  const s = Math.max(0, Math.min(100, Number(score ?? 0)));
  if (s >= 70) return "HIGH";
  if (s >= 30) return "MEDIUM";
  return "LOW";
}

export function riskColor(level: RiskLevel) {
  switch (level) {
    case "LOW":
      return {
        badge: "bg-risk-low/15 text-risk-low border-risk-low/30",
        ring: "ring-risk-low/25",
        text: "text-risk-low",
        bg: "bg-risk-low",
        grad: "from-risk-low/60 to-emerald-400/40",
      };
    case "MEDIUM":
      return {
        badge: "bg-risk-medium/15 text-risk-medium border-risk-medium/30",
        ring: "ring-risk-medium/25",
        text: "text-risk-medium",
        bg: "bg-risk-medium",
        grad: "from-risk-medium/60 to-amber-400/40",
      };
    case "HIGH":
      return {
        badge: "bg-risk-high/15 text-risk-high border-risk-high/30",
        ring: "ring-risk-high/25",
        text: "text-risk-high",
        bg: "bg-risk-high",
        grad: "from-risk-high/60 to-rose-500/40",
      };
  }
}

export function severityColor(sev: string) {
  const s = (sev || "").toUpperCase();
  if (s === "PASS") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (s === "WARNING") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (s === "HIGH") return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  if (s === "CRITICAL") return "bg-rose-500/15 text-rose-400 border-rose-500/30";
  return "bg-slate-500/15 text-slate-300 border-slate-500/30";
}

export function statusColor(status: string) {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "PENDING":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "ANALYZING":
      return "bg-signal-cyan/15 text-signal-cyan border-signal-cyan/30";
    case "UNDER_REVIEW":
      return "bg-signal-blue/15 text-signal-blue border-signal-blue/30";
    case "CLEARED":
      return "bg-risk-low/15 text-risk-low border-risk-low/30";
    case "FLAGGED":
      return "bg-risk-medium/15 text-risk-medium border-risk-medium/30";
    case "ESCALATED":
      return "bg-risk-high/15 text-risk-high border-risk-high/30";
    case "CLOSED":
      return "bg-slate-600/20 text-slate-400 border-slate-600/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

export function formatDate(value: string | Date | null | undefined, fmt = "PPP") {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return format(d, fmt);
  } catch {
    return String(value);
  }
}

export function formatTimeAgo(value: string | Date | null | undefined) {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return String(value);
  }
}

export function formatISODate(value: string | Date | null | undefined) {
  if (!value) return "";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return formatISO(d, { representation: "date" });
  } catch {
    return "";
  }
}

export function formatDuration(ms: number | null | undefined) {
  const n = Number(ms ?? 0);
  if (!n) return "0s";
  if (n < 1000) return `${n}ms`;
  if (n < 60_000) return `${(n / 1000).toFixed(1)}s`;
  const m = Math.floor(n / 60_000);
  const s = ((n % 60_000) / 1000).toFixed(0);
  return `${m}m ${s}s`;
}

export function pct(value: number, digits = 0) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function shortId(id: string, len = 8) {
  if (!id) return "—";
  return id.slice(0, len);
}
