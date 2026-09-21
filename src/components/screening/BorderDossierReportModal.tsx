import {
  FileText,
  Printer,
  X,
  User,
  Scan,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { RealtimeDigitalSignature } from "@/components/common/RealtimeDigitalSignature";

export interface BorderDossierReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  scenarioTitle: string;
  docStandard: string;
  docImage: string | null;
  faceImage: string | null;
  officerId: string;
  stationName?: string;
  compositeRisk: number | null;
  verdictText: string;
  verdictTone: "pass" | "warning" | "critical" | "default";
  breakdown: {
    docAuth: number;
    field: number;
    tamper: number;
    face: number;
    rules: number;
  };
  fields: Array<{
    name: string;
    viz: string;
    mrz: string;
    status: string;
    flag: string;
    checkDigitExpected?: number;
    checkDigitCalculated?: number;
    discrepancyNote?: string;
  }>;
  tampering: {
    photoRegionAnomaly: number;
    textRegionAnomaly: number;
    stampRegionAnomaly: number;
    photoIndicators: string[];
  };
  faceMatch: {
    similarity: number;
    confidence: number;
    liveness: string;
  };
}

export function BorderDossierReportModal({
  isOpen,
  onClose,
  caseId,
  scenarioTitle,
  docStandard,
  docImage,
  faceImage,
  officerId,
  stationName = "Indo-Nepal ICP Raxaul SSB Station",
  compositeRisk,
  verdictText,
  verdictTone,
  breakdown,
  fields,
  tampering,
  faceMatch,
}: BorderDossierReportModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const riskScore = compositeRisk ?? 0;
  const isApproved = riskScore < 30;
  const isSecondary = riskScore >= 30 && riskScore < 60;
  const isHighRisk = riskScore >= 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 print-keep print-modal-backdrop">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden print-keep print-modal-container print-report-container">
        {/* Modal Toolbar */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2 no-print print:hidden">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileText className="h-4 w-4 text-emerald-400" />
            <span>Official Border Screening Dossier</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs gap-1.5 border-slate-700 hover:bg-slate-800 text-slate-200"
            >
              <Printer className="h-3.5 w-3.5" /> Print / Save PDF
            </Button>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Formal Dossier Document */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200 bg-slate-950 print:bg-white print:text-black">
          {/* Official Letterhead */}
          <div className="border-b border-slate-800 pb-5 flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src="/trustgate-logo.png"
                alt="TrustGate AI"
                className="h-12 w-12 rounded-xl object-cover border border-signal-blue/40 shadow-glow"
              />
              <div>
                <h1 className="text-xl font-black tracking-wider text-white uppercase print:text-black">
                  TRUSTGATE AI — BORDER CLEARANCE DOSSIER
                </h1>
                <p className="text-xs text-slate-400 print:text-slate-600 font-mono mt-0.5">
                  MULTI-SIGNAL BIOMETRIC &amp; ICAO 9303 SCREENING VERIFICATION
                </p>
                <p className="text-[11px] text-slate-500 font-semibold">{stationName} • Scenario: {scenarioTitle}</p>
              </div>
            </div>

            <div className="text-right text-xs font-mono space-y-1">
              <div className="font-bold text-signal-cyan">CASE ID: {caseId}</div>
              <div className="text-slate-400">OFFICER: {officerId}</div>
              <div className="text-slate-400">TIMESTAMP: {new Date().toLocaleString()}</div>
            </div>
          </div>

          {/* Screening Verdict Callout Banner */}
          <div
            className={cn(
              "p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3",
              isApproved && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
              isSecondary && "border-amber-500/40 bg-amber-500/10 text-amber-300",
              isHighRisk && "border-rose-500/40 bg-rose-500/10 text-rose-300"
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-widest font-semibold">
                  OFFICIAL DETERMINATION
                </span>
                <Badge variant={verdictTone} className="text-[10px] uppercase font-mono px-2 py-0.5">
                  {verdictTone.toUpperCase()}
                </Badge>
              </div>
              <div className="text-lg font-black tracking-wide mt-0.5">{verdictText}</div>
              <p className="text-xs opacity-80 mt-0.5">
                Evaluated across 5 independent neural signals and deterministic ICAO 9303 checksum automata.
              </p>
            </div>
            <div className="text-right font-mono">
              <div className="text-3xl font-black tabular-nums">{riskScore} / 100</div>
              <div className="text-[10px] uppercase font-bold tracking-wider">COMPOSITE RISK INDEX</div>
            </div>
          </div>

          {/* Captured Specimens Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                <span>INGESTED TRAVEL DOCUMENT</span>
                <span className="font-mono text-[10px] text-slate-500">{docStandard}</span>
              </div>
              <div className="h-44 rounded-lg bg-black/60 border border-slate-800 flex items-center justify-center overflow-hidden">
                {docImage ? (
                  <img src={docImage} alt="Travel Document" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-slate-500 text-xs">
                    <Scan className="h-8 w-8 mx-auto mb-1 text-slate-600" />
                    Document captured via high-resolution optical feed
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
                <span>BIOMETRIC TRAVELER PORTRAIT</span>
                <span className="font-mono text-[10px] text-emerald-400">Match: {faceMatch.similarity}%</span>
              </div>
              <div className="h-44 rounded-lg bg-black/60 border border-slate-800 flex items-center justify-center overflow-hidden">
                {faceImage ? (
                  <img src={faceImage} alt="Traveler Portrait" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-slate-500 text-xs">
                    <User className="h-8 w-8 mx-auto mb-1 text-slate-600" />
                    Biometric face verification active
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5-Signal Risk Fusion Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-signal-cyan">
              5-Signal Probabilistic Risk Weights
            </h3>
            <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs">
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">DOC AUTH (25%)</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1">{breakdown.docAuth}%</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs">
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">FIELD MATCH (20%)</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1">{breakdown.field}%</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs">
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">TAMPER ELA (20%)</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1">{breakdown.tamper}%</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs">
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">FACE MATCH (25%)</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1">{breakdown.face}%</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs">
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">WATCHLIST (10%)</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-1">{breakdown.rules}%</div>
              </div>
            </div>
          </div>

          {/* Tampering Evidence Analysis */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/40 space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase">
              <span>Tampering Evidence Analysis</span>
              <Badge variant={tampering.photoRegionAnomaly > 50 ? "critical" : "pass"} className="text-[9px]">
                {tampering.photoRegionAnomaly > 50 ? "HIGH ANOMALY DETECTED" : "NOMINAL"}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="text-slate-600 dark:text-slate-400 text-[10px] font-bold">PHOTO ANOMALY</div>
                <div className={tampering.photoRegionAnomaly > 50 ? "text-rose-600 dark:text-rose-400 font-bold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
                  {tampering.photoRegionAnomaly}%
                </div>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="text-slate-600 dark:text-slate-400 text-[10px] font-bold">TEXT RESIDUALS</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold">{tampering.textRegionAnomaly}%</div>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="text-slate-600 dark:text-slate-400 text-[10px] font-bold">STAMP/SEAL ANOMALY</div>
                <div className="text-amber-600 dark:text-amber-400 font-bold">{tampering.stampRegionAnomaly}%</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              <strong className="text-slate-900 dark:text-slate-100 font-bold">Forensic Indicators:</strong> {tampering.photoIndicators.join(", ")}
            </div>
          </div>

          {/* Multi-Field Cross Check Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-signal-cyan">
              VIZ Plaintext vs. ICAO 9303 MRZ Check Digit Verification
            </h3>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 text-[11px]">
                  <tr>
                    <th className="p-2.5 font-semibold">Inspection Field</th>
                    <th className="p-2.5 font-semibold">Visual Zone (VIZ)</th>
                    <th className="p-2.5 font-semibold">MRZ String</th>
                    <th className="p-2.5 font-semibold">Check Digit</th>
                    <th className="p-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {fields.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="p-2.5 font-medium text-slate-200">{f.name}</td>
                      <td className="p-2.5 font-mono text-slate-100">{f.viz}</td>
                      <td className="p-2.5 font-mono text-slate-400">{f.mrz}</td>
                      <td className="p-2.5 font-mono">
                        {f.checkDigitExpected !== undefined ? (
                          <span
                            className={
                              f.checkDigitExpected === f.checkDigitCalculated
                                ? "text-emerald-400 font-bold"
                                : "text-rose-400 font-bold"
                            }
                          >
                            {f.checkDigitExpected} / {f.checkDigitCalculated}
                          </span>
                        ) : (
                          <span className="text-slate-600">N/A</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <Badge
                          variant={f.flag === "green" ? "pass" : f.flag === "amber" ? "warning" : "critical"}
                          className="text-[10px]"
                        >
                          {f.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-Time Live Database Digital Signatures */}
          <RealtimeDigitalSignature
            caseCode={caseId}
            caseId={caseId}
            decisionTimestamp={new Date().toISOString()}
            documentHash="7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
          />
        </div>
      </div>
    </div>
  );
}
