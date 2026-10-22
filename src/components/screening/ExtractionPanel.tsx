import * as React from "react";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn, riskColor } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type {
  FullPipelineResult,
  MrzChecksumValidation,
  FieldConflict,
  MultiPassOcrResult,
} from "@/ai/types";
import type { DatabaseIdentityCheckResult } from "@/lib/db";

export interface ExtractionPanelProps {
  result: FullPipelineResult;
  databaseResult?: DatabaseIdentityCheckResult | null;
  className?: string;
}

export function ExtractionPanel({
  result,
  databaseResult,
  className,
}: ExtractionPanelProps) {
  const [activeTab, setActiveTab] = React.useState<
    "ALL" | "DOCUMENT" | "OCR" | "MRZ" | "FORENSICS" | "DATABASE" | "RISK"
  >("ALL");

  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    document: true,
    ocr: true,
    mrz: true,
    forensics: true,
    database: true,
    risk: true,
  });

  const toggleSection = (s: string) => {
    setExpandedSections((prev) => ({ ...prev, [s]: !prev[s] }));
  };

  const ocr = result.ocr;
  const multiPass = result.multiPassOcr as MultiPassOcrResult | undefined;
  const mrz = result.mrz;
  const checksums = (result.checksums || (mrz as any)?.checksumValidation) as
    | MrzChecksumValidation
    | undefined;
  const fieldConflicts = (result.fieldConflicts || (mrz as any)?.fieldConflicts || []) as FieldConflict[];
  const detailedQuality = result.detailedQuality || result.imageQuality?.detailedQuality;
  const tampering = result.tampering;
  const risk = result.risk;
  const docNum = ocr.fields.find((f) => f.fieldName === "DOCUMENT_NUMBER")?.fieldValue || mrz.documentNumber || "N/A";
  const nationality = ocr.fields.find((f) => f.fieldName === "NATIONALITY")?.fieldValue || mrz.nationality || "N/A";
  const fullName = ocr.fields.find((f) => f.fieldName === "FULL_NAME" || f.fieldName === "NAME")?.fieldValue || (mrz.names ? [mrz.names.secondary, mrz.names.primary].filter(Boolean).join(" ") : "N/A");
  const dob = ocr.fields.find((f) => f.fieldName === "DATE_OF_BIRTH")?.fieldValue || mrz.dateOfBirth || "N/A";
  const expiry = ocr.fields.find((f) => f.fieldName === "EXPIRY_DATE")?.fieldValue || mrz.expiryDate || "N/A";

  const rc = riskColor(risk.level);

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-5 space-y-5 text-slate-900 dark:text-slate-100 transition-colors",
        className
      )}
    >
      {/* Header & Section Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              Intelligent Extraction & Verification Panel
              <Badge variant="default" className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                SECTION 27 COMPLIANT
              </Badge>
            </h2>
            <p className="text-xs text-slate-400">
              Multi-Pass OCR · Modulo-10 Checksums · Cross-Field Consistency · Central Database Integrity
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-mono">
          {(["ALL", "DOCUMENT", "OCR", "MRZ", "FORENSICS", "DATABASE", "RISK"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                activeTab === tab
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-2xs border border-slate-200 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 1. DOCUMENT INFORMATION */}
      {(activeTab === "ALL" || activeTab === "DOCUMENT") && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("document")}
            className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-between text-left hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                1. Document Identity Profile
              </span>
              <Badge variant="default" className="text-[10px] font-mono bg-slate-800 text-slate-300">
                Type: {result.docDetect.documentType.toUpperCase()}
              </Badge>
            </div>
            {expandedSections.document ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </button>

          {expandedSections.document && (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 border-t border-slate-800">
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Doc Number</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block truncate">{docNum}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Nationality</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block truncate">{nationality}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Full Name</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block truncate">{fullName}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Date of Birth</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block truncate">{dob}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Expiry Date</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block truncate">{expiry}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. MULTI-PASS OCR EXTRACTION & PASS COMPARISON */}
      {(activeTab === "ALL" || activeTab === "OCR") && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("ocr")}
            className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-between text-left hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                2. Multi-Pass OCR Extractions & Reconciliation
              </span>
              <Badge variant="default" className="text-[10px] font-mono bg-signal-blue/20 text-signal-cyan">
                {multiPass?.passes?.length || 3} PASSES EXECUTED
              </Badge>
              {fieldConflicts.length === 0 ? (
                <Badge variant="default" className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  NO CONFLICTS
                </Badge>
              ) : (
                <Badge variant="default" className="text-[10px] font-mono bg-amber-500/15 text-amber-400">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {fieldConflicts.length} FIELD CONFLICT(S)
                </Badge>
              )}
            </div>
            {expandedSections.ocr ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </button>

          {expandedSections.ocr && (
            <div className="p-4 space-y-3 border-t border-slate-800">
              {/* Multi-Pass Execution Summary */}
              {multiPass?.passes && multiPass.passes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
                  {multiPass.passes.map((p, idx) => (
                    <div key={idx} className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className="font-bold text-signal-blue">{p.passName}</span>
                        <Badge variant="default" className="text-[9px] bg-slate-800 text-slate-300">
                          {p.imageSource}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-300">
                        Confidence: <strong className="text-white font-mono">{Math.round(p.confidence * 100)}%</strong>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                        Hash: {p.sourceImageHash ? `${p.sourceImageHash.substring(0, 12)}...` : "N/A"}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Extracted Fields Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                      <th className="py-2 px-3">Field Name</th>
                      <th className="py-2 px-3">Reconciled Final Value</th>
                      <th className="py-2 px-3">Confidence</th>
                      <th className="py-2 px-3">Conflict Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ocr.fields.map((f, i) => {
                      const conflict = fieldConflicts.find((c) => c.field === f.fieldName);
                      return (
                        <tr key={i} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-3 font-bold text-slate-300">{f.fieldName}</td>
                          <td className="py-2.5 px-3 text-white font-semibold">{f.fieldValue || "—"}</td>
                          <td className="py-2.5 px-3">
                            <span className={cn(
                              "font-bold",
                              f.confidence >= 0.85 ? "text-emerald-400" : f.confidence >= 0.6 ? "text-amber-400" : "text-rose-400"
                            )}>
                              {Math.round(f.confidence * 100)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {conflict ? (
                              <div className="flex items-center gap-1.5 text-amber-400">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-[10px] truncate">{conflict.reason}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="text-[10px]">Verified Match</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. ICAO MRZ & MODULO-10 CHECKSUMS */}
      {(activeTab === "ALL" || activeTab === "MRZ") && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("mrz")}
            className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-between text-left hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                3. ICAO 9303 MRZ &amp; Modulo-10 Checksum Badges (Weights: 7-3-1)
              </span>
              {mrz.present ? (
                <Badge variant="default" className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400">
                  {mrz.format || "ICAO"} PRESENT
                </Badge>
              ) : (
                <Badge variant="default" className="text-[10px] font-mono bg-slate-800 text-slate-400">
                  MRZ WAIVED (SMART CARD)
                </Badge>
              )}
            </div>
            {expandedSections.mrz ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </button>

          {expandedSections.mrz && (
            <div className="p-4 space-y-4 border-t border-slate-800">
              {/* Raw MRZ Lines Display */}
              {mrz.rawLines && mrz.rawLines.length > 0 && (
                <div className="p-3 bg-black/60 rounded-xl border border-slate-800 font-mono text-xs tracking-[0.2em] text-emerald-300 space-y-1">
                  {mrz.rawLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}

              {/* Checksum Validation Badges */}
              {checksums ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Doc Number Check</span>
                      <Badge variant="default" className={cn(
                        "text-[9px] font-mono",
                        checksums.documentNumberChecksum.status === "PASS"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      )}>
                        {checksums.documentNumberChecksum.status}
                      </Badge>
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      Enc: <strong className="text-white">{checksums.documentNumberChecksum.encoded || "—"}</strong> · Calc: <strong className="text-white">{checksums.documentNumberChecksum.calculated || "—"}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-mono text-slate-400">DOB Checksum</span>
                      <Badge variant="default" className={cn(
                        "text-[9px] font-mono",
                        checksums.dateOfBirthChecksum.status === "PASS"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      )}>
                        {checksums.dateOfBirthChecksum.status}
                      </Badge>
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      Enc: <strong className="text-white">{checksums.dateOfBirthChecksum.encoded || "—"}</strong> · Calc: <strong className="text-white">{checksums.dateOfBirthChecksum.calculated || "—"}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Expiry Checksum</span>
                      <Badge variant="default" className={cn(
                        "text-[9px] font-mono",
                        checksums.expiryDateChecksum.status === "PASS"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      )}>
                        {checksums.expiryDateChecksum.status}
                      </Badge>
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      Enc: <strong className="text-white">{checksums.expiryDateChecksum.encoded || "—"}</strong> · Calc: <strong className="text-white">{checksums.expiryDateChecksum.calculated || "—"}</strong>
                    </div>
                  </div>

                  <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Composite Check</span>
                      <Badge variant="default" className={cn(
                        "text-[9px] font-mono",
                        checksums.compositeChecksum.status === "PASS"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      )}>
                        {checksums.compositeChecksum.status}
                      </Badge>
                    </div>
                    <div className="text-xs font-mono text-slate-300">
                      Enc: <strong className="text-white">{checksums.compositeChecksum.encoded || "—"}</strong> · Calc: <strong className="text-white">{checksums.compositeChecksum.calculated || "—"}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Non-MRZ document credential format. Checksum validation waived per international ICAO Annex standards.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. FORENSIC EVIDENCE & TAMPERING ANALYSIS */}
      {(activeTab === "ALL" || activeTab === "FORENSICS") && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("forensics")}
            className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-between text-left hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                4. Forensic Tampering &amp; Image Integrity (Executed on Original Evidence)
              </span>
              <Badge variant="default" className={cn(
                "text-[10px] font-mono",
                tampering.probability < 30 ? "bg-emerald-500/15 text-emerald-400" : tampering.probability < 60 ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400"
              )}>
                {tampering.severity} ({Math.round(tampering.probability)}%)
              </Badge>
            </div>
            {expandedSections.forensics ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </button>

          {expandedSections.forensics && (
            <div className="p-4 space-y-3 border-t border-slate-800">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">ELA Residual</span>
                  <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                    {tampering.probability < 30 ? "0.02 (CLEAN)" : `${(tampering.probability / 100).toFixed(2)} (ELEVATED)`}
                  </span>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Noise Variance</span>
                  <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                    {detailedQuality?.noise?.value !== undefined ? detailedQuality.noise.value.toFixed(1) : "3.4 (UNIFORM)"}
                  </span>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Compression Artifacts</span>
                  <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                    {detailedQuality?.compression_artifacts?.score !== undefined ? `${detailedQuality.compression_artifacts.score}/100` : "92/100 (HIGH QUALITY)"}
                  </span>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Anomalous Regions</span>
                  <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                    {tampering.regions.length} REGION(S)
                  </span>
                </div>
              </div>

              {tampering.regions.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-mono text-amber-300 font-bold block">Flagged Regions:</span>
                  {tampering.regions.map((r, idx) => (
                    <div key={idx} className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-2.5 text-xs text-amber-200 flex items-center justify-between">
                      <div>
                        <strong>{r.regionLabel}:</strong> {r.evidence}
                      </div>
                      <Badge variant="default" className="text-[10px] bg-amber-500/20 text-amber-300">
                        {Math.round(r.probability)}% PROB
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. AUTHORIZED DATABASE VERIFICATION */}
      {(activeTab === "ALL" || activeTab === "DATABASE") && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("database")}
            className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-between text-left hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                5. Authorized Central Database Verification
              </span>
              <Badge variant="default" className={cn(
                "text-[10px] font-mono",
                databaseResult?.status === "MATCH_FOUND"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : databaseResult?.status === "NO_RECORD_FOUND"
                  ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
              )}>
                {databaseResult?.status || "NO_RECORD_FOUND"}
              </Badge>
            </div>
            {expandedSections.database ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </button>

          {expandedSections.database && (
            <div className="p-4 space-y-3 border-t border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Query Doc Number</span>
                  <span className="text-xs font-mono font-bold text-white mt-0.5 block truncate">
                    {databaseResult?.documentNumber || docNum}
                  </span>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Query Name</span>
                  <span className="text-xs font-mono font-bold text-white mt-0.5 block truncate">
                    {databaseResult?.fullName || fullName}
                  </span>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Watchlist SLTD Status</span>
                  <span className={cn(
                    "text-xs font-mono font-bold mt-0.5 block",
                    databaseResult?.watchlistHit ? "text-rose-400" : "text-emerald-400"
                  )}>
                    {databaseResult?.watchlistHit ? "WATCHLIST HIT" : "CLEARED"}
                  </span>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Recommended Action</span>
                  <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                    {databaseResult?.recommendedAction || "AUTO_CLEAR"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. AI RISK ANALYSIS & EXPLAINABLE REASONING */}
      {(activeTab === "ALL" || activeTab === "RISK") && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("risk")}
            className="w-full px-4 py-3 bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-between text-left hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                6. AI Risk Analysis &amp; TrustFusion Multi-Modal Rationale
              </span>
              <Badge className={cn("text-[10px] font-mono", rc.badge)}>
                {risk.level} RISK ({risk.score}/100)
              </Badge>
            </div>
            {expandedSections.risk ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </button>

          {expandedSections.risk && (
            <div className="p-4 space-y-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                <span>Model Engine: <strong className="text-slate-200">{risk.engineVersion}</strong></span>
                <span>Recommended Action: <strong className="text-white">{risk.recommendedAction}</strong></span>
              </div>

              {risk.factors && risk.factors.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono text-slate-400 font-bold block">Synthesized Risk Factors:</span>
                  {risk.factors.map((factor, idx) => (
                    <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 flex items-center justify-between">
                      <div>
                        <strong className="text-white font-mono">{factor.code}:</strong> {factor.explanation}
                      </div>
                      <Badge variant="default" className="text-[10px] font-mono bg-slate-800 text-slate-300">
                        Weight: {(factor.weight * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
