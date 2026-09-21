import * as React from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  ScanLine,
  Eye,
  Fingerprint,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Lock,
  Activity,
  Server,
  Globe,
  Layers,
  ChevronRight,
  Database,
  BrainCircuit,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/* ─── Feature Cards ────────────────────────────────────── */
interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  description: string;
}
function FeatureCard({ icon: Icon, iconClass, title, description }: FeatureCardProps) {
  return (
    <div className="rounded-2xl border border-ink-border bg-ink-card/60 p-6 hover:border-signal-blue/30 hover:bg-ink-raised/60 transition-all">
      <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-4", iconClass)}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-100 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

/* ─── Pipeline Step ────────────────────────────────────── */
function PipelineStep({ num, label, pass }: { num: number; label: string; pass?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border",
          pass
            ? "bg-risk-low/15 text-risk-low border-risk-low/40"
            : "bg-signal-blue/15 text-signal-blue border-signal-blue/40"
        )}
      >
        {num}
      </div>
      <div className="text-sm font-medium text-slate-200">{label}</div>
      {pass !== undefined && (
        <div className="ml-auto">
          {pass ? (
            <CheckCircle2 className="h-4 w-4 text-risk-low" />
          ) : (
            <div className="h-4 w-4 rounded-full border-2 border-signal-blue/50 border-dashed" />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Stat Pill ─────────────────────────────────────────── */
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-6 py-4 rounded-2xl border border-ink-border bg-ink-card/60">
      <div className="text-3xl font-bold text-gradient-signal tabular-nums">{value}</div>
      <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}

/* ─── Main Landing Page ─────────────────────────────────── */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-grid overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 border-b border-ink-border bg-ink/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/trustgate-logo.png"
              alt="TrustGate AI"
              className="h-9 w-9 rounded-xl object-cover shadow-glow flex-shrink-0 border border-signal-blue/40 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold tracking-[0.18em] text-gradient-signal text-sm">
                TRUSTGATE
              </span>
              <span className="text-[10px] tracking-[0.22em] text-signal-cyan font-mono font-semibold leading-none">
                AI BORDER
              </span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-slate-100 transition-colors">Features</a>
            <a href="#pipeline" className="hover:text-slate-100 transition-colors">How It Works</a>
            <a href="#architecture" className="hover:text-slate-100 transition-colors">Architecture</a>
            <a href="#specifications" className="hover:text-slate-100 transition-colors">Specifications</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/login">
              <Button variant="primary" size="sm">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-signal-blue/6 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <Badge variant="default" className="mb-6 border-signal-blue/40 text-signal-blue bg-signal-blue/10 px-4 py-1.5">
            <Shield className="h-3.5 w-3.5 mr-1" />
            AI-Powered Identity &amp; Document Security Platform
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-100 leading-tight">
            See Beyond
            <br />
            <span className="text-gradient-signal">the Document.</span>
          </h1>
          <p className="mt-6 text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            AI-assisted border security screening that detects inconsistencies,
            manipulation, and identity anomalies — before they become security risks.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/login">
              <Button variant="primary" size="lg" className="shadow-glow">
                <ScanLine className="h-5 w-5" />
                Start Screening
              </Button>
            </Link>
            <a href="#pipeline">
              <Button variant="outline" size="lg">
                See How It Works
                <ChevronRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
          <div className="mt-4">
            <Badge variant="default" className="text-xs bg-risk-low/10 border-risk-low/30 text-risk-low">
              <ShieldCheck className="h-3 w-3" /> Human-in-the-loop — AI assists officers, not replaces them
            </Badge>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatPill value="9" label="TrustGate Fusion Engine Stages" />
          <StatPill value="25" label="Database Tables" />
          <StatPill value="3" label="RBAC Roles" />
          <StatPill value="< 5s" label="Avg Processing Time" />
        </div>
      </section>

      {/* ── Problem / Solution ── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-risk-high/20 bg-risk-high/5 p-8">
            <Badge variant="high" className="mb-4">The Problem</Badge>
            <h2 className="text-2xl font-bold text-slate-100 mb-4">
              Fake identities slip through manual screening
            </h2>
            <ul className="space-y-3 text-sm text-slate-300 leading-relaxed">
              {[
                "High-volume border checkpoints under time pressure",
                "Human fatigue leads to missed document anomalies",
                "Sophisticated forgeries require pixel-level analysis",
                "MRZ tampering invisible to the naked eye",
                "Face swaps and photo replacements go undetected",
                "No explainable AI trail for officer decision support",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-risk-high mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-risk-low/20 bg-risk-low/5 p-8">
            <Badge variant="pass" className="mb-4">The Solution</Badge>
            <h2 className="text-2xl font-bold text-slate-100 mb-4">
              TrustGate AI — 9-stage intelligent screening
            </h2>
            <ul className="space-y-3 text-sm text-slate-300 leading-relaxed">
              {[
                "Automated image quality, OCR, and MRZ analysis",
                "Pixel-level tampering detection with heatmap overlays",
                "Face similarity scoring with explainable evidence",
                "Cross-field identity consistency engine",
                "Explainable risk scoring with per-finding drill-down",
                "Full audit trail with human-in-the-loop officer review",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-risk-low mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-4 border-signal-blue/40 text-signal-blue bg-signal-blue/10">
            Capabilities
          </Badge>
          <h2 className="text-3xl font-bold text-slate-100">
            Intelligence Behind Every Verification
          </h2>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto">
            A full-stack identity forensics platform built on open-source AI and a
            production-grade backend.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            icon={Eye}
            iconClass="bg-signal-blue/15 text-signal-blue"
            title="OCR Field Extraction"
            description="PaddleOCR / Tesseract extracts name, DOB, nationality, document number, issue/expiry dates with per-field confidence scores."
          />
          <FeatureCard
            icon={Fingerprint}
            iconClass="bg-signal-cyan/15 text-signal-cyan"
            title="MRZ Validation"
            description="Machine-readable zone parsing with check-digit verification and pixel-level OCR/MRZ cross-field consistency checking."
          />
          <FeatureCard
            icon={AlertTriangle}
            iconClass="bg-risk-high/15 text-risk-high"
            title="Tampering Detection"
            description="ELA-based forensic analysis detects photo replacement, text alterations, JPEG compression inconsistencies, and cloning artifacts."
          />
          <FeatureCard
            icon={Activity}
            iconClass="bg-signal-purple/15 text-signal-purple"
            title="Face Analysis"
            description="Open-source face detection, quality scoring, similarity comparison, and pose estimation — no paid APIs required."
          />
          <FeatureCard
            icon={BrainCircuit}
            iconClass="bg-risk-medium/15 text-risk-medium"
            title="Explainable Risk Scoring"
            description="Multi-signal risk engine combining image quality, OCR, MRZ, tampering, face, and consistency signals into a 0–100 score with human-readable explanations."
          />
          <FeatureCard
            icon={ShieldCheck}
            iconClass="bg-risk-low/15 text-risk-low"
            title="Human-in-the-Loop"
            description="Officers review all evidence before decisions. AI overrides are logged with reasons. Final authority stays with authorized personnel — always."
          />
          <FeatureCard
            icon={Database}
            iconClass="bg-slate-500/15 text-slate-300"
            title="Production Backend"
            description="InsForge Postgres with 25-table schema, row-level security, RBAC, immutable audit logs, and configurable data retention policies."
          />
          <FeatureCard
            icon={Lock}
            iconClass="bg-signal-blue/15 text-signal-blue"
            title="Security First"
            description="HTTPS-only, parameterized queries, JWT auth, RLS enforcement, MIME validation, PII minimization, and INSERT-only audit ledger."
          />
          <FeatureCard
            icon={Globe}
            iconClass="bg-signal-cyan/15 text-signal-cyan"
            title="Edge-Ready Architecture"
            description="Designed for future deployment at border checkpoints with offline OCR/MRZ capability and central analytics synchronization."
          />
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section id="pipeline" className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-4 border-signal-cyan/40 text-signal-cyan bg-signal-cyan/10">
            TRUSTFUSION RISK ENGINE
          </Badge>
          <h2 className="text-3xl font-bold text-slate-100">How It Works</h2>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto">
            A 9-stage sequential pipeline that processes every document from raw image
            to explainable risk decision in under 5 seconds.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="rounded-2xl border border-ink-border bg-ink-card/60 p-6 space-y-3">
            <PipelineStep num={1} label="Image Quality Analysis" pass />
            <div className="w-px h-3 bg-ink-border ml-4" />
            <PipelineStep num={2} label="Document Type Detection" pass />
            <div className="w-px h-3 bg-ink-border ml-4" />
            <PipelineStep num={3} label="OCR & Field Extraction" pass />
            <div className="w-px h-3 bg-ink-border ml-4" />
            <PipelineStep num={4} label="MRZ Analysis & Validation" pass />
            <div className="w-px h-3 bg-ink-border ml-4" />
            <PipelineStep num={5} label="Cross-Field Rule Validation" pass />
            <div className="w-px h-3 bg-ink-border ml-4" />
            <PipelineStep num={6} label="Tampering Detection (ELA)" />
            <div className="w-px h-3 bg-ink-border ml-4" />
            <PipelineStep num={7} label="Face Analysis & Similarity" />
            <div className="w-px h-3 bg-ink-border ml-4" />
            <PipelineStep num={8} label="Identity Consistency Engine" />
            <div className="w-px h-3 bg-ink-border ml-4" />
            <PipelineStep num={9} label="Explainable Risk Scoring" />
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-risk-high/20 bg-risk-high/5 p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-risk-high mb-2">
                Example Finding — HIGH RISK
              </div>
              <div className="font-semibold text-slate-100 mb-1">
                MRZ Check Digit Mismatch
              </div>
              <div className="text-xs text-slate-400 leading-relaxed">
                Document Number OCR: <code className="text-signal-cyan">A12345678</code> ·
                MRZ: <code className="text-risk-high">A12345679</code>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Severity: CRITICAL · Model: rule-validator-v1 ·
                Recommendation: Request secondary manual verification
              </div>
            </div>
            <div className="rounded-2xl border border-risk-medium/20 bg-risk-medium/5 p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-risk-medium mb-2">
                Example Finding — TAMPERING
              </div>
              <div className="font-semibold text-slate-100 mb-1">
                Photo Replacement Suspected
              </div>
              <div className="text-xs text-slate-400 leading-relaxed">
                Texture inconsistency in PHOTO region. JPEG compression grid differs
                from surrounding document area. Probability: 88%.
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Region: PHOTO · Model: ela-tamper-v1 ·
                Confidence: 92%
              </div>
            </div>
            <div className="rounded-2xl border border-risk-low/20 bg-risk-low/5 p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-risk-low mb-2">
                Example Finding — PASS
              </div>
              <div className="font-semibold text-slate-100 mb-1">
                Genuine Document — Score: 8/100
              </div>
              <div className="text-xs text-slate-400 leading-relaxed">
                All 7 validation rules passed. MRZ composite valid. Face similarity 93%.
                No tampering indicators. Proceed with clearance workflow.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture ── */}
      <section id="architecture" className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-4 border-signal-purple/40 text-signal-purple bg-signal-purple/10">
            Architecture
          </Badge>
          <h2 className="text-3xl font-bold text-slate-100">
            Scalable from Prototype to Production
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: Layers,
              iconClass: "bg-signal-blue/15 text-signal-blue",
              title: "Frontend",
              items: ["React 18 + Vite + TypeScript", "Tailwind CSS + shadcn/ui", "TanStack Query + Zustand", "React Hook Form + Zod", "Recharts + Framer Motion"],
            },
            {
              icon: Server,
              iconClass: "bg-signal-cyan/15 text-signal-cyan",
              title: "Backend (InsForge)",
              items: ["Postgres + 25-table schema", "Row-Level Security (RLS)", "RBAC: Officer / Supervisor / Admin", "Immutable audit_logs table", "InsForge Auth + JWT"],
            },
            {
              icon: BrainCircuit,
              iconClass: "bg-signal-purple/15 text-signal-purple",
              title: "TrustGate Fusion Engine",
              items: ["Tesseract.js OCR (local)", "ELA tampering detection", "Rule-based MRZ validation", "Face analysis (local)", "Explainable risk engine"],
            },
          ].map((col) => {
            const Icon = col.icon;
            return (
              <div
                key={col.title}
                className="rounded-2xl border border-ink-border bg-ink-card/60 p-6"
              >
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-4", col.iconClass)}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-100 mb-3">{col.title}</h3>
                <ul className="space-y-2">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-400">
                      <ChevronRight className="h-3.5 w-3.5 text-slate-600 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Enterprise Specifications ── */}
      <section id="specifications" className="max-w-7xl mx-auto px-6 pb-20">
        <div className="rounded-2xl border border-signal-blue/20 bg-signal-blue/5 p-8 md:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <Badge variant="default" className="mb-4 border-signal-blue/40 text-signal-blue bg-signal-blue/10">
                Security Architecture &amp; Capabilities
              </Badge>
              <h2 className="text-3xl font-bold text-slate-100 mb-4">
                Engineered for Mission-Critical Border Security
              </h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                TrustGate AI delivers comprehensive real-time document intelligence, tamper detection, MRZ validation,
                face matching, and explainable AI decision support for authorized personnel and border checkpoints.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/login">
                  <Button variant="primary" size="lg" className="shadow-glow">
                    Launch Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Document Forgery Detection", done: true },
                { label: "MRZ Check Digit Validation", done: true },
                { label: "Photo Replacement Detection", done: true },
                { label: "Face Similarity Scoring", done: true },
                { label: "Explainable Risk Score", done: true },
                { label: "Human-in-the-Loop Review", done: true },
                { label: "Immutable Audit Trail", done: true },
                { label: "RBAC + RLS Security", done: true },
                { label: "ePassport / NFC (future)", done: false },
                { label: "Govt DB Integration (future)", done: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-2.5 text-xs text-slate-300 rounded-lg border border-ink-border/60 bg-ink-card/30 p-3"
                >
                  {item.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-risk-low mt-0.5 flex-shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-slate-600 mt-0.5 flex-shrink-0" />
                  )}
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl font-bold text-slate-100 mb-4">
          Ready to screen your first document?
        </h2>
        <p className="text-slate-400 mb-8">
          Sign in as an officer and run live document &amp; biometric screening in under 60 seconds.
          Full pipeline runs locally on device with zero external dependencies.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/login">
            <Button variant="primary" size="lg" className="shadow-glow">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-ink-border bg-ink-card/40">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/trustgate-logo.png"
                alt="TrustGate AI"
                className="h-8 w-8 rounded-lg object-cover shadow-glow flex-shrink-0 border border-signal-blue/40"
              />
              <div>
                <div className="font-bold tracking-[0.18em] text-gradient-signal text-xs">
                  TRUSTGATE AI
                </div>
                <div className="text-[10px] text-slate-500 tracking-wide">
                  AI-Assisted Security Intelligence Platform
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-5 text-xs text-slate-500">
              <Link to="/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
              <Link to="/login" className="hover:text-slate-300 transition-colors">Get Started</Link>
              <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
              <a href="#architecture" className="hover:text-slate-300 transition-colors">Architecture</a>
              <a href="#specifications" className="hover:text-slate-300 transition-colors">Specifications</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-ink-border/60 text-center text-xs text-slate-600">
            AI-generated screening assistance. Final determination remains with authorized personnel.
            This is a prototype for demonstration purposes.
          </div>
        </div>
      </footer>
    </div>
  );
}
