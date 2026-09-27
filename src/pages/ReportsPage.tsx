import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  FileText,
  Search,
  Printer,
  Download,
  Eye,
  RefreshCw,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ExternalLink,
  X,
  Code2,
  Layers,
} from "lucide-react";
import { listReports, type ReportRow } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { formatDate, riskColor } from "@/lib/utils";
import { RealtimeDigitalSignature } from "@/components/common/RealtimeDigitalSignature";
import { ForensicSpecimenCard } from "@/components/common/ForensicSpecimenCard";

export function ReportsPage() {
  const [search, setSearch] = React.useState("");
  const [selectedReport, setSelectedReport] = React.useState<ReportRow | null>(null);
  const [viewMode, setViewMode] = React.useState<"formal" | "json" | "both">("formal");

  const { data, isLoading, error, refetch, isFetching } = useQuery<ReportRow[]>({
    queryKey: ["reports"],
    queryFn: () => listReports(),
    staleTime: 30_000,
  });

  const reports = data ?? [];

  const filteredReports = reports.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const caseCode = r.cases?.case_code?.toLowerCase() ?? "";
    const docType = r.cases?.document_type?.toLowerCase() ?? "";
    const officer = r.generator?.display_name?.toLowerCase() ?? "";
    return caseCode.includes(s) || docType.includes(s) || officer.includes(s);
  });

  function downloadJson(report: ReportRow) {
    const jsonStr = JSON.stringify(report.payload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trustgate-report-${report.cases?.case_code ?? report.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  function handlePrintJson() {
    setViewMode("json");
    setTimeout(() => {
      window.print();
    }, 150);
  }

  return (
    <>
      <div className={selectedReport ? "space-y-6 no-print print:hidden" : "space-y-6"}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Screening Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Formal, explainable identity screening audit reports and forensic exports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link to="/cases">
            <Button variant="primary" size="sm">
              <Eye className="h-4 w-4" />
              View Cases
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by case code, document type, or generating officer…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports Table / List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-signal-blue" />
                Generated Reports
              </CardTitle>
              <CardDescription>
                {isLoading
                  ? "Loading reports…"
                  : `Showing ${filteredReports.length} formal report${
                      filteredReports.length !== 1 ? "s" : ""
                    }`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {error ? (
            <div className="flex items-center gap-3 px-5 py-10 text-risk-high text-sm">
              <AlertTriangle className="h-5 w-5" />
              {(error as Error).message ?? "Failed to load reports"}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-signal-blue" />
              Loading reports…
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="px-5 py-16 text-center text-slate-500 flex flex-col items-center gap-3">
              <FileText className="h-10 w-10 opacity-30" />
              <div className="text-sm">No screening reports found.</div>
              <p className="text-xs text-slate-500 max-w-sm">
                Open any completed case in Case Management and click "Generate Report" to produce an official forensic dossier.
              </p>
              <Link to="/cases">
                <Button variant="outline" size="sm" className="mt-2">
                  Go to Cases
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 border-b border-ink-border">
                    <th className="px-5 py-3">Case Code</th>
                    <th className="px-5 py-3">Doc Type</th>
                    <th className="px-5 py-3">Risk Assessment</th>
                    <th className="px-5 py-3">Generated By</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-border">
                  {filteredReports.map((report) => {
                    const c = report.cases;
                    return (
                      <tr
                        key={report.id}
                        className="hover:bg-ink-raised/40 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-mono text-xs text-signal-cyan font-medium">
                          {c?.case_code ?? "TG-CASE"}
                        </td>
                        <td className="px-5 py-3.5 capitalize text-slate-300">
                          {c?.document_type ?? "Identity Document"}
                        </td>
                        <td className="px-5 py-3.5">
                          {c?.risk_level ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${riskColor(
                                c.risk_level
                              )}`}
                            >
                              {c.risk_level} ({c.risk_score ?? 0})
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs">
                          {report.generator?.display_name ?? "System Generated"}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                          {formatDate(report.created_at)}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReport(report)}
                            title="Inspect Report"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadJson(report)}
                            title="Export JSON"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Report Modal Viewer */}
      {selectedReport && (() => {
        const repSections = selectedReport.payload?.sections;
        const repDoc = repSections?.documents?.[0] || selectedReport.payload?.document;
        const repOcr = repDoc?.ocr?.fields || [];
        const mrzRaw = repDoc?.mrz?.raw_lines || repDoc?.mrz?.rawLines;
        let mrzNameCandidate: string | null = null;
        if (mrzRaw) {
          try {
            const lines = typeof mrzRaw === "string" ? JSON.parse(mrzRaw) : mrzRaw;
            if (Array.isArray(lines) && lines[0]?.startsWith("P<")) {
              const namePart = lines[0].slice(5).replace(/<+$/, "");
              const parts = namePart.split(/<+/).filter(Boolean);
              if (parts.length >= 2) {
                mrzNameCandidate = `${parts[1].replace(/LK$|K$/, "")} ${parts[0].replace(/LK$|K$/, "")}`.trim();
              }
            }
          } catch {}
        }
        const ocrNameVal =
          repOcr.find((f: any) => f.fieldName === "FULL_NAME" || f.field_name === "FULL_NAME")?.fieldValue ||
          repOcr.find((f: any) => f.fieldName === "NAME" || f.field_name === "NAME")?.fieldValue;
        const fullName =
          (ocrNameVal && !/^(SIGNATURE|BEARER|TITULAIRE|TITULAR)$/i.test(ocrNameVal) ? ocrNameVal : null) ||
          mrzNameCandidate ||
          "HAPPY TRAVELER";

        const rawDocNum =
          repDoc?.mrz?.document_number ||
          repDoc?.mrz?.documentNumber ||
          repOcr.find((f: any) => f.fieldName === "DOCUMENT_NUMBER" || f.field_name === "DOCUMENT_NUMBER")?.fieldValue;
        const docNum =
          (rawDocNum && !/^(SIGNATURE|BEARER|TITULAIRE|TITULAR|PASSPORT)$/i.test(rawDocNum) ? rawDocNum : null) ||
          repDoc?.mrz?.document_number ||
          selectedReport.cases?.case_code;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print-keep print-modal-backdrop">
            <div className="w-full max-w-4xl bg-ink-card border border-ink-border rounded-xl shadow-2xl p-6 my-8 space-y-6 max-h-[90vh] overflow-y-auto print-keep print-modal-container print-report-container">
              {/* Modal Controls Toolbar */}
              <div className="flex items-center justify-between border-b border-ink-border pb-4 flex-wrap gap-3 no-print print:hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="h-5 w-5 text-signal-cyan" />
                  <span className="font-semibold text-slate-200 text-sm">
                    Screening Report Dossier
                  </span>
                  <Badge variant="default" className="text-[10px] font-mono">
                    {selectedReport.cases?.case_code}
                  </Badge>

                  {/* Mode Selector */}
                  <div className="flex items-center bg-ink-raised/60 p-0.5 rounded-lg border border-ink-border text-xs ml-2">
                    <button
                      type="button"
                      onClick={() => setViewMode("formal")}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors flex items-center gap-1 ${
                        viewMode === "formal"
                          ? "bg-signal-blue text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Formal Report
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("json")}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors flex items-center gap-1 ${
                        viewMode === "json"
                          ? "bg-signal-blue text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      JSON Dossier
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("both")}
                      className={`px-2.5 py-1 rounded font-semibold transition-colors flex items-center gap-1 ${
                        viewMode === "both"
                          ? "bg-signal-blue text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Combined
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    title="Print current report view to PDF / Printer"
                  >
                    <Printer className="h-4 w-4 mr-1.5" />
                    Print / PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintJson}
                    title="Format and print complete machine-readable JSON dossier"
                    className="border-signal-cyan/40 hover:bg-signal-cyan/10"
                  >
                    <Code2 className="h-4 w-4 mr-1.5 text-signal-cyan" />
                    Print JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadJson(selectedReport)}
                    title="Export raw JSON file"
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Export
                  </Button>
                  <Link to={`/cases/${selectedReport.case_id}`}>
                    <Button variant="primary" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                      Open Case
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedReport(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Printable Content Body */}
              <div className="space-y-6 text-slate-200">
                {/* 1. Formal Report Presentation (when viewing 'formal' or 'both') */}
                {(viewMode === "formal" || viewMode === "both") && (
                  <div className="space-y-6">
                    {/* Report Header */}
                    <div className="flex items-start justify-between border-b-2 border-signal-blue/40 pb-5 print:border-slate-800">
                      <div className="flex items-center gap-3.5">
                        <img
                          src="/trustgate-logo.png"
                          alt="TrustGate AI"
                          className="h-12 w-12 rounded-lg object-cover border border-signal-blue/40 shadow-sm print:border-slate-600 print:shadow-none flex-shrink-0"
                        />
                        <div>
                          <div className="text-2xl font-bold tracking-wider text-signal-blue print:text-black">
                            TRUSTGATE AI
                          </div>
                          <div className="text-xs uppercase tracking-[0.25em] text-slate-400 print:text-slate-700 font-semibold mt-0.5">
                            Official Identity &amp; Document Screening Report
                          </div>
                          <div className="text-xs text-slate-500 print:text-slate-600 mt-1">
                            Government of India · Immigration &amp; Border Screening Authority · ICP Raxaul
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400 print:text-slate-700 space-y-1">
                        <div className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 print:border-slate-400 print:bg-slate-100 print:text-slate-800">
                          OFFICIAL · RESTRICTED
                        </div>
                        <div>
                          <span className="text-slate-500 print:text-slate-600">Dossier ID:</span>{" "}
                          <span className="font-mono text-slate-300 print:text-slate-900 font-bold">{selectedReport.id.slice(0, 8)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 print:text-slate-600">Case Code:</span>{" "}
                          <span className="font-mono font-bold text-signal-cyan print:text-black">
                            {selectedReport.cases?.case_code}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 print:text-slate-600">Issued:</span>{" "}
                          {formatDate(selectedReport.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Summary Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-ink-raised/50 border border-ink-border print:bg-slate-50 print:border-slate-300">
                        <div className="text-[11px] text-slate-500 print:text-slate-600 uppercase tracking-wider font-semibold">
                          Document Type
                        </div>
                        <div className="text-sm font-semibold capitalize text-slate-200 print:text-slate-900 mt-1">
                          {selectedReport.cases?.document_type ?? "Passport"}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-ink-raised/50 border border-ink-border print:bg-slate-50 print:border-slate-300">
                        <div className="text-[11px] text-slate-500 print:text-slate-600 uppercase tracking-wider font-semibold">
                          Risk Assessment
                        </div>
                        <div className="text-sm font-semibold text-slate-200 print:text-slate-900 mt-1">
                          <span className={riskColor(selectedReport.cases?.risk_level ?? "LOW").text}>
                            {selectedReport.cases?.risk_level ?? "LOW"} (Score:{" "}
                            {selectedReport.cases?.risk_score ?? 0}/100)
                          </span>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-ink-raised/50 border border-ink-border print:bg-slate-50 print:border-slate-300">
                        <div className="text-[11px] text-slate-500 print:text-slate-600 uppercase tracking-wider font-semibold">
                          Review Status
                        </div>
                        <div className="text-sm font-semibold text-slate-200 print:text-slate-900 mt-1">
                          {selectedReport.cases?.status ?? "UNDER_REVIEW"}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-ink-raised/50 border border-ink-border print:bg-slate-50 print:border-slate-300">
                        <div className="text-[11px] text-slate-500 print:text-slate-600 uppercase tracking-wider font-semibold">
                          Screening Officer
                        </div>
                        <div className="text-sm font-semibold text-slate-200 print:text-slate-900 mt-1">
                          {selectedReport.generator?.display_name ?? "Assigned Screener"}
                        </div>
                      </div>
                    </div>

                    {/* Authoritative Document Specimen & Ingestion Image */}
                    <ForensicSpecimenCard
                      caseId={selectedReport.cases?.id || selectedReport.case_id}
                      caseCode={selectedReport.cases?.case_code}
                      storageUrl={repDoc?.storage_url}
                      images={repDoc?.images}
                      documentType={selectedReport.cases?.document_type}
                      documentHash={repDoc?.document_hash}
                      countryCode={selectedReport.cases?.country_code || repDoc?.country_code}
                      fullName={fullName}
                      documentNumber={docNum}
                      dateOfBirth={repDoc?.mrz?.date_of_birth || repDoc?.mrz?.dateOfBirth}
                      nationality={selectedReport.cases?.country_code || repDoc?.country_code}
                      rawMrzLines={repDoc?.mrz?.raw_lines || repDoc?.mrz?.rawLines}
                      source={repDoc?.storage_url?.includes("camera") ? "LIVE_CAMERA" : "SCREEN_UPLOAD"}
                    />

                    {/* Forensic Pipeline Findings Body */}
                    <div className="space-y-4 print-avoid-break">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-signal-cyan print:text-sky-900">
                        Forensic Pipeline Findings &amp; Evidence
                      </h3>
                      <div className="p-4 rounded-lg bg-ink-raised/30 border border-ink-border print:border-slate-300 print:bg-slate-50 text-xs space-y-3">
                        {selectedReport.payload?.findings && Array.isArray(selectedReport.payload.findings) ? (
                          <div className="space-y-2">
                            {selectedReport.payload.findings.map((f: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 pb-2 border-b border-ink-border/50 print:border-slate-200">
                                <span className="font-mono text-signal-blue print:text-sky-800 font-bold">[{f.severity ?? "INFO"}]</span>
                                <span className="font-medium text-slate-200 print:text-slate-900">{f.title ?? f.message}</span>
                                {f.location && (
                                  <span className="text-slate-500 print:text-slate-600">({f.location})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-400 print:text-slate-700 text-xs">
                            No critical security anomalies or tampering flags detected across inspected biometric and optical layers.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mandatory Ethical AI & Human-in-the-Loop Statement */}
                    <div className="p-3.5 rounded-xl border border-signal-blue/30 bg-signal-blue/5 print:border-slate-300 print:bg-slate-50 text-[11px] text-slate-300 print:text-slate-700 leading-relaxed print-avoid-break">
                      <div className="font-bold text-signal-cyan print:text-sky-900 uppercase tracking-wider text-[10px] mb-1">
                        NOTICE TO VERIFYING OFFICIAL &amp; ETHICAL MANDATE:
                      </div>
                      <div>
                        “AI-generated screening assistance. Final clearance and referral determination remains exclusively with authorized human personnel. This screening score is an assistive indicator and does not independently constitute a legal, immigration, or identity determination.”
                      </div>
                    </div>

                    {/* Real-Time Live Database Digital Signatures */}
                    <RealtimeDigitalSignature
                      caseCode={selectedReport.cases?.case_code || "TG-REPORT"}
                      caseId={selectedReport.case_id}
                      decisionTimestamp={selectedReport.created_at}
                      generatorProfile={selectedReport.generator}
                      documentHash={repDoc?.document_hash}
                    />
                  </div>
                )}

                {/* 2. Machine-Readable JSON Dossier Presentation (when viewing 'json' or 'both') */}
                {(viewMode === "json" || viewMode === "both") && (
                  <div className="space-y-4 print-avoid-break">
                    {/* JSON Header Banner */}
                    <div className="flex items-center justify-between border-b border-slate-700 print:border-slate-300 pb-3">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-4 w-4 text-signal-cyan print:text-sky-800" />
                        <div>
                          <div className="text-xs uppercase font-bold tracking-wider text-signal-cyan print:text-sky-900">
                            Machine-Readable JSON Audit Dossier Specification
                          </div>
                          <div className="text-[10px] text-slate-400 print:text-slate-600">
                            ICAO Doc 9303 / MIDV-2020 Standard JSON Schema · Verifiable Export
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 print:text-slate-600">
                        DOSSIER: {selectedReport.cases?.case_code}
                      </span>
                    </div>

                    {/* Formatted JSON Payload Card */}
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 print:text-slate-950 print:bg-white print:border-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed print-json-container shadow-inner">
                      {JSON.stringify(selectedReport.payload, null, 2)}
                    </pre>

                    {/* Digital Signatures on JSON Dossier if in pure JSON mode */}
                    {viewMode === "json" && (
                      <RealtimeDigitalSignature
                        caseCode={selectedReport.cases?.case_code || "TG-REPORT"}
                        caseId={selectedReport.case_id}
                        decisionTimestamp={selectedReport.created_at}
                        generatorProfile={selectedReport.generator}
                        documentHash={repDoc?.document_hash}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
