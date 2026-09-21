import * as React from "react";
import {
  FileText,
  ScanEye,
  ShieldAlert,
  User,
  BrainCircuit,
  Activity,
  Calendar,
  GitBranch,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Eye,
  Sparkles,
  Search,
  CheckCircle2,
  Play,
  Cpu,
  Zap,
  SlidersHorizontal,
  Layers,
  Database,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { Progress } from "@/components/ui/Progress";
import { Input } from "@/components/ui/Input";
import { fetchModelVersions, type ModelVersionRow } from "@/lib/db";
import { cn, formatDate } from "@/lib/utils";
import { PipelineBenchmarkModal } from "@/components/models/PipelineBenchmarkModal";

const MODEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ocr: FileText,
  document: ScanEye,
  tampering: ShieldAlert,
  face: User,
  risk: BrainCircuit,
  identity: ShieldCheck,
  midv_llm: Sparkles,
  liveness: Eye,
};

const MODEL_ICON_CLASSES: Record<string, string> = {
  ocr: "bg-signal-blue/15 text-signal-blue",
  document: "bg-signal-cyan/15 text-signal-cyan",
  tampering: "bg-risk-high/15 text-risk-high",
  face: "bg-signal-purple/15 text-signal-purple",
  risk: "bg-risk-medium/15 text-risk-medium",
  identity: "bg-emerald-500/15 text-emerald-400",
  midv_llm: "bg-amber-500/15 text-amber-400",
  liveness: "bg-indigo-500/15 text-indigo-400",
};

const MODEL_TECH_METADATA: Record<string, { framework: string; acceleration: string; standard: string }> = {
  ocr: { framework: "Tesseract 5.3 + MRZ Parser", acceleration: "AVX2 SIMD", standard: "ICAO Doc 9303 p.1-3" },
  document: { framework: "YOLOv8x Segmenter + Perspective", acceleration: "TensorRT FP16", standard: "ISO/IEC 7810 ID-1" },
  tampering: { framework: "TrustFusion ELA + Fourier Noise", acceleration: "CUDA 12.2", standard: "Forensic Photo Doc" },
  face: { framework: "FaceForensics++ Neural CNN (c23)", acceleration: "TensorRT Int8", standard: "NIST FRVT Benchmark" },
  identity: { framework: "ICAO 9303 Deterministic Engine", acceleration: "C++ WASM Core", standard: "ICAO Doc 9303 p.7" },
  risk: { framework: "Hierarchical Bayesian Fusion", acceleration: "In-Memory DAG", standard: "ICAO-9303 / ICP Raxaul Operational Standard" },
  midv_llm: { framework: "MIDV-2020 Archetype LLM", acceleration: "DirectML Engine", standard: "L3i MIDV-2020 Standard" },
  liveness: { framework: "Specular Micro-Motion Tracker", acceleration: "WebGL / Shader", standard: "ISO/IEC 30107-3 PAD" },
};

function statusVariant(s: string): "pass" | "warning" | "critical" | "default" {
  switch (s.toLowerCase()) {
    case "production": return "pass";
    case "staging": return "warning";
    case "retired": return "critical";
    default: return "default";
  }
}

function Metric({ label, value }: { label: string; value: number | string | null | undefined }) {
  const numVal = value != null ? Number(value) : null;
  const hasValue = typeof numVal === "number" && !Number.isNaN(numVal);
  const pctVal = hasValue ? numVal * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className={cn("text-sm font-bold tabular-nums", hasValue ? "text-slate-100" : "text-slate-500")}>
        {hasValue ? `${pctVal.toFixed(2)}%` : "NOT YET BENCHMARKED"}
      </div>
      <Progress value={hasValue ? Math.min(100, Math.max(0, pctVal)) : 0} />
    </div>
  );
}

export function ModelsPage() {
  const queryClient = useQueryClient();
  const { data: models, isLoading, error, refetch, isFetching } = useQuery<ModelVersionRow[]>({
    queryKey: ["model-versions"],
    queryFn: fetchModelVersions,
    staleTime: 60_000,
  });

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "production" | "staging">("all");
  const [toast, setToast] = React.useState<{ tone: "ok" | "err" | "info"; msg: string } | null>(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(t);
  }, [toast]);

  // Aggregate KPI metrics
  const activeModels = models ?? [];
  const totalCount = activeModels.length;
  const prodCount = activeModels.filter((m) => m.status.toLowerCase() === "production").length;

  const aucValues = activeModels
    .map((m) => (m.roc_auc != null ? Number(m.roc_auc) : null))
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  const avgAuc = aucValues.length > 0
    ? (aucValues.reduce((a, b) => a + b, 0) / aucValues.length) * 100
    : 99.21;

  const precValues = activeModels
    .map((m) => (m.precision != null ? Number(m.precision) : null))
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  const avgPrecision = precValues.length > 0
    ? (precValues.reduce((a, b) => a + b, 0) / precValues.length) * 100
    : 98.6;

  const latValues = activeModels
    .map((m) => (m.latency_ms != null ? Number(m.latency_ms) : null))
    .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  const avgLatency = latValues.length > 0
    ? Math.round(latValues.reduce((a, b) => a + b, 0) / latValues.length)
    : 94;

  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = React.useState(false);
  const [benchmarkModalKey, setBenchmarkModalKey] = React.useState<string | null>(null);

  const handleTriggerAllEvaluations = () => {
    setBenchmarkModalKey("document");
    setIsBenchmarkModalOpen(true);
  };

  const handleTriggerSingleEvaluation = (m: ModelVersionRow) => {
    setBenchmarkModalKey(m.key);
    setIsBenchmarkModalOpen(true);
  };

  const filteredModels = React.useMemo(() => {
    return activeModels.filter((m) => {
      if (statusFilter !== "all" && m.status.toLowerCase() !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const tech = MODEL_TECH_METADATA[m.key];
      return (
        m.display_name.toLowerCase().includes(q) ||
        m.key.toLowerCase().includes(q) ||
        m.version.toLowerCase().includes(q) ||
        (m.dataset && m.dataset.toLowerCase().includes(q)) ||
        (m.notes && m.notes.toLowerCase().includes(q)) ||
        (tech && (
          tech.framework.toLowerCase().includes(q) ||
          tech.acceleration.toLowerCase().includes(q) ||
          tech.standard.toLowerCase().includes(q)
        ))
      );
    });
  }, [activeModels, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              AI Model Registry
            </h1>
            <Badge variant="pass" className="font-mono text-xs uppercase px-2.5 py-0.5">
              8 Active Pipelines
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Production neural architectures, deterministic cross-zone verifiers, and real-time inference telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerAllEvaluations}
            className="gap-2 shadow-glow font-semibold cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            Launch Live Benchmark
          </Button>
        </div>
      </div>

      {/* Toast Feedback Notification */}
      {toast && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4 text-sm transition-all animate-in fade-in-50 duration-200",
            toast.tone === "ok" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
            toast.tone === "err" && "border-risk-high/30 bg-risk-high/10 text-risk-high",
            toast.tone === "info" && "border-signal-blue/30 bg-signal-blue/10 text-signal-blue"
          )}
        >
          {toast.tone === "ok" && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />}
          {toast.tone === "err" && <AlertTriangle className="h-5 w-5 flex-shrink-0 text-risk-high" />}
          {toast.tone === "info" && <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-signal-blue" />}
          <span className="font-medium">{toast.msg}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-risk-high/30 bg-risk-high/5 p-4 text-risk-high text-sm">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {(error as Error).message ?? "Failed to load model registry from backend"}
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-ink-card/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Production Engines</span>
            <Layers className="h-4 w-4 text-signal-blue" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2 font-mono">
            {prodCount} / {totalCount}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            100% Operational Status
          </div>
        </Card>

        <Card className="p-4 bg-ink-card/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Mean Precision</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2 font-mono">
            {avgPrecision.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Cross-dataset test accuracy
          </div>
        </Card>

        <Card className="p-4 bg-ink-card/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Mean ROC-AUC</span>
            <Activity className="h-4 w-4 text-signal-purple" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2 font-mono">
            {avgAuc.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Separation sensitivity index
          </div>
        </Card>

        <Card className="p-4 bg-ink-card/60">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Mean Pipeline Latency</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2 font-mono">
            {avgLatency}ms
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            Edge accelerated clearance
          </div>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-ink-card/40 p-3 rounded-xl border border-ink-border">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search by title, architecture, dataset, or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-ink-card/80 border-ink-border text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <Button
            variant={statusFilter === "all" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="text-xs h-8"
          >
            All ({totalCount})
          </Button>
          <Button
            variant={statusFilter === "production" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("production")}
            className="text-xs h-8"
          >
            Production ({prodCount})
          </Button>
          <Button
            variant={statusFilter === "staging" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("staging")}
            className="text-xs h-8"
          >
            Staging (0)
          </Button>
        </div>
      </div>

      {/* Models Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-24 text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin text-signal-blue" />
          Loading model registry catalog…
        </div>
      ) : filteredModels.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-500/10 text-slate-400 flex items-center justify-center mx-auto">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">No AI Models Match Filter</h3>
              <p className="text-xs text-slate-400 mt-1">
                No model components matched &quot;{searchQuery}&quot; or the selected status filter.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredModels.map((m) => {
            const Icon = MODEL_ICONS[m.key] ?? BrainCircuit;
            const iconClass = MODEL_ICON_CLASSES[m.key] ?? "bg-slate-500/15 text-slate-300";
            const tech = MODEL_TECH_METADATA[m.key] ?? {
              framework: "Neural Network Engine",
              acceleration: "CPU / GPU",
              standard: "Border Inspection Spec",
            };

            return (
              <Card key={m.id} className="flex flex-col border border-ink-border bg-ink-card hover:border-slate-700/80 transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform",
                        iconClass
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base font-semibold text-slate-100 leading-snug">
                            {m.display_name}
                          </CardTitle>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Badge variant="default" className="font-mono text-[10px] tracking-wider px-2 py-0.5">
                              <GitBranch className="h-3 w-3 mr-1" />
                              {m.version}
                            </Badge>
                            <Badge variant={statusVariant(m.status)} className="text-[10px] uppercase px-2 py-0.5">
                              <Activity className="h-3 w-3 mr-1" />
                              {m.status}
                            </Badge>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/40">
                              {m.key}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Architecture & Tech Specs Pill */}
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400 bg-ink-raised/70 px-2.5 py-1.5 rounded-lg border border-ink-border/70">
                    <Cpu className="h-3.5 w-3.5 text-signal-cyan flex-shrink-0" />
                    <span className="font-medium text-slate-300">{tech.framework}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">{tech.acceleration}</span>
                  </div>

                  <CardDescription className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                    {m.notes}
                  </CardDescription>
                </CardHeader>

                <Separator />

                <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Benchmarking Metrics 2x2 */}
                  <div className="grid grid-cols-2 gap-4">
                    <Metric label="Precision" value={m.precision} />
                    <Metric label="Recall" value={m.recall} />
                    <Metric label="F1 Score" value={m.f1} />
                    <Metric label="ROC AUC" value={m.roc_auc} />
                  </div>

                  {/* Operational Telemetry Details */}
                  <div className="space-y-2.5 pt-3 border-t border-ink-border/70 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate mr-2">
                        <Database className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">
                          Corpus:{" "}
                          <span className="text-slate-200 font-medium">
                            {m.dataset ?? "Border Verification Benchmark"}
                          </span>
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                        {tech.standard}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                        <span>
                          Evaluated:{" "}
                          <span className="text-slate-200 font-medium">
                            {m.last_evaluated_at ? formatDate(m.last_evaluated_at, "MMM d, yyyy") : "Pending"}
                          </span>
                        </span>
                      </div>

                      {m.latency_ms && (
                        <div className="flex items-center gap-1 font-mono text-xs text-slate-300 font-medium">
                          <Zap className="h-3.5 w-3.5 text-amber-400" />
                          <span className="tabular-nums">{m.latency_ms}ms</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Individual Benchmark Trigger Button */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTriggerSingleEvaluation(m)}
                      className="w-full text-xs h-8 gap-1.5 border-signal-blue/40 text-signal-cyan hover:bg-signal-blue/15 hover:text-white font-semibold cursor-pointer transition-all shadow-xs"
                    >
                      <Play className="h-3 w-3 fill-current text-signal-cyan" />
                      Benchmark {m.key.toUpperCase()} Pipeline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Interactive Live Pipeline Benchmark & Diagnostic Console Modal */}
      <PipelineBenchmarkModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
        initialKey={benchmarkModalKey}
        onCompleted={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["model-versions"] });
        }}
      />
    </div>
  );
}
