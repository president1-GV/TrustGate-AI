/**
 * TRUSTGATE AI — AuditIntegrityCard Component
 * AI-Based Fake Identity & Document Screening System
 * 
 * Provides an authoritative, tamper-evident inspection card showing:
 * - Permissioned Blockchain Block Sequence & Transaction ID
 * - Raw Document SHA-256 Digest & Canonical Manifest Digest
 * - 8 AI Model Checkpoints & Provenance Merkle Root
 * - Station Attestation & Cryptographic Digital Signature
 * - One-Click Independent Verification Engine with 4-Point Cryptographic Audit
 */

import * as React from "react";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  RefreshCw,
  Cpu,
  FileCheck,
  Check,
  Eye,
  EyeOff,
  AlertOctagon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { BlockchainAnchorRecord, VerificationResult } from "@/lib/blockchain/types";
import { verifyCaseBlockchainIntegrity } from "@/lib/db";

export interface AuditIntegrityCardProps {
  caseId?: string | null;
  caseCode?: string | null;
  documentHash?: string | null;
  processingRunId?: string | null;
  anchorRecord?: BlockchainAnchorRecord | null;
  anchorStatus?: "IDLE" | "PENDING" | "CONFIRMED" | "ERROR";
  className?: string;
}

export function AuditIntegrityCard({
  caseId,
  caseCode,
  documentHash,
  processingRunId,
  anchorRecord,
  anchorStatus = "IDLE",
  className = "",
}: AuditIntegrityCardProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [showModels, setShowModels] = React.useState<boolean>(false);
  const [isVerifying, setIsVerifying] = React.useState<boolean>(false);
  const [verificationResult, setVerificationResult] = React.useState<VerificationResult | null>(null);
  const [verificationError, setVerificationError] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerify = async () => {
    if (!caseId) return;
    setIsVerifying(true);
    setVerificationError(null);
    try {
      const res = await verifyCaseBlockchainIntegrity(caseId);
      setVerificationResult(res);
    } catch (err: any) {
      setVerificationError(err?.message || "Verification request failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const manifest = anchorRecord?.canonical_manifest;
  const models = manifest?.ai_pipeline.models || [];
  const status = verificationResult?.tamperDetected
    ? "TAMPER_DETECTED"
    : anchorRecord
    ? "CONFIRMED"
    : anchorStatus;

  return (
    <Card className={`border-emerald-500/30 bg-slate-900/90 shadow-xl backdrop-blur-md ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-wide text-slate-100 flex items-center gap-2">
                Evidence Integrity & Blockchain Provenance
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Immutable border evidence anchoring & cryptographic audit trail (Tokenless Consortium Ledger)
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status === "CONFIRMED" && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono text-xs px-2.5 py-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                BLOCK #{anchorRecord?.block_sequence} ANCHORED
              </Badge>
            )}
            {status === "PENDING" && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 font-mono text-xs px-2.5 py-0.5 animate-pulse flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ANCHORING IN FLIGHT
              </Badge>
            )}
            {status === "TAMPER_DETECTED" && (
              <Badge className="bg-rose-500/30 text-rose-300 border-rose-500/50 font-mono text-xs px-2.5 py-0.5 animate-bounce flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                TAMPER VIOLATION DETECTED
              </Badge>
            )}
            {status === "IDLE" && (
              <Badge className="bg-slate-800 text-slate-400 border-slate-700 font-mono text-xs px-2.5 py-0.5">
                STANDBY
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 text-xs font-mono">
        {/* Tamper Violation Alert */}
        {verificationResult?.tamperDetected && (
          <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-rose-400 text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              CRITICAL INTEGRITY VIOLATION DETECTED
            </div>
            <p className="text-xs leading-relaxed text-rose-300/90 font-sans">
              The operational database state does not match the immutable blockchain ledger receipt.
              A field was modified or document substituted post-screening!
            </p>
            <div className="text-[11px] font-mono bg-black/40 p-2 rounded border border-rose-500/30">
              <span className="text-rose-400 font-bold">Tampered Fields:</span>{" "}
              {verificationResult.tamperedFields.join(", ")}
            </div>
          </div>
        )}

        {/* Primary Hashes & IDs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Document Binary Hash */}
          <div className="p-2.5 rounded-md bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
                <FileCheck className="w-3.5 h-3.5 text-teal-400" /> Raw Document SHA-256 Digest
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    documentHash || anchorRecord?.document_hash || "",
                    "docHash"
                  )
                }
                className="hover:text-slate-200 text-slate-500 transition-colors"
                title="Copy hash"
              >
                {copiedKey === "docHash" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-200 font-mono break-all select-all">
              {documentHash || anchorRecord?.document_hash || "Computing SHA-256 buffer digest..."}
            </p>
          </div>

          {/* Canonical Manifest Hash */}
          <div className="p-2.5 rounded-md bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
                <Lock className="w-3.5 h-3.5 text-indigo-400" /> Canonical Manifest Digest (JCS)
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(anchorRecord?.manifest_hash || "", "manifestHash")
                }
                className="hover:text-slate-200 text-slate-500 transition-colors"
                title="Copy manifest hash"
              >
                {copiedKey === "manifestHash" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-200 font-mono break-all select-all">
              {anchorRecord?.manifest_hash || "Pending block confirmation..."}
            </p>
          </div>
        </div>

        {/* Ledger Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-[11px]">
          <div className="p-2 rounded bg-slate-950/40 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">CASE & RUN ID</span>
            <span className="text-slate-200 font-semibold font-mono truncate block" title={caseCode || "N/A"}>
              {caseCode || "TG-CASE"}
            </span>
            <span className="text-[9px] text-slate-500 font-mono truncate block" title={processingRunId || "N/A"}>
              {processingRunId || "RUN-AUTO"}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-950/40 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">LEDGER & BLOCK</span>
            <span className="text-slate-200 font-semibold font-mono">
              {anchorRecord ? `Block #${anchorRecord.block_sequence}` : "Chained Anchor"}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-950/40 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">CHECKPOINT STATION</span>
            <span className="text-slate-200 font-mono truncate block">
              {manifest?.officer_attestation.station_id || "ICP-RAXAUL-01 (SSB Border)"}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-950/40 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px]">TRANSACTION ID</span>
            <span className="text-emerald-400 font-mono truncate block" title={anchorRecord?.transaction_id}>
              {anchorRecord?.transaction_id
                ? `${anchorRecord.transaction_id.substring(0, 16)}...`
                : "Awaiting inclusion..."}
            </span>
          </div>
        </div>

        {/* AI Model Provenance Merkle Root Section */}
        <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold">
              <Cpu className="w-4 h-4 text-purple-400" />
              AI Model Checkpoint Provenance (Merkle Root)
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowModels(!showModels)}
              className="h-6 px-2 text-[11px] text-slate-400 hover:text-slate-200"
            >
              {showModels ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide Models
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 mr-1" /> Inspect 8 Models
                </>
              )}
            </Button>
          </div>

          <div className="text-[11px] text-slate-300 font-mono break-all bg-black/40 p-2 rounded border border-slate-800/60">
            {anchorRecord?.models_provenance_hash ||
              manifest?.ai_pipeline.models_provenance_hash ||
              "Merkle tree root computed over 8 active model weights"}
          </div>

          {/* Collapsible Model Details Table */}
          {showModels && models.length > 0 && (
            <div className="mt-2 space-y-1.5 border-t border-slate-800/80 pt-2 text-[10px]">
              <div className="grid grid-cols-12 text-slate-500 font-semibold pb-1">
                <span className="col-span-3">MODEL</span>
                <span className="col-span-3">VERSION</span>
                <span className="col-span-6">WEIGHTS CHECKPOINT HASH (SHA-256)</span>
              </div>
              {models.map((m) => (
                <div
                  key={m.key}
                  className="grid grid-cols-12 py-1 px-1.5 rounded bg-slate-900/60 border border-slate-800/40 text-slate-300 items-center"
                >
                  <span className="col-span-3 font-semibold text-purple-300">{m.key}</span>
                  <span className="col-span-3 text-slate-400">{m.version}</span>
                  <span className="col-span-6 font-mono text-[9px] text-slate-400 truncate" title={m.weights_hash}>
                    {m.weights_hash}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verification Trigger & Results */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-sans">
            Independent cryptographic verification re-computes manifest hashes from live PostgreSQL tables.
          </div>

          <Button
            size="sm"
            onClick={handleVerify}
            disabled={isVerifying || !caseId}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 flex items-center gap-2 transition-all shadow-md"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying Ledger...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Verify Blockchain Integrity
              </>
            )}
          </Button>
        </div>

        {/* Verification Result Breakdown Drawer */}
        {verificationResult && (
          <div className="mt-3 p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-200">Independent Cryptographic Audit Summary</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  verificationResult.verified
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-rose-950 text-rose-400 border border-rose-800"
                }`}
              >
                {verificationResult.verified ? "100% CRYPTOGRAPHICALLY SOUND" : "INTEGRITY MISMATCH"}
              </span>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {verificationResult.explanation}
            </p>

            {verificationResult.checks.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {verificationResult.checks.map((chk, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[11px] p-1.5 rounded bg-slate-900/80 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-1.5">
                      {chk.status === "PASS" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className="text-slate-200 font-medium">{chk.checkName}</span>
                    </div>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        chk.status === "PASS"
                          ? "text-emerald-300 bg-emerald-950/60"
                          : "text-rose-300 bg-rose-950/60"
                      }`}
                    >
                      {chk.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {verificationError && (
          <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-sans">
            {verificationError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
