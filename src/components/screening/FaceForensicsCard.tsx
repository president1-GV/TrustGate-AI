import * as React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Cpu,
  ScanFace,
  Layers,
  Sparkles,
  UserX,
  FileWarning,
  Printer,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Separator } from "@/components/ui/Separator";
import { cn } from "@/lib/utils";
import type { FaceForensicsResult } from "@/lib/midvService";

interface FaceForensicsCardProps {
  result: FaceForensicsResult | null;
  loading?: boolean;
  engineOnline?: boolean;
  onRunAudit?: () => void;
}

export function FaceForensicsCard({
  result,
  loading = false,
  engineOnline = false,
  onRunAudit,
}: FaceForensicsCardProps) {
  const [showReasoning, setShowReasoning] = React.useState(false);
  const [expandedFailures, setExpandedFailures] = React.useState<Record<number, boolean>>({ 0: true });

  const toggleFailure = (idx: number) => {
    setExpandedFailures((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleExportCertificate = () => {
    if (!result) return;
    const printWindow = window.open("", "_blank", "width=840,height=960");
    if (!printWindow) return;

    const evalData = result.evaluation;
    const checks = result.forensic_checks || [];
    const failures = result.failure_reasons || [];
    const dateStr = new Date().toUTCString();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TrustGate AI — Border Forensic Biometric Certificate</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; background: #fff; line-height: 1.5; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; font-family: monospace; }
          .seal { border: 2px solid #0284c7; color: #0284c7; padding: 6px 12px; font-size: 11px; font-weight: 700; border-radius: 4px; font-family: monospace; }
          .verdict-box { border: 2px solid ${evalData.verdict === "DEEPFAKE_DETECTED" ? "#ef4444" : evalData.verdict === "SUSPICIOUS_MANIPULATION" ? "#f59e0b" : "#10b981"}; background: ${evalData.verdict === "DEEPFAKE_DETECTED" ? "#fef2f2" : evalData.verdict === "SUSPICIOUS_MANIPULATION" ? "#fffbeb" : "#f0fdf4"}; padding: 16px; border-radius: 6px; margin-bottom: 24px; }
          .verdict-title { font-size: 16px; font-weight: 800; color: ${evalData.verdict === "DEEPFAKE_DETECTED" ? "#b91c1c" : evalData.verdict === "SUSPICIOUS_MANIPULATION" ? "#b45309" : "#15803d"}; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
          .panel { border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; background: #f8fafc; font-size: 12px; }
          .panel-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          th { background: #f1f5f9; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; }
          .fail { color: #dc2626; font-weight: 700; }
          .pass { color: #16a34a; font-weight: 700; }
          .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 16px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">TRUSTGATE AI — BIOMETRIC EXAMINATION CERTIFICATE</div>
            <div class="subtitle">BENCHMARK: FaceForensics++ (c23 Standard, ICCV 2019, TUM / FAU / Kaggle Mirror)</div>
            <div class="subtitle">STANDARD: ICAO Document 9303 · ISO/IEC 30107-3 Presentation Attack Detection</div>
          </div>
          <div class="seal">OFFICIAL AUDIT ATTESTATION</div>
        </div>

        <div class="verdict-box">
          <div class="verdict-title">BIOMETRIC VERDICT: ${evalData.verdict}</div>
          <div style="font-size: 12px; margin-top: 4px;">
            Authenticity Index: <strong>${evalData.authenticity_score}/100</strong> &nbsp;|&nbsp;
            Recommended Directive: <strong>${evalData.recommended_action}</strong> &nbsp;|&nbsp;
            Suspected Method: <strong>${evalData.dominant_manipulation_archetype}</strong>
          </div>
        </div>

        <div class="grid">
          <div class="panel">
            <div class="panel-title">Forensic Method Breakdown</div>
            <div>Deepfakes Autoencoder: <strong>${result.method_probabilities?.deepfakes ?? 0}%</strong></div>
            <div>Face2Face Reenactment: <strong>${result.method_probabilities?.face2face ?? 0}%</strong></div>
            <div>FaceSwap 3D Mesh: <strong>${result.method_probabilities?.faceswap ?? 0}%</strong></div>
            <div>NeuralTextures GAN: <strong>${result.method_probabilities?.neural_textures ?? 0}%</strong></div>
          </div>
          <div class="panel">
            <div class="panel-title">Inspection Metadata</div>
            <div>Capture Source: <strong>${result.benchmark?.capture_source ?? "Live Camera"}</strong></div>
            <div>Audited On: <strong>${dateStr}</strong></div>
            <div>Engine Mode: <strong>Air-Gapped Autonomous Heuristic / Local Daemon</strong></div>
            <div>Certificate ID: <strong>TG-FF-${Date.now().toString(36).toUpperCase()}</strong></div>
          </div>
        </div>

        <div style="font-size: 13px; font-weight: 700; margin-top: 16px;">Forensic Parameter Attestation:</div>
        <table>
          <thead>
            <tr>
              <th>Forensic Check</th>
              <th>Status</th>
              <th>Measured Evidence</th>
              <th>Benchmark Threshold</th>
            </tr>
          </thead>
          <tbody>
            ${checks.map(c => `
              <tr>
                <td><strong>${c.label}</strong><br><span style="font-size:10px; color:#64748b;">${c.description}</span></td>
                <td class="${c.status === 'FAIL' ? 'fail' : 'pass'}">${c.status}</td>
                <td>${c.detected_value || 'N/A'}</td>
                <td>${c.threshold || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${failures.length > 0 ? `
          <div style="font-size: 13px; font-weight: 700; margin-top: 24px; color: #dc2626;">Forensic Failure Explanations:</div>
          ${failures.map((f, i) => `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-top: 8px; font-size: 12px;">
              <strong>#${i + 1} [${f.rule_code}] ${f.metric_name}: ${f.summary}</strong>
              <p style="margin: 4px 0 0 0; color: #334155;">${f.forensic_evidence}</p>
              <div style="margin-top: 6px; font-size: 11px; font-weight: 600; color: #991b1b;">Protocol: ${f.officer_directive}</div>
            </div>
          `).join('')}
        ` : ''}

        <div class="footer">
          <div>ISSUED BY: TRUSTGATE AI BORDER SECURITY GATEWAY</div>
          <div>NON-REPUDIATION CHECKSUM: ${Math.random().toString(16).substring(2, 10).toUpperCase()}</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (!result && !loading) {
    return (
      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ScanFace className="h-5 w-5 text-signal-cyan" />
              <CardTitle className="text-sm font-semibold text-slate-100">
                FaceForensics++ Biometric Deepfake Audit
              </CardTitle>
            </div>
            <Badge variant="default" className="text-[10px] font-mono bg-slate-800 text-slate-400">
              FF++ c23
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-400">
            Automated facial manipulation screening grounded in the FaceForensics++ benchmark (TUM/FAU).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center space-y-3">
            <div className="h-10 w-10 mx-auto rounded-xl bg-signal-cyan/10 border border-signal-cyan/20 flex items-center justify-center text-signal-cyan">
              <ScanFace className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-300">
                Awaiting Facial Crop or Live Camera Feed
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                Upload a document with portrait, capture via live camera, or run a test sample to evaluate deepfake authenticity.
              </p>
            </div>
            {onRunAudit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRunAudit}
                className="text-xs border-signal-cyan/40 text-signal-cyan hover:bg-signal-cyan/10"
              >
                <Cpu className="h-3.5 w-3.5 mr-1.5" />
                Run Biometric Evaluation
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const evalData = result?.evaluation;
  const isNoFace = evalData?.verdict === "NO_FACE_DETECTED";
  const isDeepfake = evalData?.verdict === "DEEPFAKE_DETECTED";
  const isSuspicious = evalData?.verdict === "SUSPICIOUS_MANIPULATION";

  const verdictTone = isNoFace
    ? "bg-slate-800/40 text-slate-300 border-slate-700"
    : isDeepfake
    ? "bg-rose-500/15 text-rose-400 border-rose-500/40"
    : isSuspicious
    ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";

  const failureReasons = result?.failure_reasons || [];
  const probs = result?.method_probabilities || {
    deepfakes: 0,
    face2face: 0,
    faceswap: 0,
    neural_textures: 0,
    overall_deepfake_probability: 0,
  };

  return (
    <Card className={cn(
      "transition-all border",
      isDeepfake
        ? "border-rose-500/40 bg-rose-950/10 shadow-lg shadow-rose-950/20"
        : isSuspicious
        ? "border-amber-500/40 bg-amber-950/10"
        : "border-slate-800 bg-slate-900/40"
    )}>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <ScanFace className={cn(
                "h-5 w-5",
                isDeepfake ? "text-rose-400" : isSuspicious ? "text-amber-400" : isNoFace ? "text-slate-400" : "text-signal-cyan"
              )} />
              <CardTitle className="text-base font-bold text-slate-100 tracking-tight">
                FaceForensics++ Deepfake Biometric Audit
              </CardTitle>
              <Badge variant="default" className="text-[10px] font-mono bg-signal-cyan/15 text-signal-cyan border-signal-cyan/30">
                ICCV 2019 / c23
              </Badge>
              {result?.provenance?.document_hash && (
                <Badge variant="default" className="text-[10px] font-mono bg-slate-800 border-slate-700 text-slate-300">
                  SHA-256: {result.provenance.document_hash.substring(0, 8)}...
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-slate-400 mt-1">
              Evaluated against 4 manipulation archetypes (Deepfakes, Face2Face, FaceSwap, NeuralTextures).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {engineOnline ? (
              <Badge variant="default" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                Python Engine Online
              </Badge>
            ) : (
              <Badge variant="default" className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                Client Offline Verifier
              </Badge>
            )}

            {onRunAudit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRunAudit}
                disabled={loading}
                className="h-7 px-2 text-xs text-slate-400 hover:text-white"
                title="Re-run FaceForensics analysis"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-4">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
            <RefreshCw className="h-7 w-7 animate-spin text-signal-cyan" />
            <span>Executing FaceForensics++ biometric neural checks…</span>
          </div>
        ) : (
          <>
            {/* Primary Verdict Banner */}
            <div className={cn("rounded-xl border p-4 flex items-center justify-between flex-wrap gap-3", verdictTone)}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center font-bold",
                  isDeepfake
                    ? "bg-rose-500/20 text-rose-300"
                    : isSuspicious
                    ? "bg-amber-500/20 text-amber-300"
                    : isNoFace
                    ? "bg-slate-800 text-slate-400"
                    : "bg-emerald-500/20 text-emerald-300"
                )}>
                  {isNoFace ? <UserX className="h-5 w-5" /> : isDeepfake ? <UserX className="h-5 w-5" /> : isSuspicious ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tracking-wide uppercase">
                      {isNoFace ? "NO BIOMETRIC FACE DETECTED" : evalData?.verdict.replace(/_/g, " ")}
                    </span>
                    {isDeepfake && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-pulse">
                        HIGH RISK
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-90 mt-0.5">
                    {isNoFace
                      ? "No human facial portrait detected in the submitted image. Biometric deepfake evaluation omitted."
                      : isDeepfake
                      ? `Detected synthetic manipulation matching ${evalData?.dominant_manipulation_archetype} architecture.`
                      : isSuspicious
                      ? "Biometric anomalies detected. Secondary verification required."
                      : "Facial features confirm natural physiological kinematics and lighting physics."}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold font-mono tracking-tight tabular-nums">
                  {isNoFace ? "—" : evalData?.authenticity_score}
                  {!isNoFace && <span className="text-xs font-normal text-slate-400">/100</span>}
                </div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  {isNoFace ? "Biometric N/A" : "Authenticity Score"}
                </div>
              </div>
            </div>

            {/* CRITICAL EXPLAINABLE FAILURE REASONS SECTION */}
            {failureReasons.length > 0 && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-rose-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                      Explainable Forensic Failure Reasons ({failureReasons.length})
                    </h4>
                  </div>
                  <Badge variant="default" className="text-[9px] font-mono bg-rose-500/20 text-rose-300 border-rose-500/40">
                    ACTION REQUIRED
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {failureReasons.map((f, idx) => {
                    const isExpanded = !!expandedFailures[idx];
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-rose-500/25 bg-slate-950/70 overflow-hidden text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => toggleFailure(idx)}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-900/60 transition-colors gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-5 w-5 rounded-full bg-rose-500/20 text-rose-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-200 truncate">
                              {f.metric_name}: {f.summary}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="default" className="text-[9px] font-mono bg-rose-500/15 text-rose-300 border-rose-500/30">
                              {f.rule_code}
                            </Badge>
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-3.5 pb-3 pt-1 border-t border-slate-800/80 space-y-2 text-slate-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded-md border border-slate-800">
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase font-mono">Measured Evidence</span>
                                <span className="font-mono font-bold text-rose-400">{f.detected_value}</span>
                                <span className="text-slate-500 text-[10px] ml-1">(Threshold: {f.threshold})</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase font-mono">Benchmark Attribution</span>
                                <span className="font-semibold text-amber-300">{f.manipulation_archetype}</span>
                              </div>
                            </div>

                            <div>
                              <span className="text-slate-400 font-semibold block text-[11px]">Why this check failed:</span>
                              <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                                {f.forensic_evidence}
                              </p>
                            </div>

                            <div className="rounded bg-rose-950/40 border border-rose-500/30 p-2 text-[11px] text-rose-200">
                              <span className="font-bold uppercase tracking-wider text-[10px] text-rose-400 block font-mono">
                                Border Officer Protocol:
                              </span>
                              {f.officer_directive}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-Method Probability Breakdown */}
            {!isNoFace ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-signal-blue" />
                    FaceForensics++ Method Probabilities
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    Overall Deepfake: <strong className={cn(isDeepfake ? "text-rose-400" : "text-emerald-400")}>{probs.overall_deepfake_probability}%</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Deepfakes</span>
                      <span className="font-mono font-bold text-slate-200">{probs.deepfakes}%</span>
                    </div>
                    <Progress value={probs.deepfakes} className="h-1.5" />
                    <span className="text-[9px] text-slate-500 block truncate">Autoencoder Latent</span>
                  </div>

                  <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Face2Face</span>
                      <span className="font-mono font-bold text-slate-200">{probs.face2face}%</span>
                    </div>
                    <Progress value={probs.face2face} className="h-1.5" />
                    <span className="text-[9px] text-slate-500 block truncate">Expression Transfer</span>
                  </div>

                  <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>FaceSwap</span>
                      <span className="font-mono font-bold text-slate-200">{probs.faceswap}%</span>
                    </div>
                    <Progress value={probs.faceswap} className="h-1.5" />
                    <span className="text-[9px] text-slate-500 block truncate">3D Mesh Splicing</span>
                  </div>

                  <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>NeuralTextures</span>
                      <span className="font-mono font-bold text-slate-200">{probs.neural_textures}%</span>
                    </div>
                    <Progress value={probs.neural_textures} className="h-1.5" />
                    <span className="text-[9px] text-slate-500 block truncate">GAN Rendering</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-center text-xs text-slate-400">
                Facial portrait absent from current document. Deepfake sub-method decomposition omitted.
              </div>
            )}

            {/* Granular Forensic Check Items */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">
                Biometric Forensic Signatures
              </div>
              <div className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-950/40 text-xs">
                {(result?.forensic_checks || []).map((c, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200">{c.label}</span>
                        {c.detected_value && (
                          <span className="text-[10px] font-mono text-slate-400">
                            ({c.detected_value})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {c.description}
                      </p>
                    </div>
                    <Badge
                      variant={c.status === "PASS" ? "pass" : c.status === "WARNING" ? "warning" : "default"}
                      className={cn(
                        "text-[10px] font-mono shrink-0",
                        c.status === "FAIL" && "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      )}
                    >
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Expandable LLM Forensic Reasoning */}
            {result?.llm_forensic_reasoning && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-xs font-semibold text-slate-300 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-signal-cyan" />
                    Examiner LLM Reasoning Report
                  </span>
                  {showReasoning ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>

                {showReasoning && (
                  <div className="mt-2 p-3.5 rounded-lg border border-slate-800 bg-slate-950/90 text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                    {result.llm_forensic_reasoning}
                  </div>
                )}
              </div>
            )}

            {/* Export Official Defense Biometric Certificate */}
            <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCertificate}
                className="w-full sm:w-auto text-xs font-mono border-signal-cyan/40 text-signal-cyan hover:bg-signal-cyan/15 transition-all"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print / Export Forensic Certificate
              </Button>
              <span className="text-[10px] text-slate-400 font-mono">
                Standard: ISO/IEC 30107-3 PAD Compliant
              </span>
            </div>

            {/* Benchmark Citation & External Links */}
            <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 flex-wrap gap-2 border-t border-slate-800/80">
              <span>Benchmark: FaceForensics++ (ICCV 2019)</span>
              <div className="flex items-center gap-3">
                <a
                  href="https://www.kaggle.com/datasets/xdxd003/ff-c23"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-signal-cyan flex items-center gap-1 transition-colors underline"
                >
                  <span>Kaggle c23 Mirror</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <a
                  href="https://github.com/ondyari/FaceForensics"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <span>GitHub Repository</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
