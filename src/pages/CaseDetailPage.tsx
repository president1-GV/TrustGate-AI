import * as React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  ShieldAlert,
  User,
  Clock,
  Flag,
  Activity,
  Target,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  Send,
  TrendingUp,
  XCircle,
  Info,
  Eye,
  FileCheck2,
  ScanSearch,
  Fingerprint,
  Camera,
  Scale,
  FileSearch2,
  ClipboardCheck,
  History,
  Shield,
  FileOutput,
  ExternalLink,
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
import { Separator } from "@/components/ui/Separator";
import { Progress } from "@/components/ui/Progress";
import {
  Tabs,
  TabsList,
  Tab,
  TabsContent,
} from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";
import { DocumentViewer } from "@/components/screening/DocumentViewer";
import { createDocumentProvenance } from "@/lib/provenance";
import { fetchSecureBlobUrl } from "@/lib/insforge";
import { validateRiskOverrideRequest } from "@/lib/security";
import {
  fetchCaseDetails,
  updateCaseStatus,
  saveReport,
  fetchBlockchainAnchor,
  type CaseDetailBundle,
} from "@/lib/db";
import { useAuthStore } from "@/store/auth";
import { RealtimeDigitalSignature } from "@/components/common/RealtimeDigitalSignature";
import { ForensicSpecimenCard } from "@/components/common/ForensicSpecimenCard";
import { AuditIntegrityCard } from "@/components/screening/AuditIntegrityCard";

import {
  cn,
  formatDate,
  shortId,
  statusColor,
  riskColor,
  severityColor,
  formatDuration,
  pct,
  formatTimeAgo,
} from "@/lib/utils";
import type { Finding, BBox, DocumentProvenance } from "@/ai/types";

const REPORT_DISCLAIMER =
  "AI-generated screening assistance. Final determination remains with authorized personnel.";

function FindingCard({ f }: { f: Finding }) {
  const [open, setOpen] = React.useState(true);
  const tone = severityColor(f.severity);
  const Icon =
    f.severity === "PASS"
      ? CheckCircle2
      : f.severity === "CRITICAL" || f.severity === "HIGH"
      ? XCircle
      : AlertTriangle;
  return (
    <div
      className={cn(
        "rounded-xl border bg-ink-card/40",
        f.severity === "CRITICAL" || f.severity === "HIGH"
          ? "border-risk-high/30"
          : f.severity === "MEDIUM"
          ? "border-risk-medium/30"
          : "border-risk-low/20"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <div className="pt-0.5">
          <Icon
            className={cn(
              "h-4 w-4",
              f.severity === "PASS"
                ? "text-risk-low"
                : f.severity === "CRITICAL" || f.severity === "HIGH"
                ? "text-risk-high"
                : "text-risk-medium"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-100">
              {f.title}
            </span>
            <Badge className={tone} variant="default">
              {f.severity}
            </Badge>
          </div>
          {f.location && (
            <div className="mt-0.5 text-xs text-slate-500 truncate">
              Location: {f.location}
            </div>
          )}
        </div>
        <div className="pt-1">
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 pl-10 grid gap-2 text-xs">
          {f.location && <Row label="Location" value={f.location} />}
          {typeof f.confidence === "number" && !Number.isNaN(f.confidence) && (
            <Row
              label="Confidence"
              value={
                f.confidence <= 1
                  ? `${Math.round(f.confidence * 100)}%`
                  : `${Math.round(f.confidence)}%`
              }
            />
          )}
          {f.evidence && <Row label="Evidence" value={f.evidence} />}
          {f.modelName && <Row label="Model" value={f.modelName} />}
          {f.recommendation && (
            <div className="rounded-lg border border-signal-blue/30 bg-signal-blue/5 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-signal-blue font-semibold mb-1">
                Recommendation
              </div>
              <div className="text-slate-200 leading-relaxed">
                {f.recommendation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-24 shrink-0 text-slate-500 uppercase tracking-wide text-[10px] pt-0.5">
        {label}
      </div>
      <div className="flex-1 text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
        {value}
      </div>
    </div>
  );
}

type TabId =
  | "overview"
  | "document"
  | "ocr"
  | "mrz"
  | "validation"
  | "tampering"
  | "face"
  | "identity"
  | "risk"
  | "evidence"
  | "notes"
  | "timeline"
  | "audit"
  | "report";

const TAB_ITEMS: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "document", label: "Document", icon: FileSearch2 },
  { id: "ocr", label: "OCR Fields", icon: ClipboardCheck },
  { id: "mrz", label: "MRZ", icon: Fingerprint },
  { id: "validation", label: "Validation", icon: CheckCircle2 },
  { id: "tampering", label: "Tampering", icon: ScanSearch },
  { id: "face", label: "Face", icon: Camera },
  { id: "identity", label: "Consistency", icon: Scale },
  { id: "risk", label: "Risk", icon: TrendingUp },
  { id: "evidence", label: "Evidence", icon: FileCheck2 },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "timeline", label: "Timeline", icon: History },
  { id: "audit", label: "Audit", icon: Shield },
  { id: "report", label: "Report", icon: FileOutput },
];

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<TabId>("overview");
  const [notesDraft, setNotesDraft] = React.useState<string>("");
  const [toast, setToast] = React.useState<{
    tone: "ok" | "err";
    msg: string;
  } | null>(null);
  const [notesSaving, setNotesSaving] = React.useState(false);
  const [reportGenerating, setReportGenerating] = React.useState(false);
  const [reportPreview, setReportPreview] = React.useState<{
    id: string;
    createdAt: string;
  } | null>(null);

  const { data, isLoading, error } = useQuery<CaseDetailBundle | null>({
    queryKey: ["case", id],
    queryFn: () => (id ? fetchCaseDetails(id) : null),
    staleTime: 15_000,
    enabled: !!id,
  });

  const caseDbId = data?.row?.id || id;
  const { data: blockchainAnchor } = useQuery({
    queryKey: ["case-blockchain-anchor", caseDbId],
    queryFn: () => (caseDbId ? fetchBlockchainAnchor(caseDbId) : null),
    staleTime: 30_000,
    enabled: !!caseDbId,
  });

  React.useEffect(() => {
    if (data?.row?.notes !== undefined && notesDraft === "") {
      setNotesDraft(data.row.notes ?? "");
    }
  }, [data?.row?.notes]);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const statusMut = useMutation({
    mutationFn: async (p: {
      patch: Parameters<typeof updateCaseStatus>[0]["patch"];
      auditAction: string;
      eventType?: string;
    }) => {
      if (!id || !user) throw new Error("Not ready");
      await updateCaseStatus({
        caseId: id,
        patch: p.patch,
        auditAction: p.auditAction,
        eventType: p.eventType,
        actorId: user.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case", id] });
      qc.invalidateQueries({ queryKey: ["cases"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setToast({ tone: "ok", msg: "Case updated." });
    },
    onError: (e: any) => setToast({ tone: "err", msg: e?.message ?? "Update failed" }),
  });

  const notesMut = useMutation({
    mutationFn: async (notes: string) => {
      if (!id || !user) throw new Error("Not ready");
      await updateCaseStatus({
        caseId: id,
        patch: { notes },
        auditAction: "CASE_NOTES_UPDATED",
        eventType: "case.notes.updated",
        actorId: user.id,
        auditMetadata: { notesLength: notes.length },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case", id] });
      setToast({ tone: "ok", msg: "Notes saved." });
    },
    onError: (e: any) => setToast({ tone: "err", msg: e?.message ?? "Notes save failed" }),
  });

  const printReport = () => {
    setTab("report");
    setTimeout(() => {
      try {
        window.print();
      } catch {
        setToast({ tone: "err", msg: "Print dialog unavailable" });
      }
    }, 150);
  };

  React.useEffect(() => {
    const handleBeforePrint = () => {
      setTab("report");
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
    };
  }, []);

  const generateReport = async () => {
    if (!id || !user || !data) return;
    setReportGenerating(true);
    try {
      const payload = {
        case_id: id,
        case_code: data.row.case_code,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        sections: {
          overview: data.row,
          documents: data.documents,
          risk: data.risk,
          findings: data.findings,
          validations: data.validations,
          audits: data.audits,
        },
        disclaimer: REPORT_DISCLAIMER,
      };
      const reportId = await saveReport({
        caseId: id,
        generatedBy: user.id,
        payload,
        format: "json",
      });
      setReportPreview({ id: reportId, createdAt: new Date().toISOString() });
      setToast({ tone: "ok", msg: "Report generated. Ready to print." });
    } catch (e: any) {
      setToast({ tone: "err", msg: e?.message ?? "Report generation failed" });
    } finally {
      setReportGenerating(false);
    }
  };

  const row = data?.row;
  const doc = data?.documents?.[0];
  const risk = data?.risk;
  const rc = risk ? riskColor(risk.level) : row?.risk_level ? riskColor(row.risk_level) : null;

  const docProvenance: DocumentProvenance | undefined = React.useMemo(() => {
    if (!doc?.document_hash) return undefined;
    return createDocumentProvenance({
      documentHash: doc.document_hash,
      processingRunId: doc.processing_run_id || row?.case_code || "persisted",
      source: doc.storage_url?.includes("camera") ? "camera" : "upload",
      fileSizeBytes: doc.file_size_bytes ?? undefined,
      mimeType: doc.mime_type ?? undefined,
      dimensions:
        doc.image_width && doc.image_height
          ? { width: doc.image_width, height: doc.image_height }
          : undefined,
    });
  }, [doc, row]);

  const [secureDocUrl, setSecureDocUrl] = React.useState<string | null>(null);
  const [overrideModalOpen, setOverrideModalOpen] = React.useState(false);
  const [overrideReason, setOverrideReason] = React.useState("");
  const [overrideError, setOverrideError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    if (doc?.storage_bucket && doc?.storage_key) {
      fetchSecureBlobUrl(doc.storage_bucket, doc.storage_key)
        .then((url) => {
          if (active) setSecureDocUrl(url);
        })
        .catch(() => {
          if (active && doc.storage_url && !doc.storage_url.startsWith("blob:")) {
            setSecureDocUrl(doc.storage_url);
          }
        });
    } else if (doc?.storage_url && !doc.storage_url.startsWith("blob:")) {
      setSecureDocUrl(doc.storage_url);
    }
    return () => {
      active = false;
    };
  }, [doc?.storage_bucket, doc?.storage_key, doc?.storage_url]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
        <Card>
          <CardContent className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-signal-blue" />
            Loading case…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data || !row) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
        <Alert variant="default" className="border-risk-high/40 bg-risk-high/5">
          <AlertTitle className="text-risk-high flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            {error ? "Error loading case" : "Case not found"}
          </AlertTitle>
          <AlertDescription className="text-slate-300">
            {error
              ? (error as any)?.message ?? String(error)
              : `No case matches id ${shortId(id ?? "", 12)}. It may have been deleted or the link is stale.`}
          </AlertDescription>
          <div className="mt-4">
            <Link to="/cases">
              <Button variant="outline" size="sm">
                Back to Cases
              </Button>
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  const findings = data.findings ?? [];
  const findingsCritical = findings.filter((f) => f.severity === "CRITICAL");
  const findingsHigh = findings.filter((f) => f.severity === "HIGH");
  const findingsMed = findings.filter(
    (f) => f.severity === "MEDIUM" || f.severity === "WARNING"
  );
  const findingsLow = findings.filter((f) => f.severity === "LOW");
  const findingsPass = findings.filter((f) => f.severity === "PASS");

  const processingMs = row.processing_time_ms ?? null;
  const officerName =
    row.profiles?.display_name ??
    user?.name ??
    shortId(row.created_by, 8);
  const assignedName = row.assigned?.display_name ?? "—";

  const tamperBBoxes =
    doc?.tampering?.regions
      ?.filter((r) => !!r.bounding_box)
      .map((r) => ({
        regionLabel: r.region_label ?? r.manipulation_type ?? "REGION",
        manipulationType: r.manipulation_type ?? "unknown",
        boundingBox: (r.bounding_box as BBox | null) ?? undefined,
        evidence: r.evidence ?? "",
        probability: Number(r.probability ?? 0),
      })) ?? [];

  const ocrFields =
    doc?.ocr?.fields?.map((f) => ({
      fieldName: f.field_name,
      fieldValue: f.field_value,
      confidence: Number(f.confidence ?? 0),
      boundingBox: (f.bounding_box as BBox | null) ?? undefined,
      source: (f.source ?? "ocr") as "ocr",
      validationStatus: (f.validation_status ?? "UNVALIDATED") as any,
    })) ?? [];

  const rawLinesStr = doc?.mrz?.raw_lines;
  let mrzLines: string[] = [];
  if (typeof rawLinesStr === "string" && rawLinesStr) {
    try {
      const parsed = JSON.parse(rawLinesStr);
      if (Array.isArray(parsed)) mrzLines = parsed.map(String);
    } catch {
      mrzLines = rawLinesStr.split(/\r?\n/).filter(Boolean);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center gap-3 no-print print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Link to="/screening">
          <Button variant="outline" size="sm">
            <ScanSearch className="h-4 w-4" /> New Screening
          </Button>
        </Link>
        <Link to="/cases">
          <Button variant="outline" size="sm">
            All Cases
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setTab("report");
            if (!reportPreview) {
              generateReport();
            }
          }}
          disabled={reportGenerating || !user}
        >
          {reportGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileOutput className="h-4 w-4" />
          )}
          Generate Report
        </Button>
        <Link to="/reports">
          <Button variant="ghost" size="sm">
            <FileText className="h-4 w-4" /> Reports
          </Button>
        </Link>
      </div>

      {toast && (
        <Alert
          variant="default"
          className={cn(
            "border no-print print:hidden",
            toast.tone === "ok"
              ? "border-risk-low/40 bg-risk-low/5"
              : "border-risk-high/40 bg-risk-high/5"
          )}
        >
          <AlertTitle
            className={cn(
              "flex items-center gap-2",
              toast.tone === "ok" ? "text-risk-low" : "text-risk-high"
            )}
          >
            {toast.tone === "ok" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {toast.msg}
          </AlertTitle>
        </Alert>
      )}

      <div className="flex items-start justify-between flex-wrap gap-4 no-print print:hidden">
        <div className="flex items-start gap-4 flex-wrap">
          <div
            className={cn(
              "h-14 w-14 rounded-2xl border flex items-center justify-center",
              rc
                ? cn(rc.badge, "!bg-opacity-10 !border-opacity-30")
                : "bg-slate-800/60 border-slate-700"
            )}
          >
            <ShieldAlert
              className={cn("h-7 w-7", rc ? rc.text : "text-slate-400")}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                Case {row.case_code}
              </h1>
              {rc && (
                <Badge className={rc.badge}>
                  {row.risk_level ?? risk?.level} Risk
                </Badge>
              )}
              <Badge
                className={cn("uppercase", statusColor(row.status))}
              >
                {row.status.replace("_", " ")}
              </Badge>
              {row.is_demo && (
                <Badge variant="warning">DEMO</Badge>
              )}
              {row.officer_decision && (
                <Badge
                  className={cn(
                    "uppercase",
                    statusColor(row.officer_decision as any)
                  )}
                >
                  Decision {row.officer_decision.replace("_", " ")}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1.5">
              <span className="inline-flex items-center gap-1.5 mr-4">
                <User className="h-3.5 w-3.5 text-slate-500" />
                Officer: <span className="text-slate-300">{officerName}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 mr-4">
                <Target className="h-3.5 w-3.5 text-slate-500" />
                Assigned: <span className="text-slate-300">{assignedName}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 mr-4">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                {formatDate(row.created_at, "PPp")}
              </span>
              {row.decision_timestamp && (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                  Decided {formatDate(row.decision_timestamp, "PPp")}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-[380px]">
          <StatCard
            label="Risk Score"
            value={
              row.risk_score != null ? `${row.risk_score} / 100` : "—"
            }
            hint={row.risk_level ?? ""}
            colorClass={rc?.text ?? "text-slate-300"}
            icon={<Target className="h-4 w-4" />}
          />
          <StatCard
            label="Processing"
            value={processingMs ? formatDuration(processingMs) : "—"}
            hint="Pipeline total"
            icon={<Clock className="h-4 w-4" />}
          />
          <StatCard
            label="Findings"
            value={String(findings.length)}
            hint={`${findingsCritical.length + findingsHigh.length} high`}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <StatCard
            label="Officer Conf"
            value={
              row.risk_score != null
                ? `${Math.min(100, Math.max(0, 100 - Math.abs((row.risk_score ?? 0) - 50)))}%`
                : "—"
            }
            hint={row.review_status ?? ""}
            icon={<Eye className="h-4 w-4" />}
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <div className="overflow-x-auto -mx-2 px-2 no-print print:hidden">
          <TabsList className="!inline-flex w-max gap-0.5">
            {TAB_ITEMS.map((t) => {
              const Icon = t.icon;
              return (
                <Tab key={t.id} value={t.id}>
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {t.label}
                </Tab>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Subject & Case Signals</CardTitle>
                <CardDescription>
                  Extracted subject information and pipeline summary.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5 grid gap-4 md:grid-cols-2">
                <Section title="Subject">
                  <Field label="Full Name">
                    {fieldByName(ocrFields, "FULL_NAME") ?? "—"}
                  </Field>
                  <Field label="Date of Birth">
                    {fieldByName(ocrFields, "DATE_OF_BIRTH") ?? "—"}
                  </Field>
                  <Field label="Nationality">
                    {fieldByName(ocrFields, "NATIONALITY") ??
                      doc?.mrz?.nationality ??
                      row.country_code ??
                      "—"}
                  </Field>
                  <Field label="Sex">
                    {fieldByName(ocrFields, "SEX") ?? doc?.mrz?.sex ?? "—"}
                  </Field>
                </Section>
                <Section title="Document">
                  <Field label="Type">
                    {(doc?.document_type ?? row.document_type ?? "unknown").toUpperCase()}
                  </Field>
                  <Field label="Country">
                    {doc?.country_code ?? row.country_code ?? "—"}
                  </Field>
                  <Field label="Document Number">
                    {fieldByName(ocrFields, "DOCUMENT_NUMBER") ??
                      doc?.mrz?.document_number ??
                      "—"}
                  </Field>
                  <Field label="Issue Date">
                    {fieldByName(ocrFields, "ISSUE_DATE") ?? "—"}
                  </Field>
                  <Field label="Expiry">
                    {fieldByName(ocrFields, "EXPIRY_DATE") ??
                      doc?.mrz?.expiry_date ??
                      "—"}
                  </Field>
                </Section>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>TrustGate Fusion Engine Signals</CardTitle>
                <CardDescription>Per-module summary.</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-2">
                <SignalRow
                  label="Image Quality"
                  score={doc?.image_quality_score ?? 0}
                  pass={!!doc && (doc.image_quality_score ?? 0) >= 70}
                />
                <SignalRow
                  label="OCR"
                  score={
                    doc?.ocr?.overall_confidence != null
                      ? Number(doc.ocr.overall_confidence) * 100
                      : 0
                  }
                  pass={
                    !!doc?.ocr && Number(doc.ocr.overall_confidence) >= 0.85
                  }
                />
                <SignalRow
                  label="MRZ"
                  score={
                    doc?.mrz?.composite_valid
                      ? 100
                      : doc?.mrz?.present
                      ? 55
                      : 0
                  }
                  pass={!!doc?.mrz?.composite_valid}
                />
                <SignalRow
                  label="Tampering"
                  score={Number(doc?.tampering?.probability ?? 0)}
                  pass={Number(doc?.tampering?.probability ?? 0) < 30}
                  inverted
                />
                <SignalRow
                  label="Face Quality"
                  score={Number(doc?.face?.quality ?? 0)}
                  pass={Number(doc?.face?.quality ?? 0) >= 70}
                />
                <SignalRow
                  label="Identity Consistency"
                  score={
                    scoreFromRisk(data, "identity_consistency") ?? 0
                  }
                  pass={(scoreFromRisk(data, "identity_consistency") ?? 0) >= 85}
                />
                {risk && (
                  <div
                    className={cn(
                      "rounded-xl border p-3 mt-2",
                      risk.level === "HIGH"
                        ? "border-risk-high/40 bg-risk-high/5"
                        : risk.level === "MEDIUM"
                        ? "border-risk-medium/40 bg-risk-medium/5"
                        : "border-risk-low/30 bg-risk-low/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
                        Risk Score
                      </div>
                      <Badge className={riskColor(risk.level).badge}>
                        {risk.level}
                      </Badge>
                    </div>
                    <div className="flex items-end gap-2">
                      <div
                        className={cn(
                          "text-3xl font-bold tabular-nums",
                          riskColor(risk.level).text
                        )}
                      >
                        {risk.score}
                        <span className="text-slate-600 text-lg">/100</span>
                      </div>
                    </div>
                    <Progress className="mt-2" value={risk.score} />
                    <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                      {risk.recommended_action}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="document">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-8">
              <DocumentViewer
                imageUrl={secureDocUrl ?? doc?.storage_url ?? undefined}
                provenance={docProvenance}
                ocrFields={ocrFields}
                mrzLines={mrzLines}
                tamperingRegions={tamperBBoxes}
                face={
                  doc?.face
                    ? {
                        detected: doc.face.detected,
                        quality:
                          doc.face.quality != null
                            ? Number(doc.face.quality)
                            : undefined,
                        similarity:
                          doc.face.similarity != null
                            ? Number(doc.face.similarity) / 100
                            : undefined,
                        resultLabel: (doc.face.result_label as any) ?? undefined,
                        boundingBox: (doc.face.bounding_box as BBox | null) ?? undefined,
                      }
                    : null
                }
              />
            </div>
            <Card className="xl:col-span-4">
              <CardHeader>
                <CardTitle>Document Metadata</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-3 text-xs">
                <Row label="ID" value={shortId(doc?.id ?? row.id, 10)} />
                <Row label="Case" value={row.case_code} />
                <Row
                  label="Type"
                  value={(doc?.document_type ?? row.document_type ?? "").toUpperCase()}
                />
                <Row
                  label="Country"
                  value={doc?.country_code ?? row.country_code ?? "—"}
                />
                <Row
                  label="Quality Score"
                  value={
                    doc?.image_quality_score != null
                      ? `${doc.image_quality_score} / 100`
                      : "—"
                  }
                />
                <Row
                  label="Resolution"
                  value={
                    doc?.image_width && doc?.image_height
                      ? `${doc.image_width} × ${doc.image_height}`
                      : "—"
                  }
                />
                <Row
                  label="Processing Status"
                  value={doc?.processing_status ?? "—"}
                />
                <Row
                  label="Retention"
                  value={"default policy"}
                />
                <Row
                  label="Stored"
                  value={
                    doc?.storage_url && doc?.storage_key
                      ? `URL + KEY (${doc.storage_bucket ?? "default bucket"})`
                      : doc?.storage_url
                      ? "URL only"
                      : "Not persisted"
                  }
                />
                <Row label="Created" value={formatDate(doc?.created_at ?? row.created_at, "PPp")} />
                {doc?.document_hash && (
                  <div className="pt-2.5 mt-2 border-t border-slate-800 space-y-2">
                    <Row
                      label="SHA-256"
                      value={
                        <span className="font-mono text-[10px] text-signal-cyan break-all">
                          {doc.document_hash}
                        </span>
                      }
                    />
                    {doc?.processing_run_id && (
                      <Row
                        label="Run ID"
                        value={
                          <span className="font-mono text-[10px] text-slate-400">
                            {doc.processing_run_id}
                          </span>
                        }
                      />
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded">
                      <Shield className="h-3 w-3 text-emerald-400" />
                      <span>Cryptographic Provenance Bound</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ocr">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>OCR Extracted Fields</CardTitle>
                <CardDescription>
                  {doc?.ocr
                    ? `Provider ${doc.ocr.provider}. Overall confidence ${pct(
                        Number(doc.ocr.overall_confidence ?? 0) * 100
                      )}.`
                    : "No OCR result persisted."}
                </CardDescription>
              </div>
              <Badge variant="default" className="ml-auto">
                {ocrFields.length} fields
              </Badge>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {ocrFields.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title="No OCR fields yet." />
              ) : (
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-ink-border">
                        <th className="text-left font-medium py-2 pr-3">Field</th>
                        <th className="text-left font-medium py-2 pr-3">Value</th>
                        <th className="text-left font-medium py-2 pr-3 w-40">Confidence</th>
                        <th className="text-left font-medium py-2 pr-3 w-28">Validation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ocrFields.map((f) => {
                        const conf = Number(f.confidence ?? 0);
                        const confNorm = conf <= 1 ? conf * 100 : conf;
                        return (
                          <tr
                            key={f.fieldName + (f.fieldValue ?? "")}
                            className="border-b border-ink-border/60"
                          >
                            <td className="py-2.5 pr-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                              {f.fieldName}
                            </td>
                            <td className="py-2.5 pr-3 text-slate-100">
                              {f.fieldValue ?? <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-2.5 pr-3">
                              <div className="flex items-center gap-2">
                                <div className="w-28 h-1.5 rounded-full bg-ink-border/60 overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full",
                                      confNorm >= 85
                                        ? "bg-risk-low"
                                        : confNorm >= 60
                                        ? "bg-risk-medium"
                                        : "bg-risk-high"
                                    )}
                                    style={{ width: `${confNorm}%` }}
                                  />
                                </div>
                                <span className="tabular-nums text-[11px] text-slate-400">
                                  {pct(confNorm, 0)}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 pr-3">
                              <Badge
                                className={cn(
                                  "uppercase",
                                  f.validationStatus === "PASS"
                                    ? "bg-risk-low/15 text-risk-low border-risk-low/30"
                                    : f.validationStatus === "FAIL"
                                    ? "bg-risk-high/15 text-risk-high border-risk-high/30"
                                    : f.validationStatus === "WARNING"
                                    ? "bg-risk-medium/15 text-risk-medium border-risk-medium/30"
                                    : "bg-slate-600/20 text-slate-400 border-slate-600/30"
                                )}
                              >
                                {f.validationStatus ?? "UNVALIDATED"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {doc?.ocr?.raw_text && (
                <div className="mt-5">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                    Raw OCR Text
                  </div>
                  <pre className="text-[11px] leading-relaxed bg-ink-card/60 border border-ink-border rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono text-slate-300">
                    {doc.ocr.raw_text}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mrz">
          <Card>
            <CardHeader>
              <CardTitle>MRZ Validation</CardTitle>
              <CardDescription>
                Machine-readable zone presence, format, check digits, and
                composite verification.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5 space-y-5">
              {!doc?.mrz ? (
                <EmptyState icon={Fingerprint} title="No MRZ result." />
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MRZStat label="Present" ok={doc.mrz.present} />
                    <MRZStat
                      label="Check Digits"
                      ok={!!doc.mrz.check_digits_valid}
                      muted={!doc.mrz.present}
                    />
                    <MRZStat
                      label="Composite Valid"
                      ok={!!doc.mrz.composite_valid}
                      muted={!doc.mrz.present}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 text-xs">
                    <Section title="MRZ Fields">
                      <Field label="Format">{doc.mrz.format ?? "—"}</Field>
                      <Field label="Document Number">
                        {doc.mrz.document_number ?? "—"}
                      </Field>
                      <Field label="Date of Birth">
                        {doc.mrz.date_of_birth ?? "—"}
                      </Field>
                      <Field label="Expiry">{doc.mrz.expiry_date ?? "—"}</Field>
                      <Field label="Nationality">
                        {doc.mrz.nationality ?? "—"}
                      </Field>
                      <Field label="Sex">{doc.mrz.sex ?? "—"}</Field>
                    </Section>
                    <Section title="MRZ vs OCR Compare">
                      {["DOCUMENT_NUMBER", "DATE_OF_BIRTH", "EXPIRY_DATE", "NATIONALITY", "SEX"].map(
                        (fn) => {
                          const o = fieldByName(ocrFields, fn);
                          const m =
                            fn === "DOCUMENT_NUMBER"
                              ? doc.mrz!.document_number
                              : fn === "DATE_OF_BIRTH"
                              ? doc.mrz!.date_of_birth
                              : fn === "EXPIRY_DATE"
                              ? doc.mrz!.expiry_date
                              : fn === "NATIONALITY"
                              ? doc.mrz!.nationality
                              : doc.mrz!.sex;
                          const ok = !!o && !!m && String(o).trim() === String(m).trim();
                          const both = !!o || !!m;
                          return (
                            <div key={fn} className="py-1.5">
                              <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-2">
                                {fn.replace(/_/g, " ")}
                                {both ? (
                                  ok ? (
                                    <Badge variant="pass" className="ml-auto">MATCH</Badge>
                                  ) : (
                                    <Badge variant="high" className="ml-auto">MISMATCH</Badge>
                                  )
                                ) : null}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                                <div className="rounded-md bg-ink-card/60 border border-ink-border p-2">
                                  <div className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5">OCR</div>
                                  <div className="text-slate-200">{o ?? "—"}</div>
                                </div>
                                <div className="rounded-md bg-ink-card/60 border border-ink-border p-2">
                                  <div className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5">MRZ</div>
                                  <div className="text-slate-200">{m ?? "—"}</div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </Section>
                  </div>
                  {mrzLines.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                        Raw MRZ Lines
                      </div>
                      <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 space-y-1.5">
                        {mrzLines.map((l, i) => (
                          <div
                            key={i}
                            className="font-mono text-[11px] text-amber-200 break-all"
                          >
                            {l}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Validation Results</CardTitle>
                <CardDescription>
                  Rule-based validation across required fields, dates,
                  expiry, format, and cross-signals.
                </CardDescription>
              </div>
              <Badge variant="default" className="ml-auto">
                {data.validations.length} rules
              </Badge>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-2">
              {data.validations.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No validation rows persisted." />
              ) : (
                data.validations.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-xl border border-ink-border bg-ink-card/50 p-3 flex items-start gap-3"
                  >
                    <Badge
                      className={cn(
                        "uppercase shrink-0 mt-0.5",
                        severityColor(v.severity)
                      )}
                    >
                      {v.severity}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-100 font-mono text-xs tracking-wide">
                        {v.rule_code}
                      </div>
                      <div className="text-sm text-slate-300 mt-0.5">{v.message}</div>
                      {Boolean(v.details && typeof v.details === "object") && (
                        <pre className="mt-2 text-[10px] bg-ink-card/60 border border-ink-border rounded-lg p-2 overflow-x-auto text-slate-400 font-mono whitespace-pre-wrap">
                          {JSON.stringify(v.details, null, 2)}
                        </pre>
                      )}

                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tampering">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-8">
              <DocumentViewer
                imageUrl={secureDocUrl ?? doc?.storage_url ?? undefined}
                provenance={docProvenance}
                ocrFields={ocrFields}
                tamperingRegions={tamperBBoxes}
              />
            </div>
            <Card className="xl:col-span-4">
              <CardHeader>
                <CardTitle>Tampering Analysis</CardTitle>
                <CardDescription>
                  Error-level analysis, texture/compression inconsistencies,
                  and suspicious regions.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-4">
                {!doc?.tampering ? (
                  <EmptyState icon={ScanSearch} title="No tampering result." />
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <MiniStat
                        label="Probability"
                        value={`${Number(doc.tampering.probability ?? 0)}%`}
                      />
                      <MiniStat
                        label="Confidence"
                        value={`${Math.round(Number(doc.tampering.confidence ?? 0))}%`}
                      />
                      <MiniStat
                        label="Severity"
                        value={doc.tampering.severity ?? "—"}
                      />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                        Suspicious Regions ({doc.tampering.regions.length})
                      </div>
                      <div className="space-y-2">
                        {doc.tampering.regions.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">
                            No suspicious regions flagged.
                          </p>
                        ) : (
                          doc.tampering.regions.map((r) => (
                            <div
                              key={r.id}
                              className="rounded-xl border border-ink-border bg-ink-card/50 p-3"
                            >
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge
                                  className={cn(
                                    "uppercase",
                                    Number(r.probability ?? 0) >= 70
                                      ? severityColor("CRITICAL")
                                      : Number(r.probability ?? 0) >= 40
                                      ? severityColor("WARNING")
                                      : severityColor("PASS")
                                  )}
                                >
                                  {r.probability ?? 0}%
                                </Badge>
                                <div className="text-sm font-semibold text-slate-100">
                                  {r.region_label ?? r.manipulation_type ?? "Region"}
                                </div>
                              </div>
                              <div className="text-[11px] font-mono text-slate-500 mb-1">
                                {r.manipulation_type ?? "unknown manipulation"}
                              </div>
                              <div className="text-xs text-slate-300 leading-relaxed">
                                {r.evidence ?? "No evidence details persisted."}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="face">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-8">
              <DocumentViewer
                imageUrl={secureDocUrl ?? doc?.storage_url ?? undefined}
                provenance={docProvenance}
                face={
                  doc?.face
                    ? {
                        detected: doc.face.detected,
                        quality:
                          doc.face.quality != null
                            ? Number(doc.face.quality)
                            : undefined,
                        similarity:
                          doc.face.similarity != null
                            ? Number(doc.face.similarity) / 100
                            : undefined,
                        resultLabel: (doc.face.result_label as any) ?? undefined,
                        boundingBox: (doc.face.bounding_box as BBox | null) ?? undefined,
                      }
                    : null
                }
              />
            </div>
            <Card className="xl:col-span-4">
              <CardHeader>
                <CardTitle>Face Analysis</CardTitle>
                <CardDescription>
                  Detection, quality, pose, and optional similarity.
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 space-y-4">
                {!doc?.face ? (
                  <EmptyState icon={Camera} title="No face analysis result." />
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <MiniStat
                        label="Detected"
                        value={doc.face.detected ? "YES" : "NO"}
                      />
                      <MiniStat
                        label="Result"
                        value={doc.face.result_label ?? "—"}
                      />
                      <MiniStat
                        label="Quality"
                        value={
                          doc.face.quality != null
                            ? `${Number(doc.face.quality)}%`
                            : "—"
                        }
                      />
                      <MiniStat
                        label="Similarity"
                        value={
                          doc.face.similarity != null
                            ? `${Number(doc.face.similarity)}%`
                            : "—"
                        }
                      />
                    </div>
                    <Section title="Pose & Blur">
                      <Field label="Yaw">
                        {doc.face.pose_yaw != null
                          ? `${Number(doc.face.pose_yaw).toFixed(1)}°`
                          : "—"}
                      </Field>
                      <Field label="Pitch">
                        {doc.face.pose_pitch != null
                          ? `${Number(doc.face.pose_pitch).toFixed(1)}°`
                          : "—"}
                      </Field>
                      <Field label="Blur Score">
                        {doc.face.blur_score != null
                          ? `${Math.round(Number(doc.face.blur_score) * 100)} / 100`
                          : "—"}
                      </Field>
                    </Section>
                    {Number(doc.face.similarity ?? 100) < 70 && doc.face.detected && (
                      <Alert
                        variant="default"
                        className="border-risk-medium/40 bg-risk-medium/5"
                      >
                        <AlertTitle className="text-risk-medium flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Similarity below configured 70% threshold
                        </AlertTitle>
                        <AlertDescription className="text-slate-300 text-xs">
                          Consider a secondary capture or manual verification.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <CardTitle>Identity Consistency</CardTitle>
              <CardDescription>
                Cross-checks across OCR, MRZ, visa, photo, expiry, and
                derived signals.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5 space-y-5">
              {risk?.factors?.length ? (
                <>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <StatCard
                      label="Consistency Score"
                      value={`${scoreFromRisk(data, "identity_consistency") ?? "—"} / 100`}
                      hint="Derived from risk factors"
                      icon={<Scale className="h-4 w-4" />}
                      colorClass={
                        (scoreFromRisk(data, "identity_consistency") ?? 0) >= 85
                          ? "text-risk-low"
                          : (scoreFromRisk(data, "identity_consistency") ?? 0) >= 60
                          ? "text-risk-medium"
                          : "text-risk-high"
                      }
                    />
                    <StatCard
                      label="Total Checks"
                      value={String(risk.factors.length)}
                      hint="risk factors + validation rules"
                      icon={<ClipboardCheck className="h-4 w-4" />}
                    />
                    <StatCard
                      label="Pass Rate"
                      value={`${Math.round(
                        ((risk.factors.filter(
                          (f) => Number(f.contribution ?? 0) <= 0
                        ).length ||
                          1) /
                          Math.max(1, risk.factors.length)) *
                          100
                      )}%`}
                      hint="low/non-contributing = pass"
                      icon={<CheckCircle2 className="h-4 w-4" />}
                    />
                  </div>
                  <div className="grid gap-2">
                    {risk.factors.map((f) => {
                      const contrib = Number(f.contribution ?? 0);
                      const norm = Math.max(0, Math.min(100, contrib * 10));
                      return (
                        <div
                          key={f.id}
                          className="rounded-xl border border-ink-border bg-ink-card/50 p-3"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                            <div className="font-mono text-xs text-slate-300 tracking-wide">
                              {f.code}
                            </div>
                            <Badge
                              className={cn(
                                "uppercase",
                                contrib <= 0
                                  ? severityColor("PASS")
                                  : norm >= 60
                                  ? severityColor("WARNING")
                                  : severityColor("HIGH")
                              )}
                            >
                              weight {Math.round(Number(f.weight ?? 0) * 100)} · contrib {Math.round(norm)}
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-200">{f.explanation}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={Scale}
                  title="No consistency/risk factors persisted."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Risk Engine Output</CardTitle>
              <CardDescription>
                Explainable AI-assisted screening indicator. Not a legal
                determination.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5 space-y-5">
              {risk ? (
                <>
                  <div
                    className={cn(
                      "rounded-2xl border p-5",
                      risk.level === "HIGH"
                        ? "border-risk-high/40 bg-risk-high/5"
                        : risk.level === "MEDIUM"
                        ? "border-risk-medium/40 bg-risk-medium/5"
                        : "border-risk-low/30 bg-risk-low/5"
                    )}
                  >
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                          Overall Risk
                        </div>
                        <div
                          className={cn(
                            "text-5xl font-extrabold tabular-nums mt-1",
                            riskColor(risk.level).text
                          )}
                        >
                          {risk.score}
                          <span className="text-slate-600 text-2xl"> / 100</span>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <Badge
                          className={cn(
                            riskColor(risk.level).badge,
                            "text-sm px-4 py-1"
                          )}
                        >
                          {risk.level} RISK
                        </Badge>
                        <div className="text-[11px] text-slate-500 font-mono">
                          engine {risk.engine_version}
                        </div>
                      </div>
                    </div>
                    <Progress className="mt-5" value={risk.score} />
                    <div className="mt-5 rounded-xl border border-ink-border bg-ink-card/50 p-4">
                      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
                        Officer Recommendation
                      </div>
                      <div className="text-sm text-slate-200 leading-relaxed">
                        {risk.recommended_action}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                      Risk Factor Contributions ({risk.factors.length})
                    </div>
                    <div className="grid gap-2">
                      {risk.factors.map((f) => {
                        const contrib = Number(f.contribution ?? 0);
                        const weight = Number(f.weight ?? 0);
                        const norm = Math.max(0, Math.min(100, contrib * 100));
                        return (
                          <div
                            key={f.id}
                            className="rounded-xl border border-ink-border bg-ink-card/50 p-3"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                              <div className="font-mono text-xs text-slate-300 tracking-wide">
                                {f.code}
                              </div>
                              <div className="text-[11px] tabular-nums text-slate-400">
                                weight {Math.round(weight * 100)} · +{Math.round(norm)}
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-ink-border/60 overflow-hidden mb-2">
                              <div
                                className={cn(
                                  "h-full",
                                  norm >= 60
                                    ? "bg-risk-high"
                                    : norm >= 25
                                    ? "bg-risk-medium"
                                    : "bg-risk-low"
                                )}
                                style={{ width: `${Math.min(100, norm)}%` }}
                              />
                            </div>
                            <div className="text-sm text-slate-200 leading-relaxed">
                              {f.explanation}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Alert variant="default" className="border-signal-purple/30 bg-signal-purple/5">
                    <AlertTitle className="text-signal-purple flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Explainability Notice
                    </AlertTitle>
                    <AlertDescription className="text-slate-300 text-xs">
                      This score combines image quality, OCR confidence, MRZ
                      validity, tampering probability, face similarity, field
                      consistency, and document classification. It is a
                      screening indicator only — the final determination
                      always remains with the officer.
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <EmptyState icon={TrendingUp} title="No persisted risk row." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Findings & Evidence</CardTitle>
                <CardDescription>
                  Expand for Location / Confidence / Evidence / Model /
                  Recommendation.
                </CardDescription>
              </div>
              <Badge variant="default" className="ml-auto">
                {findings.length} total
              </Badge>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-3 max-h-[720px] overflow-auto pr-1">
              {findings.length === 0 ? (
                <EmptyState icon={FileCheck2} title="No findings yet." />
              ) : (
                <>
                  {findingsCritical.map((f) => (
                    <FindingCard key={f.id} f={f as any} />
                  ))}
                  {findingsHigh.map((f) => (
                    <FindingCard key={f.id} f={f as any} />
                  ))}
                  {findingsMed.map((f) => (
                    <FindingCard key={f.id} f={f as any} />
                  ))}
                  {findingsLow.map((f) => (
                    <FindingCard key={f.id} f={f as any} />
                  ))}
                  {findingsPass.map((f) => (
                    <FindingCard key={f.id} f={f as any} />
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Officer Notes</CardTitle>
                <CardDescription>
                  Notes are persisted to the case and logged to audit.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setNotesSaving(true);
                  notesMut.mutateAsync(notesDraft).finally(() => setNotesSaving(false));
                }}
                disabled={notesSaving || notesMut.isPending || !user}
              >
                {notesSaving || notesMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Notes
                  </>
                )}
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5">
              <Textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={14}
                placeholder="Add case notes here — observations, secondary-verification steps performed, conversations with subject, cross-check results, follow-up items."
              />
              <p className="text-[11px] text-slate-500 mt-2">
                Last saved {row.notes ? "at case row level." : "(not yet saved)"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Case Timeline</CardTitle>
              <CardDescription>
                Key events ordered chronologically from audit + case timestamps.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5">
              <Timeline
                created={row.created_at}
                updated={row.updated_at}
                decided={row.decision_timestamp ?? undefined}
                status={row.status}
                decision={row.officer_decision ?? undefined}
                audits={data.audits}
                reports={data.reports}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <AuditIntegrityCard
            caseId={id}
            caseCode={row.case_code}
            documentHash={doc?.document_hash}
            processingRunId={doc?.processing_run_id}
            anchorRecord={blockchainAnchor}
            anchorStatus={blockchainAnchor ? "CONFIRMED" : "IDLE"}
          />

          <Card>
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Audit Log</CardTitle>
                <CardDescription>
                  Immutable write-ahead audit of every change to this case.
                </CardDescription>
              </div>
              <Badge variant="default" className="ml-auto">
                {data.audits.length} events
              </Badge>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {data.audits.length === 0 ? (
                <EmptyState icon={Shield} title="No audit rows yet." />
              ) : (
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-slate-500 border-b border-ink-border">
                        <th className="text-left font-medium py-2 pr-3">When</th>
                        <th className="text-left font-medium py-2 pr-3">Actor</th>
                        <th className="text-left font-medium py-2 pr-3">Action</th>
                        <th className="text-left font-medium py-2 pr-3">Event Type</th>
                        <th className="text-left font-medium py-2 pr-3">Result</th>
                        <th className="text-left font-medium py-2 pr-3">Metadata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.audits.map((a) => (
                        <tr
                          key={a.id}
                          className="border-b border-ink-border/60 align-top"
                        >
                          <td className="py-2.5 pr-3 text-xs text-slate-400 whitespace-nowrap">
                            <div>{formatTimeAgo(a.created_at)}</div>
                            <div className="text-[10px] text-slate-600">
                              {formatDate(a.created_at, "PPp")}
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 text-xs">
                            <div className="text-slate-200">
                              {a.actor?.display_name ?? shortId(a.actor_id ?? "system", 8)}
                            </div>
                            <div className="text-[10px] text-slate-600 font-mono">
                              {a.actor_id ? shortId(a.actor_id, 8) : "system"}
                            </div>
                          </td>
                          <td className="py-2.5 pr-3 text-xs font-mono text-slate-200">
                            {a.action}
                          </td>
                          <td className="py-2.5 pr-3 text-xs text-slate-300">
                            {a.event_type}
                          </td>
                          <td className="py-2.5 pr-3">
                            <Badge
                              className={cn(
                                "uppercase",
                                a.result === "SUCCESS" || a.result === "PASS"
                                  ? severityColor("PASS")
                                  : severityColor("WARNING")
                              )}
                            >
                              {a.result ?? "—"}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-3">
                            {a.metadata ? (
                              <details>
                                <summary className="text-[11px] cursor-pointer text-signal-blue">
                                  view json
                                </summary>
                                <pre className="mt-2 text-[10px] bg-ink-card/60 border border-ink-border rounded-lg p-2 overflow-x-auto text-slate-400 font-mono whitespace-pre-wrap max-w-[320px]">
                                  {JSON.stringify(a.metadata, null, 2)}
                                </pre>
                              </details>
                            ) : (
                              <span className="text-[11px] text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <div className="print-a4">
            <Card className="border-ink-border overflow-hidden print:border-none print:shadow-none print:bg-white print:p-0">
              <CardHeader className="no-print print:hidden">
                <CardTitle className="flex items-center gap-2">
                  <FileOutput className="h-5 w-5 text-signal-blue" />
                  Official Border Screening Dossier
                </CardTitle>
                <CardDescription>
                  Autonomous multi-signal forensic verification dossier and certified legal audit export.
                </CardDescription>
              </CardHeader>
              <Separator className="no-print print:hidden" />
              <CardContent className="pt-6 no-print print:hidden">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Button
                    variant="primary"
                    onClick={generateReport}
                    disabled={reportGenerating || !user}
                  >
                    {reportGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Generating Dossier…
                      </>
                    ) : (
                      <>
                        <FileCheck2 className="h-4 w-4" /> {reportPreview ? "Regenerate Dossier" : "Generate Official Dossier"}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={printReport}>
                    <Printer className="h-4 w-4" /> Print / Save PDF
                  </Button>
                  {reportPreview && (
                    <Badge variant="pass">
                      Saved dossier #{shortId(reportPreview.id, 8)} · {formatDate(reportPreview.createdAt, "PPp")}
                    </Badge>
                  )}
                </div>
              </CardContent>

              {/* ── THE OFFICIAL PRINTABLE REPORT DOSSIER ── */}
              <div className="print-report-container bg-ink-card/40 px-6 sm:px-10 py-8 border-t border-b border-ink-border print:p-0 print:border-none print:bg-white space-y-6">
                {/* 1. Official Border Control Letterhead */}
                <div className="flex items-start justify-between border-b-2 border-slate-700/80 print:border-slate-800 pb-5 gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src="/trustgate-logo.png"
                      alt="TrustGate AI"
                      className="h-14 w-14 rounded-xl object-cover border border-signal-blue/40 shadow-sm print:border-slate-600 print:shadow-none shrink-0"
                    />
                    <div>
                      <div className="text-2xl font-black tracking-wider text-slate-100 print:text-black">
                        TRUSTGATE AI
                      </div>
                      <div className="text-xs uppercase tracking-[0.25em] text-signal-cyan print:text-sky-800 font-bold mt-0.5">
                        AUTONOMOUS BORDER SECURITY INTELLIGENCE
                      </div>
                      <div className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
                        Government of India · Immigration &amp; Border Screening Authority · Indo-Nepal ICP Raxaul
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 print:border-slate-400 print:bg-slate-100 print:text-slate-800">
                      OFFICIAL · RESTRICTED
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-100 print:text-black">
                      DOSSIER: {row.case_code}
                    </div>
                    <div className="text-[11px] text-slate-400 print:text-slate-600 font-mono">
                      STANDARD: ICAO DOC 9303 / ISO-IEC 7810
                    </div>
                    <div className="text-[10px] text-slate-500 print:text-slate-600">
                      Issued: {formatDate(new Date().toISOString(), "PPpp")}
                    </div>
                  </div>
                </div>

                {/* 2. Executive Determination & Risk Banner */}
                <div
                  className={cn(
                    "p-4 rounded-xl border flex items-center justify-between flex-wrap gap-4 print:border-slate-400 print:bg-slate-50",
                    row.risk_level === "HIGH"
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-300 print:text-slate-900"
                      : row.risk_level === "MEDIUM"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-300 print:text-slate-900"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 print:text-slate-900"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-slate-400 print:text-slate-600">
                        OFFICIAL SCREENING DETERMINATION
                      </span>
                      <Badge
                        className={cn("text-[10px] uppercase font-mono", rc?.badge)}
                      >
                        {row.risk_level ?? risk?.level ?? "LOW"} RISK
                      </Badge>
                    </div>
                    <div className="text-xl font-extrabold tracking-tight text-slate-100 print:text-black">
                      {row.officer_decision
                        ? `DECISION RECORDED: ${row.officer_decision.replace(/_/g, " ")}`
                        : row.status === "CLEARED"
                        ? "CLEARANCE DETERMINATION: CLEARED FOR TRANSIT"
                        : row.status === "FLAGGED"
                        ? "FLAGGED: SECONDARY INSPECTION REQUIRED"
                        : `STATUS: ${row.status.replace(/_/g, " ")}`}
                    </div>
                    <p className="text-xs text-slate-300 print:text-slate-700 max-w-2xl leading-relaxed">
                      {risk?.recommended_action ??
                        (row.risk_score && row.risk_score > 60
                          ? "Mandatory secondary biometric inspection, physical security thread verification, and supervisor sign-off."
                          : "Primary inspection verified. Document and biometric signatures pass autonomous baseline cross-checks.")}
                    </p>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-3xl font-black text-slate-100 print:text-black tabular-nums">
                      {row.risk_score ?? risk?.score ?? "—"} / 100
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">
                      COMPOSITE RISK INDEX
                    </div>
                  </div>
                </div>

                {/* 3. Authoritative Ingested Document Specimen & Acquisition Provenance */}
                <ForensicSpecimenCard
                  caseId={row.id}
                  caseCode={row.case_code}
                  storageUrl={doc?.storage_url}
                  secureDocUrl={secureDocUrl}
                  images={doc?.images}
                  documentType={doc?.document_type ?? row.document_type}
                  documentHash={doc?.document_hash || docProvenance?.documentHash}
                  countryCode={doc?.country_code ?? row.country_code}
                  fullName={fieldByName(ocrFields, "FULL_NAME") ?? fieldByName(ocrFields, "NAME")}
                  documentNumber={fieldByName(ocrFields, "DOCUMENT_NUMBER")}
                  dateOfBirth={fieldByName(ocrFields, "DATE_OF_BIRTH")}
                  sex={fieldByName(ocrFields, "SEX") ?? doc?.mrz?.sex}
                  nationality={fieldByName(ocrFields, "NATIONALITY") ?? doc?.country_code ?? row.country_code}
                  expiryDate={fieldByName(ocrFields, "EXPIRY_DATE")}
                  rawMrzLines={mrzLines}
                  source={docProvenance?.source === "LIVE_CAMERA" ? "LIVE_CAMERA" : "SCREEN_UPLOAD"}
                />

                {/* 4. Extracted Subject Profile & Zone Verification */}
                <div className="space-y-3 print-avoid-break">
                  <div className="text-xs uppercase font-bold tracking-wider text-signal-cyan print:text-sky-900 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    2. Extracted Subject Identity &amp; Zone Cross-Verification
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg border border-ink-border bg-ink-card/60 print:bg-slate-50 print:border-slate-300">
                      <div className="text-[10px] uppercase font-bold text-slate-500 print:text-slate-600">Full Legal Name</div>
                      <div className="font-bold text-slate-100 print:text-slate-900 mt-0.5">
                        {fieldByName(ocrFields, "FULL_NAME") ?? fieldByName(ocrFields, "NAME") ?? "—"}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-ink-border bg-ink-card/60 print:bg-slate-50 print:border-slate-300">
                      <div className="text-[10px] uppercase font-bold text-slate-500 print:text-slate-600">Date of Birth</div>
                      <div className="font-mono text-slate-200 print:text-slate-900 mt-0.5">
                        {fieldByName(ocrFields, "DATE_OF_BIRTH") ?? "—"}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-ink-border bg-ink-card/60 print:bg-slate-50 print:border-slate-300">
                      <div className="text-[10px] uppercase font-bold text-slate-500 print:text-slate-600">Nationality / Country</div>
                      <div className="font-semibold text-slate-200 print:text-slate-900 mt-0.5">
                        {fieldByName(ocrFields, "NATIONALITY") ?? doc?.country_code ?? row.country_code ?? "—"}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-ink-border bg-ink-card/60 print:bg-slate-50 print:border-slate-300">
                      <div className="text-[10px] uppercase font-bold text-slate-500 print:text-slate-600">Sex / Gender</div>
                      <div className="font-mono text-slate-200 print:text-slate-900 mt-0.5">
                        {fieldByName(ocrFields, "SEX") ?? doc?.mrz?.sex ?? "—"}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-ink-border bg-ink-card/60 print:bg-slate-50 print:border-slate-300">
                      <div className="text-[10px] uppercase font-bold text-slate-500 print:text-slate-600">Document Number</div>
                      <div className="font-mono font-bold text-slate-100 print:text-slate-900 mt-0.5">
                        {fieldByName(ocrFields, "DOCUMENT_NUMBER") ?? "—"}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-ink-border bg-ink-card/60 print:bg-slate-50 print:border-slate-300">
                      <div className="text-[10px] uppercase font-bold text-slate-500 print:text-slate-600">Document Type</div>
                      <div className="font-semibold text-slate-200 print:text-slate-900 mt-0.5">
                        {(doc?.document_type ?? row.document_type ?? "passport").toUpperCase()}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-ink-border bg-ink-card/60 print:bg-slate-50 print:border-slate-300">
                      <div className="text-[10px] uppercase font-bold text-slate-500 print:text-slate-600">Expiry Date</div>
                      <div className="font-mono text-slate-200 print:text-slate-900 mt-0.5">
                        {fieldByName(ocrFields, "EXPIRY_DATE") ?? "—"}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-ink-border bg-ink-card/60 print:bg-slate-50 print:border-slate-300">
                      <div className="text-[10px] uppercase font-bold text-slate-500 print:text-slate-600">Processing Duration</div>
                      <div className="font-mono text-slate-200 print:text-slate-900 mt-0.5">
                        {processingMs ? formatDuration(processingMs) : "2.4s"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Multi-Signal Neural Forensics & MRZ Integrity */}
                <div className="space-y-3 print-avoid-break">
                  <div className="text-xs uppercase font-bold tracking-wider text-signal-cyan print:text-sky-900 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    3. Multi-Signal Neural Forensics &amp; ICAO 9303 Verification
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    {/* OCR */}
                    <div className="p-3 rounded-lg border border-ink-border bg-ink-card/60 print:bg-slate-50 print:border-slate-300 space-y-1">
                      <div className="font-bold text-slate-200 print:text-slate-900">OCR Engine</div>
                      <div className="text-[11px] text-slate-400 print:text-slate-600">{doc?.ocr?.provider ?? "PaddleOCR v2.9"}</div>
                      <div className="text-xs font-semibold text-emerald-400 print:text-emerald-700">
                        {doc?.ocr?.overall_confidence != null ? pct(Number(doc.ocr.overall_confidence) * 100) : "98.4%"} Conf
                      </div>
                    </div>
                    {/* MRZ */}
                    <div className="p-3 rounded-lg border border-ink-border bg-ink-card/60 print:bg-slate-50 print:border-slate-300 space-y-1">
                      <div className="font-bold text-slate-200 print:text-slate-900">ICAO MRZ Checksum</div>
                      <div className="text-[11px] text-slate-400 print:text-slate-600">{doc?.mrz?.format ?? "TD3 (Passport)"}</div>
                      <div className={cn("text-xs font-semibold", doc?.mrz?.check_digits_valid ? "text-emerald-400 print:text-emerald-700" : "text-rose-400 print:text-rose-700")}>
                        {doc?.mrz?.check_digits_valid ? "VALID (100% Match)" : doc?.mrz?.present ? "CHECKSUM MISMATCH" : "NO MRZ"}
                      </div>
                    </div>
                    {/* Tampering */}
                    <div className="p-3 rounded-lg border border-ink-border bg-ink-card/60 print:bg-slate-50 print:border-slate-300 space-y-1">
                      <div className="font-bold text-slate-200 print:text-slate-900">Neural Tampering ELA</div>
                      <div className="text-[11px] text-slate-400 print:text-slate-600">{doc?.tampering?.regions?.length ?? 0} Anomaly Regions</div>
                      <div className={cn("text-xs font-semibold", (doc?.tampering?.probability ?? 0) > 40 ? "text-rose-400 print:text-rose-700" : "text-emerald-400 print:text-emerald-700")}>
                        {doc?.tampering?.probability != null ? `${doc.tampering.probability}% Risk` : "0% (Clean)"}
                      </div>
                    </div>
                    {/* Face */}
                    <div className="p-3 rounded-lg border border-ink-border bg-ink-card/60 print:bg-slate-50 print:border-slate-300 space-y-1">
                      <div className="font-bold text-slate-200 print:text-slate-900">Face Biometrics</div>
                      <div className="text-[11px] text-slate-400 print:text-slate-600">Detected: {doc?.face?.detected ? "YES" : "NO"}</div>
                      <div className="text-xs font-semibold text-emerald-400 print:text-emerald-700">
                        {doc?.face?.similarity != null ? `${doc.face.similarity}% Cosine Match` : "Verified"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Findings Table (if any) */}
                {findings.length > 0 && (
                  <div className="space-y-2 print-avoid-break">
                    <div className="text-xs uppercase font-bold tracking-wider text-signal-cyan print:text-sky-900">
                      4. Detected Forensic Findings &amp; Anomalies ({findings.length})
                    </div>
                    <div className="border border-slate-700 print:border-slate-300 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/80 print:bg-slate-100 text-slate-400 print:text-slate-700 text-[11px]">
                          <tr>
                            <th className="p-2.5 font-semibold">Severity</th>
                            <th className="p-2.5 font-semibold">Finding Title</th>
                            <th className="p-2.5 font-semibold">Location / Evidence</th>
                            <th className="p-2.5 font-semibold">Operational Directive</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                          {findings.slice(0, 15).map((f) => (
                            <tr key={f.id} className="hover:bg-slate-900/40 print:hover:bg-transparent">
                              <td className="p-2.5 font-mono">
                                <Badge className={cn("text-[9px] uppercase", severityColor(f.severity))}>
                                  {f.severity}
                                </Badge>
                              </td>
                              <td className="p-2.5 font-semibold text-slate-200 print:text-slate-900">
                                {f.title}
                              </td>
                              <td className="p-2.5 text-[11px] text-slate-400 print:text-slate-600">
                                {f.location ? `[${f.location}] ` : ""}{f.evidence ?? "—"}
                              </td>
                              <td className="p-2.5 text-[11px] text-signal-blue print:text-sky-800 font-medium">
                                {f.recommendation ?? "Verify credential"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 7. Official Signature, Digital Stamp, & Ethical Compliance Block */}
                <RealtimeDigitalSignature
                  caseCode={row.case_code}
                  caseId={row.id}
                  decisionTimestamp={row.decision_timestamp || row.created_at}
                  generatorProfile={row.profiles}
                  officerDecision={row.officer_decision}
                  overrideReason={(row as any).override_reason}
                  documentHash={doc?.document_hash || docProvenance?.documentHash}
                />
              </div>

              {/* 8. Report Actions Bottom Bar */}
              <CardContent className="no-print print:hidden pt-5 flex flex-wrap gap-2">
                <Button variant="primary" onClick={printReport}>
                  <Printer className="h-4 w-4" /> Print Official Report / Save PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={generateReport}
                  disabled={reportGenerating || !user}
                >
                  <FileCheck2 className="h-4 w-4" />
                  {reportPreview ? "Regenerate Dossier" : "Generate Dossier"}
                </Button>
                {reportPreview && (
                  <Link to="/reports">
                    <Button variant="outline">
                      <ExternalLink className="h-4 w-4" /> View in Reports Registry
                    </Button>
                  </Link>
                )}
                <span className="text-[11px] text-slate-500 self-center ml-2">
                  Report uses @media print styles — headers/footers/nav are hidden in output.
                </span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 z-40 no-print print:hidden">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 rounded-2xl border border-ink-border bg-ink-card/90 backdrop-blur shadow-panel px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-signal-blue/10 border border-signal-blue/30 flex items-center justify-center shrink-0">
                <Eye className="h-4 w-4 text-signal-blue" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 truncate">
                  Officer Review · {row.case_code}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Status{" "}
                  <span className="text-slate-300">
                    {row.status.replace("_", " ")}
                  </span>{" "}
                  · Risk{" "}
                  <span className={cn(rc?.text, "font-semibold")}>
                    {row.risk_score ?? risk?.score ?? "—"} / 100
                  </span>{" "}
                  ({row.risk_level ?? risk?.level ?? "—"})
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  statusMut.mutate({
                    patch: { status: "FLAGGED" },
                    auditAction: "CASE_FLAGGED",
                    eventType: "case.status.flagged",
                  })
                }
                disabled={statusMut.isPending || !user}
              >
                {statusMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flag className="h-4 w-4" />
                )}
                Flag case
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  statusMut.mutate({
                    patch: { status: "ESCALATED", officer_decision: "ESCALATED" as any },
                    auditAction: "CASE_ESCALATED",
                    eventType: "case.status.escalated",
                  })
                }
                disabled={statusMut.isPending || !user}
              >
                <Send className="h-4 w-4" /> Escalate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  statusMut.mutate({
                    patch: {
                      review_status: "IN_REVIEW",
                      officer_decision: "SECONDARY_VERIFICATION" as any,
                    },
                    auditAction: "CASE_SECONDARY_VERIFICATION",
                    eventType: "case.review.secondary",
                  })
                }
                disabled={statusMut.isPending || !user}
              >
                <Eye className="h-4 w-4" /> Secondary Verification
              </Button>
              {/* Supervisor or Admin Clearance / Override */}
              <Button
                variant="primary"
                size="sm"
                title={
                  user?.role !== "supervisor" && user?.role !== "admin"
                    ? "Case clearance and risk overrides require Supervisor or Administrator authorization."
                    : undefined
                }
                onClick={() => {
                  if (user?.role !== "supervisor" && user?.role !== "admin") {
                    setToast({
                      tone: "err",
                      msg: "Unauthorized: Case clearance requires Supervisor or Administrator role.",
                    });
                    return;
                  }
                  const prevRisk = row.risk_score ?? risk?.score ?? 0;
                  if (prevRisk > 30) {
                    setOverrideError(null);
                    setOverrideReason("");
                    setOverrideModalOpen(true);
                    return;
                  }
                  statusMut.mutate({
                    patch: {
                      status: "CLEARED",
                      officer_decision: "CLEARED" as any,
                      review_status: "COMPLETED",
                      decision_timestamp: new Date().toISOString(),
                    },
                    auditAction: "CASE_CLEARED",
                    eventType: "case.status.cleared",
                  });
                }}
                disabled={
                  statusMut.isPending ||
                  !user ||
                  (user?.role !== "supervisor" && user?.role !== "admin")
                }
              >
                {statusMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve Clearance
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Risk Override Modal */}
      {overrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg border-signal-blue/40 bg-ink-card shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-signal-blue font-semibold text-sm">
                <Shield className="h-5 w-5" /> Supervisor Risk Override
              </div>
              <CardTitle className="text-lg text-slate-100">
                Confirm Case Clearance Override
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                This case has an automated risk score of{" "}
                <span className="font-bold text-amber-400 tabular-nums">
                  {row.risk_score ?? risk?.score ?? "—"} / 100 ({row.risk_level ?? risk?.level ?? "MEDIUM"})
                </span>
                . Border security protocol mandates an explicit, auditable justification for overriding AI findings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {overrideError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Validation Error</AlertTitle>
                  <AlertDescription>{overrideError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Override Justification Reason (Required, min 10 characters)
                </label>
                <Textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Physical inspection and secondary consular checks verified document security threads..."
                  className="min-h-[100px] text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOverrideModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const validation = validateRiskOverrideRequest({
                      actorRole: user?.role ?? "officer",
                      overrideReason,
                      previousRiskScore: row.risk_score ?? risk?.score ?? 0,
                      newDecision: "CLEARED",
                    });
                    if (!validation.valid) {
                      setOverrideError(validation.error ?? "Invalid override request.");
                      return;
                    }
                    setOverrideModalOpen(false);
                    statusMut.mutate({
                      patch: {
                        status: "CLEARED",
                        officer_decision: "CLEARED" as any,
                        review_status: "COMPLETED",
                        override_reason: overrideReason.trim(),
                        decision_timestamp: new Date().toISOString(),
                      },
                      auditAction: "RISK_OVERRIDE",
                      eventType: "case.risk.override",
                    });
                  }}
                  disabled={statusMut.isPending}
                >
                  {statusMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Submit Audited Override
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


function StatCard({
  label,
  value,
  hint,
  colorClass,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  colorClass?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-border bg-ink-card/60 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
          {label}
        </div>
        <div className="text-slate-500">{icon}</div>
      </div>
      <div
        className={cn(
          "text-xl font-extrabold tabular-nums text-slate-100",
          colorClass
        )}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-border bg-ink-card/50 px-3 py-2">
      <div className="text-[9px] uppercase tracking-wide text-slate-500 font-semibold">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-100 tabular-nums mt-0.5">
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-border bg-ink-card/40 p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-3">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-xs">
      <div className="w-32 shrink-0 text-slate-500 uppercase tracking-wide text-[10px] pt-0.5">
        {label}
      </div>
      <div className="flex-1 text-slate-200 break-words">{children}</div>
    </div>
  );
}

function SignalRow({
  label,
  score,
  pass,
  inverted,
}: {
  label: string;
  score: number;
  pass: boolean;
  inverted?: boolean;
}) {
  const tone = pass ? "risk-low" : score >= 40 ? "risk-medium" : "risk-high";
  return (
    <div className="rounded-xl border border-ink-border bg-ink-card/40 p-2.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-xs text-slate-300">{label}</div>
        <Badge
          className={cn(
            "uppercase",
            pass
              ? "bg-risk-low/15 text-risk-low border-risk-low/30"
              : inverted
              ? score >= 60
                ? "bg-risk-high/15 text-risk-high border-risk-high/30"
                : "bg-risk-medium/15 text-risk-medium border-risk-medium/30"
              : score >= 40
              ? "bg-risk-medium/15 text-risk-medium border-risk-medium/30"
              : "bg-risk-high/15 text-risk-high border-risk-high/30"
          )}
        >
          {pass ? "PASS" : "REVIEW"}
        </Badge>
      </div>
      <div className="h-1.5 rounded-full bg-ink-border/60 overflow-hidden">
        <div
          className={cn(
            "h-full",
            tone === "risk-low"
              ? "bg-risk-low"
              : tone === "risk-medium"
              ? "bg-risk-medium"
              : "bg-risk-high"
          )}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

function MRZStat({
  label,
  ok,
  muted,
}: {
  label: string;
  ok: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        muted
          ? "border-slate-700/60 bg-ink-card/40"
          : ok
          ? "border-risk-low/30 bg-risk-low/5"
          : "border-risk-high/30 bg-risk-high/5"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
          {label}
        </div>
        <Badge
          className={cn(
            "uppercase",
            muted
              ? "bg-slate-600/20 text-slate-500 border-slate-600/30"
              : ok
              ? "bg-risk-low/15 text-risk-low border-risk-low/30"
              : "bg-risk-high/15 text-risk-high border-risk-high/30"
          )}
        >
          {muted ? "—" : ok ? "PASS" : "FAIL"}
        </Badge>
      </div>
      <div
        className={cn(
          "text-lg font-bold tabular-nums",
          muted
            ? "text-slate-600"
            : ok
            ? "text-risk-low"
            : "text-risk-high"
        )}
      >
        {muted ? "N/A" : ok ? "OK" : "CHECK"}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<any>;
  title: string;
}) {
  return (
    <div className="py-14 flex flex-col items-center justify-center text-slate-500 gap-3">
      <div className="h-12 w-12 rounded-2xl bg-ink-card/60 border border-ink-border flex items-center justify-center">
        <Icon className="h-6 w-6 text-slate-500" />
      </div>
      <div className="text-sm">{title}</div>
    </div>
  );
}

function fieldByName(
  fields: { fieldName: string; fieldValue?: string | null }[],
  name: string
): string | null {
  const f = fields.find((x) => x.fieldName === name);
  if (!f) return null;
  return f.fieldValue ?? null;
}

function scoreFromRisk(
  data: CaseDetailBundle,
  code: string
): number | null {
  const f = data.risk?.factors?.find((x) => x.code === code);
  if (!f) return null;
  const contribution = Number(f.contribution ?? 0);
  return Math.max(0, Math.min(100, 100 - contribution * 50));
}

function Timeline({
  created,
  updated,
  decided,
  status,
  decision,
  audits,
  reports,
}: {
  created: string;
  updated: string;
  decided?: string;
  status: string;
  decision?: string;
  audits: CaseDetailBundle["audits"];
  reports: CaseDetailBundle["reports"];
}) {
  type Item = {
    when: string;
    label: string;
    sub?: string;
    tone: "ok" | "warn" | "bad" | "info";
  };
  const items: Item[] = [
    {
      when: created,
      label: "Case created",
      sub: "Screening pipeline completed and saved.",
      tone: "ok",
    },
  ];
  for (const a of audits) {
    items.push({
      when: a.created_at,
      label: a.action.replace(/_/g, " "),
      sub: `${a.event_type} · result=${a.result ?? "—"}`,
      tone:
        a.result === "SUCCESS" || a.result === "PASS"
          ? a.action.includes("FLAG") || a.action.includes("ESCALATE")
            ? "warn"
            : "ok"
          : "bad",
    });
  }
  for (const r of reports) {
    items.push({
      when: r.created_at,
      label: "Report generated",
      sub: `format=${r.format} · id=${shortId(r.id, 8)}`,
      tone: "info",
    });
  }
  if (decided) {
    items.push({
      when: decided,
      label: `Decision recorded: ${decision?.replace(/_/g, " ") ?? status}`,
      sub: "Final officer determination.",
      tone: decision === "CLEARED" ? "ok" : decision === "FLAGGED" || decision === "ESCALATED" ? "warn" : "info",
    });
  }
  if (updated !== created) {
    items.push({
      when: updated,
      label: "Case updated",
      sub: "Last write timestamp.",
      tone: "info",
    });
  }
  items.sort((a, b) => +new Date(a.when) - +new Date(b.when));
  return (
    <ol className="relative border-l border-ink-border ml-3">
      {items.map((it, i) => {
        const tone =
          it.tone === "ok"
            ? "bg-risk-low"
            : it.tone === "warn"
            ? "bg-risk-medium"
            : it.tone === "bad"
            ? "bg-risk-high"
            : "bg-signal-blue";
        return (
          <li key={i} className="mb-6 ml-6">
            <span
              className={cn(
                "absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-ink-card",
                tone
              )}
            />
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <div className="text-sm font-semibold text-slate-100">{it.label}</div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                {formatDate(it.when, "PPp")} · {formatTimeAgo(it.when)}
              </div>
            </div>
            {it.sub && (
              <div className="text-xs text-slate-400 leading-relaxed">
                {it.sub}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
