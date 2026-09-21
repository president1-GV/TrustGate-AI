import * as React from "react";
import {
  Cpu,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Loader2,
  Layers,
  Sparkles,
  ShieldAlert,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { MidvVerificationResult, MidvForensicCheck } from "@/lib/midvService";

interface MidvAuditCardProps {
  result: MidvVerificationResult | null;
  loading: boolean;
  engineOnline: boolean;
  onRunAudit: () => void;
  className?: string;
}

export function MidvAuditCard({
  result,
  loading,
  engineOnline,
  onRunAudit,
  className,
}: MidvAuditCardProps) {
  const conformityTone = React.useMemo(() => {
    if (!result) return { badge: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-700", border: "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40", text: "text-slate-900 dark:text-slate-200" };
    switch (result.evaluation.conformity_level) {
      case "CONFORMANT":
        return {
          badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 font-bold",
          border: "border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/5",
          text: "text-emerald-700 dark:text-emerald-400 font-extrabold",
        };
      case "SUSPICIOUS":
        return {
          badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 font-bold",
          border: "border-amber-300 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/5",
          text: "text-amber-700 dark:text-amber-400 font-extrabold",
        };
      case "NON_CONFORMANT":
      default:
        return {
          badge: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 font-bold",
          border: "border-rose-300 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/5",
          text: "text-rose-700 dark:text-rose-400 font-extrabold",
        };
    }
  }, [result]);

  const recommendationTone = React.useMemo(() => {
    if (!result) return "";
    switch (result.evaluation.recommendation) {
      case "APPROVE_CLEARANCE":
        return "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 font-bold";
      case "FLAG_FOR_SUPERVISOR_REVIEW":
        return "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 font-bold";
      case "ESCALATE_FRAUD_INVESTIGATION":
      default:
        return "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 font-bold";
    }
  }, [result]);

  return (
    <Card className={cn("border-signal-cyan/30 bg-ink-card/60 shadow-glow relative overflow-hidden", className)}>
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-signal-cyan/10 rounded-full blur-2xl pointer-events-none" />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-signal-cyan/15 border border-signal-cyan/30 flex items-center justify-center">
                <BrainCircuit className="h-4 w-4 text-signal-cyan" />
              </div>
              <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                MIDV-2020 Python LLM Forensic Audit
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>Ground-truth validation by</span>
              <a
                href="http://l3i-share.univ-lr.fr"
                target="_blank"
                rel="noreferrer"
                className="text-signal-cyan hover:underline inline-flex items-center gap-0.5 font-medium"
              >
                L3i Laboratory, Univ. of La Rochelle
                <ExternalLink className="h-3 w-3 inline" />
              </a>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {engineOnline ? (
              <Badge variant="default" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[11px] font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                Python 3.14 (:8000)
              </Badge>
            ) : (
              <Badge variant="default" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[11px] font-mono">
                Client Offline Verifier
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={onRunAudit}
              className="h-7 text-xs border-signal-cyan/30 hover:bg-signal-cyan/10 text-signal-cyan"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} />
              {loading ? "Evaluating..." : result ? "Re-audit" : "Run Audit"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {loading && !result && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="h-8 w-8 text-signal-cyan animate-spin" />
            <div className="text-sm font-medium text-slate-200">
              Running MIDV-2020 Python LLM Forensic Verification...
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              Verifying ICAO 9303 checksums, 7-3-1 weightings, archetype aspect ratio, and generating Chain-of-Thought reasoning.
            </p>
          </div>
        )}

        {!loading && !result && (
          <div className="rounded-xl border border-dashed border-ink-border p-5 text-center space-y-3">
            <div className="h-10 w-10 mx-auto rounded-xl bg-signal-cyan/10 border border-signal-cyan/30 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-signal-cyan" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-200">
                Awaiting MIDV-2020 Forensic Audit
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Evaluate this document against the 10 MIDV-2020 archetypes (passports, ID cards, driving licenses) with mathematical MRZ validation and LLM explainable forensic reasoning.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={onRunAudit}
              className="bg-signal-cyan/20 border border-signal-cyan/40 text-signal-cyan hover:bg-signal-cyan/30"
            >
              <Cpu className="h-3.5 w-3.5 mr-1.5" /> Run MIDV-2020 Audit
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Top Score Banner */}
            <div className={cn("rounded-xl border p-4 transition-colors shadow-xs", conformityTone.border)}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold">
                    Archetype Match ({result.benchmark.country})
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-2">
                    <span>{result.benchmark.archetype_name}</span>
                    <Badge variant="default" className="text-[10px] font-mono border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {result.benchmark.standard}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Standard Aspect Ratio: <strong className="text-slate-900 dark:text-slate-200 font-mono font-bold">{result.benchmark.expected_aspect_ratio.toFixed(3)}</strong>
                  </div>
                  {result.provenance?.document_hash && (
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                      <span className="text-signal-blue dark:text-signal-cyan font-bold">SHA-256:</span>
                      <span className="text-slate-800 dark:text-slate-300 font-medium" title={result.provenance.document_hash}>
                        {result.provenance.document_hash.substring(0, 12)}...{result.provenance.document_hash.substring(result.provenance.document_hash.length - 6)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold">
                    Conformity Score
                  </div>
                  <div className={cn("text-2xl font-black tabular-nums mt-0.5", conformityTone.text)}>
                    {result.evaluation.overall_score}
                    <span className="text-sm text-slate-600 dark:text-slate-500 font-normal"> / 100</span>
                  </div>
                  <Badge className={cn("mt-1 text-[10px] font-bold px-2 py-0.5", conformityTone.badge)}>
                    {result.evaluation.conformity_level}
                  </Badge>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-ink-border/40 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓ {result.evaluation.passed_count} Passed</span>
                  {result.evaluation.warning_count > 0 && (
                    <span className="text-amber-700 dark:text-amber-400 font-bold">⚠ {result.evaluation.warning_count} Warnings</span>
                  )}
                  {result.evaluation.failed_count > 0 && (
                    <span className="text-rose-700 dark:text-rose-400 font-bold">✕ {result.evaluation.failed_count} Failed</span>
                  )}
                </div>

                <Badge className={cn("text-[10px] font-mono tracking-wide uppercase px-2 py-0.5", recommendationTone)}>
                  Directive: {result.evaluation.recommendation.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>

            {/* Neural Fusion Assessment (TrustGate-FusionNet) */}
            {result.neural_classification && (
              <div className="rounded-xl border border-purple-300 bg-purple-50/80 dark:border-purple-500/30 dark:bg-purple-950/20 p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-purple-700 dark:text-purple-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-purple-900 dark:text-purple-200">
                      TrustGate-FusionNet Neural Verdict
                    </span>
                    <Badge variant="default" className="text-[9px] font-mono font-bold bg-purple-200/80 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40">
                      16-FEATURE FUSION
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "text-[10px] font-mono uppercase font-bold px-2 py-0.5",
                        result.neural_classification.is_genuine
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                          : "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40"
                      )}
                    >
                      {result.neural_classification.predicted_class.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-[11px] font-mono text-slate-700 dark:text-slate-400 font-medium">
                      Conf: <strong className="text-slate-900 dark:text-slate-100 font-bold">{(result.neural_classification.confidence * 100).toFixed(1)}%</strong>
                    </span>
                  </div>
                </div>

                {/* Class Probabilities Bar - Responsive & Non-truncated */}
                {result.neural_classification.class_probabilities && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                    {Object.entries(result.neural_classification.class_probabilities).map(([cls, prob]) => {
                      const pctVal = Math.round(Number(prob) * 100);
                      const isWinner = cls === result.neural_classification?.predicted_class;
                      return (
                        <div
                          key={cls}
                          className={cn(
                            "p-2 rounded-lg border text-[10px] font-mono flex flex-col justify-between transition-all",
                            isWinner
                              ? "border-purple-400 bg-purple-100/90 shadow-xs dark:border-purple-500/50 dark:bg-purple-950/50"
                              : "border-slate-200 bg-white/90 shadow-2xs dark:border-slate-800 dark:bg-slate-900/40"
                          )}
                        >
                          <div
                            className={cn(
                              "font-medium text-[9.5px] leading-tight break-words min-h-[26px] line-clamp-2",
                              isWinner ? "text-purple-950 dark:text-purple-200 font-bold" : "text-slate-700 dark:text-slate-400"
                            )}
                            title={cls.replace(/_/g, " ")}
                          >
                            {cls.replace(/_/g, " ")}
                          </div>
                          <div
                            className={cn(
                              "font-extrabold text-xs sm:text-sm mt-1 tabular-nums",
                              isWinner ? "text-purple-800 dark:text-purple-300" : "text-slate-800 dark:text-slate-200"
                            )}
                          >
                            {pctVal}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Explainable Physical & Mathematical Failure Reasons */}
            {result.failure_reasons && result.failure_reasons.length > 0 && (
              <div className="rounded-xl border border-rose-300 bg-rose-50/70 dark:border-rose-500/40 dark:bg-rose-950/20 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-700 dark:text-rose-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-200">
                      Explainable Forensic Failure Reasons ({result.failure_reasons.length})
                    </span>
                  </div>
                  <Badge variant="default" className="text-[9px] font-mono font-bold bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40">
                    EXACT PHYSICAL &amp; MATHEMATICAL CRITERIA
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {result.failure_reasons.map((f, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-rose-300 bg-white dark:border-rose-500/30 dark:bg-slate-950/70 p-3 space-y-2 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-extrabold text-rose-800 dark:text-rose-300 text-xs">
                            {idx + 1}. {f.metric_name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">[{f.rule_code}]</span>
                        </div>
                        <Badge
                          variant="default"
                          className={cn(
                            "text-[9px] font-mono uppercase font-bold",
                            f.severity === "CRITICAL"
                              ? "bg-rose-600 text-white"
                              : "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40"
                          )}
                        >
                          {f.severity || "CRITICAL"}
                        </Badge>
                      </div>

                      <div className="text-slate-800 dark:text-slate-200 font-semibold text-[11.5px] leading-snug">{f.summary}</div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-md font-mono text-[11px] bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800">
                        <div>
                          <span className="text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold block">Measured Finding:</span>
                          <strong className="text-rose-700 dark:text-rose-400 font-black text-xs">{f.detected_value}</strong>
                        </div>
                        <div>
                          <span className="text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold block">Standard Threshold:</span>
                          <strong className="text-emerald-700 dark:text-emerald-400 font-black text-xs">{f.threshold}</strong>
                        </div>
                      </div>

                      {f.forensic_evidence && (
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 italic pt-0.5">
                          Evidence: {f.forensic_evidence}
                        </p>
                      )}

                      {f.officer_directive && (
                        <div className="text-[11px] font-bold text-rose-950 bg-rose-100 border border-rose-300 dark:text-rose-200 dark:bg-rose-950/50 dark:border-rose-500/30 px-3 py-1.5 rounded-md leading-snug">
                          Officer Directive: {f.officer_directive}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Itemized Forensic Percentage Metrics Breakdown */}
            {result.failure_percentage_breakdown && Object.keys(result.failure_percentage_breakdown).length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white dark:border-signal-blue/30 dark:bg-slate-950/60 p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-signal-blue dark:text-signal-cyan uppercase tracking-wider">
                    <Percent className="h-3.5 w-3.5" />
                    Itemized Forensic Risk Breakdown &amp; Percentages
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-medium">
                    Calculated via Multi-Vector Sensor Fusion
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(result.failure_percentage_breakdown).map(([riskKey, riskVal]) => {
                    const pctNum = Math.round(Number(riskVal));
                    const isHigh = pctNum > 45;
                    const isMed = pctNum > 20 && pctNum <= 45;
                    return (
                      <div
                        key={riskKey}
                        className="rounded-lg border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50 p-2 space-y-1 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-700 dark:text-slate-400 truncate font-semibold">{riskKey.replace(/_/g, " ")}</span>
                          <strong
                            className={cn(
                              "font-bold tabular-nums",
                              isHigh ? "text-rose-700 dark:text-rose-400" : isMed ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                            )}
                          >
                            {pctNum}%
                          </strong>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-950 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              isHigh ? "bg-rose-500" : isMed ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${Math.min(100, Math.max(2, pctNum))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Forensic Checks Breakdown */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-signal-blue dark:text-signal-cyan" />
                Forensic Rule Checks ({result.forensic_checks.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {result.forensic_checks.map((check, idx) => (
                  <ForensicCheckItem key={idx} check={check} />
                ))}
              </div>
            </div>

            {/* Explainable LLM Forensic Reasoning */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-signal-blue/30 dark:bg-ink-card/80 p-3.5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-signal-blue dark:text-signal-cyan flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  LLM Forensic Examiner Assessment
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-500 font-mono font-semibold">
                  {result.engine_mode === "PYTHON_SERVICE" ? "Python LLM Engine" : "Air-Gapped Engine"}
                </span>
              </div>
              <div className="text-xs text-slate-800 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line bg-slate-50 dark:bg-ink-base/60 p-3 rounded-lg border border-slate-200 dark:border-ink-border/50">
                {result.llm_forensic_reasoning}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ForensicCheckItem({ check }: { check: MidvForensicCheck }) {
  const Icon =
    check.status === "PASS"
      ? CheckCircle2
      : check.status === "WARNING"
      ? AlertTriangle
      : XCircle;

  const tone =
    check.status === "PASS"
      ? "text-emerald-800 dark:text-emerald-300 border-emerald-300 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/5"
      : check.status === "WARNING"
      ? "text-amber-900 dark:text-amber-300 border-amber-300 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/5"
      : "text-rose-800 dark:text-rose-300 border-rose-300 bg-rose-50/80 dark:border-rose-500/20 dark:bg-rose-500/5";

  return (
    <div className={cn("rounded-lg border p-2.5 text-xs flex items-start gap-2.5 shadow-2xs", tone)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="font-bold text-slate-900 dark:text-slate-200 flex items-center justify-between gap-1">
          <span>{check.label}</span>
          <span className="text-[10px] font-mono uppercase font-bold">{check.status}</span>
        </div>
        <p className="text-[11px] text-slate-700 dark:text-slate-400 mt-0.5 leading-snug">{check.description}</p>
        {(check.viz_value || check.mrz_value) && (
          <div className="mt-1.5 text-[10px] font-mono text-slate-600 dark:text-slate-400 flex flex-wrap gap-2">
            {check.viz_value && <span>VIZ: <strong className="text-slate-900 dark:text-slate-200 font-bold">{check.viz_value}</strong></span>}
            {check.mrz_value && <span>MRZ: <strong className="text-slate-900 dark:text-slate-200 font-bold">{check.mrz_value}</strong></span>}
          </div>
        )}
      </div>
    </div>
  );
}
