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
  Sun,
  Moon,
  Menu,
  X,
  FileCheck,
  Cpu,
  Binary,
  Check,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { OperationalVideoPlayer } from "@/components/landing/OperationalVideoPlayer";

/* ─── Feature Card Component ────────────────────────────── */
interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  description: string;
  tag?: string;
}

function FeatureCard({ icon: Icon, iconClass, title, description, tag }: FeatureCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card/60 p-6 hover:border-signal-blue/40 hover:bg-slate-50/80 dark:hover:bg-ink-raised/60 shadow-xs dark:shadow-none transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105", iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        {tag && (
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
            {tag}
          </span>
        )}
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-signal-blue transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

/* ─── Stat Metric Card Component ────────────────────────── */
function StatMetricCard({ value, label, subtext }: { value: string; label: string; subtext?: string }) {
  return (
    <div className="relative overflow-hidden text-center p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card/60 shadow-xs dark:shadow-none transition-all hover:border-signal-blue/30">
      <div className="text-3xl sm:text-4xl font-extrabold text-gradient-signal tabular-nums tracking-tight">
        {value}
      </div>
      <div className="text-xs text-slate-800 dark:text-slate-200 font-bold uppercase tracking-wider mt-2">
        {label}
      </div>
      {subtext && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          {subtext}
        </div>
      )}
    </div>
  );
}

/* ─── Interactive Pipeline Stages ───────────────────────── */
const PIPELINE_STAGES = [
  { num: 1, name: "Image Quality Analysis", code: "01-quality", desc: "Assesses blur, resolution, glare, shadows, and perspective skew before inference." },
  { num: 2, name: "Document Type Detection", code: "02-detect", desc: "Identifies document class (Passport, National ID, Aadhaar, Visa) and geometry." },
  { num: 3, name: "OCR & Field Extraction", code: "03-ocr", desc: "Dual-engine PaddleOCR & Tesseract extracts structured identity fields with confidence scoring." },
  { num: 4, name: "MRZ Analysis & Validation", code: "04-mrz", desc: "Parses TD1/TD2/TD3 zones with ISO/ICAO 9303 checksum calculation." },
  { num: 5, name: "Cross-Field Rule Validation", code: "05-rules", desc: "Validates consistency between visual zone text, MRZ metadata, and issuing country rules." },
  { num: 6, name: "Tampering Detection (ELA)", code: "06-forensics", desc: "Error Level Analysis & JPEG artifact inspection to detect photo swapping and text manipulation." },
  { num: 7, name: "Face Analysis & Similarity", code: "07-face", desc: "128-D spatial gradient biometric comparison with calibrated ICAO 9303 cosine distance." },
  { num: 8, name: "Identity Consistency Engine", code: "08-identity", desc: "Cross-correlates biometric, textual, and layout parameters for synthesized veracity." },
  { num: 9, name: "Explainable Risk Scoring", code: "09-risk", desc: "TrustFusion multi-signal synthesis producing composite 0–100 index with reasoning." },
];

/* ─── Main Institutional Landing Page ───────────────────── */
export function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activeStage, setActiveStage] = React.useState(1);

  // Close mobile menu on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-ink text-slate-900 dark:text-slate-100 overflow-x-hidden selection:bg-signal-blue/20 selection:text-signal-blue relative">
      {/* Skip to main content — keyboard accessibility */}
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-signal-blue focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>
      {/* Soft Ambient Illumination (Eliminates harsh graph-paper grid lines, adds institutional depth) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-signal-blue/[0.04] via-sky-400/[0.02] to-transparent dark:from-signal-blue/[0.08] dark:via-transparent rounded-full blur-3xl" />
        <div className="absolute top-[800px] -right-48 w-[650px] h-[450px] bg-slate-100/60 dark:bg-signal-purple/5 rounded-full blur-3xl" />
        <div className="absolute top-[1800px] -left-48 w-[600px] h-[400px] bg-sky-50/40 dark:bg-signal-blue/5 rounded-full blur-3xl" />
      </div>

      {/* ── Top Navigation Bar ── */}
      <nav
        aria-label="Main Navigation"
        className="sticky top-0 z-50 border-b border-slate-200 dark:border-ink-border bg-white/95 dark:bg-ink/90 backdrop-blur-md transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Mark */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded-lg p-1"
          >
            <img
              src="/trustgate-logo.png"
              alt="TrustGate AI Logo"
              className="h-9 w-9 rounded-xl object-cover shadow-xs border border-signal-blue/40 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold tracking-[0.18em] text-slate-900 dark:text-white text-sm leading-tight group-hover:text-signal-blue transition-colors">
                TRUSTGATE
              </span>
              <span className="text-[10px] tracking-[0.22em] text-signal-cyan font-mono font-semibold leading-none">
                AI BORDER
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#demo-video"
              className="hover:text-slate-900 dark:hover:text-white transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded flex items-center gap-1.5 text-signal-blue dark:text-signal-cyan font-semibold"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-signal-blue animate-pulse" />
              Live Demo
            </a>
            <a
              href="#features"
              className="hover:text-slate-900 dark:hover:text-white transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded"
            >
              Product
            </a>
            <a
              href="#how-it-works"
              className="hover:text-slate-900 dark:hover:text-white transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded"
            >
              Workflow
            </a>
            <a
              href="#architecture"
              className="hover:text-slate-900 dark:hover:text-white transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded"
            >
              Architecture
            </a>
            <a
              href="#governance"
              className="hover:text-slate-900 dark:hover:text-white transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded"
            >
              Security &amp; Governance
            </a>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card/60 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-ink-raised transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-signal-blue" />
              )}
            </button>

            {isAuthenticated ? (
              <>
                <Link to="/dashboard">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/screening">
                  <Button variant="primary" size="sm" className="font-semibold shadow-xs">
                    Open Screening Console <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="primary" size="sm" className="font-semibold shadow-xs">
                    Open Screening Console <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card flex items-center justify-center text-slate-700 dark:text-slate-300"
              aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-signal-blue" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-9 w-9 rounded-lg border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            className="sm:hidden border-b border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card px-6 py-5 shadow-lg animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex flex-col gap-4 text-base font-medium text-slate-800 dark:text-slate-200">
              <a
                href="#demo-video"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-signal-blue transition-colors flex items-center gap-2 font-semibold text-signal-blue dark:text-signal-cyan"
              >
                <span className="h-2 w-2 rounded-full bg-signal-blue animate-pulse" />
                Live Demo Video
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-signal-blue transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-signal-blue transition-colors"
              >
                How It Works
              </a>
              <a
                href="#architecture"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-signal-blue transition-colors"
              >
                Architecture
              </a>
              <a
                href="#specifications"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-signal-blue transition-colors"
              >
                Specifications
              </a>
              <a
                href="#governance"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-signal-blue transition-colors"
              >
                Governance
              </a>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
                {isAuthenticated ? (
                  <>
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-center">
                        Dashboard
                      </Button>
                    </Link>
                    <Link to="/screening" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="primary" className="w-full justify-center">
                        Launch Screening <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-center">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="primary" className="w-full justify-center">
                        Get Started <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero Section ── */}
      <section id="landing-main" className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-12 sm:pb-16" aria-label="Hero">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Headline & Action */}
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-signal-blue/40 bg-signal-blue/10 px-3.5 py-1 text-xs font-semibold text-signal-blue mb-5 shadow-xs">
              <Shield className="h-3.5 w-3.5 text-signal-blue" />
              <span>AI-POWERED IDENTITY &amp; DOCUMENT SECURITY PLATFORM</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.12]">
              See Beyond <br />
              <span className="text-gradient-signal">the Document.</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              TrustGate AI assists authorized reviewers by analyzing document fields, detecting inconsistencies,
              identifying potential manipulation, and synthesizing available identity evidence into an
              explainable assessment — so human officers make better-informed decisions, faster.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
              <Link to={isAuthenticated ? "/screening" : "/login"}>
                <Button variant="primary" size="lg" className="shadow-glow font-semibold h-12 px-6">
                  <ScanLine className="h-5 w-5 mr-1" />
                  Open Screening Console
                </Button>
              </Link>

              <a href="#how-it-works">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-signal-blue/40 hover:border-signal-blue bg-signal-blue/5 hover:bg-signal-blue/10 text-signal-blue dark:text-signal-cyan h-12 px-5 shadow-xs font-semibold flex items-center gap-2"
                >
                  Explore the Verification Workflow
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </a>
            </div>

            {/* Human Oversight Statement */}
            <div className="mt-5 flex items-center justify-center lg:justify-start">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-risk-low bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-risk-low flex-shrink-0" />
                <span>AI assists reviewers — does not independently establish identity or make final decisions</span>
              </span>
            </div>
          </div>

          {/* Right Column: Screening Pipeline Illustrative Preview */}
          <div className="lg:col-span-5 w-full">
            <div className="relative rounded-2xl border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card p-5 sm:p-6 shadow-panel">
              {/* Terminal / Specimen Header */}
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="font-mono text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                    SCREENING PIPELINE
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 italic">
                  Illustrative example
                </span>
              </div>

              {/* Live Operational Video Quick-Banner Link */}
              <a
                href="#demo-video"
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-signal-blue/10 hover:bg-signal-blue/15 border border-signal-blue/30 text-xs font-mono text-signal-blue dark:text-signal-cyan transition-all mb-4 group/videolink"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-signal-blue animate-pulse" />
                  <span className="font-semibold">WATCH LIVE SCREENING VIDEO</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 group-hover/videolink:text-signal-blue">
                  <ArrowRight className="h-3.5 w-3.5 group-hover/videolink:translate-x-0.5 transition-transform" />
                </div>
              </a>

              {/* Specimen Case Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-4 p-3 rounded-xl bg-slate-50 dark:bg-ink-raised/60 border border-slate-200/80 dark:border-slate-800/80 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">DOCUMENT TYPE</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">TD3 PASSPORT</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">EXAMPLE CASE</span>
                  <span className="font-semibold text-signal-blue">DEMO SPECIMEN</span>
                </div>
              </div>

              {/* Pipeline Stage Overview */}
              <div className="space-y-2.5 mb-5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-ink-card/40">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-risk-low flex-shrink-0" />
                    <span>Visual OCR Extraction</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 italic">high confidence</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-ink-card/40">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-risk-low flex-shrink-0" />
                    <span>MRZ Checksum Validation</span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">PASS (TD3)</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-ink-card/40">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-risk-low flex-shrink-0" />
                    <span>ELA Tampering Forensics</span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">NO ANOMALY</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-ink-card/40">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-risk-low flex-shrink-0" />
                    <span>Biometric Face Comparison</span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">MATCH</span>
                </div>
              </div>

              {/* Composite TrustGate Fusion Score Bar */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">
                    COMPOSITE RISK INDEX
                  </div>
                  <div className="text-xl font-bold text-emerald-700 dark:text-risk-low font-mono">
                    LOW RISK <span className="text-xs font-normal text-slate-500">(example)</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">PROVENANCE</span>
                  <span className="text-[11px] font-mono text-signal-blue font-semibold">SHA-256 HASH</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Platform Architecture Metrics ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          <StatMetricCard
            value="9"
            label="TrustFusion Pipeline Stages"
            subtext="Image quality → explainable risk"
          />
          <StatMetricCard
            value="32"
            label="Database Tables"
            subtext="PostgreSQL with RLS & Audit Ledger"
          />
          <StatMetricCard
            value="4"
            label="RBAC Roles"
            subtext="Officer, Supervisor, Admin, Analyst"
          />
          <StatMetricCard
            value="Local"
            label="AI Inference"
            subtext="No external API dependencies required"
          />
        </div>
      </section>

      {/* ── Section: Live Operational Video Briefing (Dynamic & Automatic Showcase) ── */}
      <section id="demo-video" className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 pt-2 scroll-mt-20">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider font-mono text-signal-blue bg-signal-blue/10 border border-signal-blue/30 mb-3 shadow-xs">
            <Radio className="h-3.5 w-3.5 text-signal-cyan animate-pulse" />
            <span>OPERATIONAL SYSTEM DEMONSTRATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            See TrustGate AI in Active Operation
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-3 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            Full-length demonstration of multi-spectral document forensics, automated MRZ validation,
            error level tampering detection, and 128-D biometric face verification recorded in real time.
          </p>
        </div>

        {/* High-Tech Operational Video Player */}
        <OperationalVideoPlayer />
      </section>

      {/* ── Section: Problem vs Solution (Exact Points Preserved) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Problem Card */}
          <div className="rounded-2xl border border-rose-200 dark:border-risk-high/30 bg-rose-50/60 dark:bg-risk-high/5 p-7 sm:p-8 shadow-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 mb-4">
              <AlertTriangle className="h-3.5 w-3.5" />
              The Problem
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Fake identities slip through manual screening
            </h2>
            <ul className="space-y-3.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {[
                "High-volume border checkpoints under time pressure",
                "Human fatigue leads to missed document anomalies",
                "Sophisticated forgeries require pixel-level analysis",
                "MRZ tampering invisible to the naked eye",
                "Face swaps and photo replacements go undetected",
                "No explainable AI trail for officer decision support",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solution Card */}
          <div className="rounded-2xl border border-emerald-200 dark:border-risk-low/30 bg-emerald-50/60 dark:bg-risk-low/5 p-7 sm:p-8 shadow-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 mb-4">
              <CheckCircle2 className="h-3.5 w-3.5" />
              The Solution
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              TrustGate AI — 9-stage intelligent screening
            </h2>
            <ul className="space-y-3.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {[
                "Automated image quality, OCR, and MRZ analysis",
                "Pixel-level tampering detection with heatmap overlays",
                "Face similarity scoring with explainable evidence",
                "Cross-field identity consistency engine",
                "Explainable risk scoring with per-finding drill-down",
                "Full audit trail with human-in-the-loop officer review",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Section: Features / Capabilities ── */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-3 border-signal-blue/40 text-signal-blue bg-signal-blue/10">
            Platform Capabilities
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Intelligence Behind Every Verification
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-3 max-w-2xl mx-auto text-base">
            A full-stack identity forensics platform. Each capability listed below is implemented and operational — not planned.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            icon={Eye}
            iconClass="bg-signal-blue/15 text-signal-blue"
            tag="Inference"
            title="OCR & Structured Extraction"
            description="Tesseract.js extracts structured identity fields from the document visual zone with per-field confidence scoring."
          />
          <FeatureCard
            icon={Fingerprint}
            iconClass="bg-signal-cyan/15 text-signal-cyan"
            tag="Standard"
            title="MRZ & Document Rule Validation"
            description="Machine-readable zone parsing with ICAO 9303 check-digit verification and VIZ/MRZ cross-field consistency checking."
          />
          <FeatureCard
            icon={AlertTriangle}
            iconClass="bg-rose-500/15 text-rose-600 dark:text-risk-high"
            tag="Forensics"
            title="Document Tampering Analysis"
            description="Error Level Analysis detects photo replacement, text alteration, and JPEG compression inconsistencies in the document image."
          />
          <FeatureCard
            icon={Activity}
            iconClass="bg-purple-500/15 text-purple-600 dark:text-purple-400"
            tag="Biometrics"
            title="Face Comparison"
            description="128-D spatial gradient biometric comparison between document portrait and live capture when both valid inputs are present."
          />
          <FeatureCard
            icon={BrainCircuit}
            iconClass="bg-amber-500/15 text-amber-600 dark:text-risk-medium"
            tag="TrustFusion"
            title="Explainable Evidence Fusion"
            description="Multi-signal risk engine combining image quality, OCR, MRZ, tampering, and face evidence into a scored assessment with human-readable reasoning."
          />
          <FeatureCard
            icon={ShieldCheck}
            iconClass="bg-emerald-500/15 text-emerald-700 dark:text-risk-low"
            tag="Governance"
            title="Human Review & Audit History"
            description="Officers review all evidence before decisions. All screening actions are logged in an immutable audit trail. Final authority stays with authorized personnel."
          />
          <FeatureCard
            icon={Database}
            iconClass="bg-slate-500/15 text-slate-700 dark:text-slate-300"
            tag="Database"
            title="Production Backend"
            description="InsForge Postgres with 32-table schema, row-level security, RBAC (4 roles), immutable audit logs, and configurable data retention policies."
          />
          <FeatureCard
            icon={Lock}
            iconClass="bg-signal-blue/15 text-signal-blue"
            tag="Security"
            title="Security Controls"
            description="HTTPS transport, JWT authentication, parameterized queries, RLS enforcement, MIME validation, PII minimization, and INSERT-only audit ledger."
          />
          <FeatureCard
            icon={Globe}
            iconClass="bg-signal-cyan/15 text-signal-cyan"
            tag="Architecture"
            title="Authorized Identity Record Checks"
            description="Cross-references submitted identity fields against prior case records and a configurable watchlist within the authorized deployment database."
          />
        </div>
      </section>

      {/* ── Section: How It Works / TrustFusion Pipeline (Exact 9 Stages Preserved) ── */}
      <section id="how-it-works" className="relative py-20 bg-slate-50/70 dark:bg-ink-card/25 border-y border-slate-200/80 dark:border-ink-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-3 border-signal-cyan/40 text-signal-cyan bg-signal-cyan/10">
              TrustFusion Risk Engine
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Verification Workflow
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-3 max-w-xl mx-auto text-base">
              A 9-stage sequential pipeline that processes each document from raw image capture to
              explainable risk assessment. All stages below are implemented and operational.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: The 9 Pipeline Steps */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card p-5 sm:p-6 shadow-xs space-y-2">
              {PIPELINE_STAGES.map((stg) => {
                const isSelected = activeStage === stg.num;
                return (
                  <button
                    key={stg.num}
                    type="button"
                    onClick={() => setActiveStage(stg.num)}
                    aria-pressed={isSelected}
                    aria-label={`View stage ${stg.num}: ${stg.name}`}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-signal-blue bg-signal-blue/10 dark:bg-signal-blue/15 text-slate-900 dark:text-white"
                        : "border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-ink-raised/60 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold font-mono",
                          isSelected
                            ? "bg-signal-blue text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        0{stg.num}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{stg.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{stg.code}</div>
                      </div>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 transition-transform", isSelected ? "text-signal-blue translate-x-1" : "text-slate-400")} />
                  </button>
                );
              })}
            </div>

            {/* Right: Stage Inspector & 3 Realistic Example Findings */}
            <div className="lg:col-span-6 space-y-4">
              {/* Active Stage Inspector Box */}
              <div className="rounded-2xl border border-signal-blue/30 bg-sky-50/50 dark:bg-signal-blue/5 p-5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-signal-blue uppercase mb-2">
                  <Cpu className="h-4 w-4" />
                  <span>Stage 0{activeStage} Specification</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {PIPELINE_STAGES[activeStage - 1].name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {PIPELINE_STAGES[activeStage - 1].desc}
                </p>
              </div>

              {/* Example 1: HIGH RISK (Exact points preserved) */}
              <div className="rounded-2xl border border-rose-200 dark:border-risk-high/30 bg-rose-50/70 dark:bg-risk-high/5 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                    Example Finding — HIGH RISK
                  </div>
                  <Badge variant="high">CRITICAL</Badge>
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">
                  MRZ Check Digit Mismatch
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
                  Document Number OCR: <span className="text-sky-700 dark:text-signal-cyan font-bold bg-sky-100/70 dark:bg-sky-950/50 px-1.5 py-0.5 rounded">A12345678</span> ·
                  MRZ: <span className="text-rose-700 dark:text-rose-400 font-bold bg-rose-100/70 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">A12345679</span>
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-rose-200/60 dark:border-rose-900/40 text-[11px] text-slate-500 dark:text-slate-400">
                  Severity: CRITICAL · Model: rule-validator-v1 · Recommendation: Request secondary manual verification
                </div>
              </div>

              {/* Example 2: TAMPERING (Illustrative) */}
              <div className="rounded-2xl border border-amber-200 dark:border-risk-medium/30 bg-amber-50/70 dark:bg-risk-medium/5 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Example Finding — TAMPERING
                  </div>
                  <Badge variant="medium">WARNING</Badge>
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">
                  Photo Replacement Suspected
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Texture inconsistency in PHOTO region. JPEG compression grid differs from surrounding document area. ELA anomaly detected.
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Region: PHOTO · Model: ela-tamper-v1 · Status: REVIEW REQUIRED
                </div>
              </div>

              {/* Example 3: PASS (Illustrative) */}
              <div className="rounded-2xl border border-emerald-200 dark:border-risk-low/30 bg-emerald-50/70 dark:bg-risk-low/5 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    Example Finding — PASS
                  </div>
                  <Badge variant="pass">PASSED</Badge>
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">
                  Genuine Document — Low Risk
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  All validation rules passed. MRZ composite valid. Biometric comparison: MATCH. No tampering indicators detected. Proceed with clearance workflow.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Architecture (Exact 3 Pillars Preserved) ── */}
      <section id="architecture" className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-3 border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10">
            System Architecture
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Deployed Components
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-3 max-w-xl mx-auto text-base">
            A React frontend with client-side AI inference, backed by a hardened InsForge Postgres platform.
            The diagram below reflects the actual deployed components — no external AI APIs or government database integrations are depicted.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Layers,
              iconClass: "bg-signal-blue/15 text-signal-blue",
              title: "Frontend Client",
              subtitle: "Interactive Screening Interface",
              items: [
                "React 18 + Vite + TypeScript",
                "Tailwind CSS + shadcn/ui",
                "TanStack Query + Zustand",
                "React Hook Form + Zod",
                "Recharts + Framer Motion",
              ],
            },
            {
              icon: Server,
              iconClass: "bg-signal-cyan/15 text-signal-cyan",
              title: "Backend (InsForge)",
              subtitle: "Hardened Data Platform",
              items: [
                "Postgres + 32-table schema",
                "Row-Level Security (RLS)",
                "RBAC: Officer / Supervisor / Admin / Analyst",
                "Immutable audit_logs ledger",
                "InsForge Auth + JWT tokens",
              ],
            },
            {
              icon: BrainCircuit,
              iconClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
              title: "TrustGate Fusion Engine",
              subtitle: "Multi-Engine Forensic AI",
              items: [
                "Tesseract.js & PaddleOCR (local)",
                "ELA tampering detection",
                "Rule-based MRZ validation",
                "128-D Face biometrics (local)",
                "Explainable risk engine",
              ],
            },
          ].map((col) => {
            const Icon = col.icon;
            return (
              <div
                key={col.title}
                className="rounded-2xl border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card p-6 shadow-xs hover:border-signal-blue/40 transition-colors"
              >
                <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center mb-4", col.iconClass)}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">{col.title}</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">{col.subtitle}</div>
                <ul className="space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                      <ChevronRight className="h-3.5 w-3.5 text-signal-blue mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section: Specifications (Exact 10 Items Preserved) ── */}
      <section id="specifications" className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-2xl border border-signal-blue/30 dark:border-signal-blue/20 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/40 dark:from-signal-blue/5 dark:via-ink-card/40 dark:to-signal-blue/5 p-6 sm:p-10 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <Badge variant="default" className="mb-3 border-signal-blue/40 text-signal-blue bg-signal-blue/10">
                Security Architecture &amp; Capabilities
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-4 tracking-tight">
                Engineered for Mission-Critical Border Security
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                TrustGate AI delivers comprehensive real-time document intelligence, tamper detection, MRZ validation,
                face matching, and explainable AI decision support for authorized personnel and border checkpoints.
              </p>
              <div>
                <Link to={isAuthenticated ? "/screening" : "/login"}>
                  <Button variant="primary" size="lg" className="shadow-glow font-semibold">
                    Launch Dashboard
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* The Specifications Badges */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Document Forgery Detection", done: true },
                { label: "MRZ Check Digit Validation", done: true },
                { label: "Photo Replacement Detection", done: true },
                { label: "Face Comparison (valid inputs required)", done: true },
                { label: "Explainable Risk Assessment", done: true },
                { label: "Human-in-the-Loop Review", done: true },
                { label: "Immutable Audit Trail", done: true },
                { label: "RBAC + Row-Level Security", done: true },
                { label: "ePassport / NFC (not implemented)", done: false },
                { label: "Govt DB Integration (not implemented)", done: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200/90 dark:border-ink-border bg-white dark:bg-ink-card/60 p-3 shadow-2xs"
                >
                  {item.done ? (
                    <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-dashed border-slate-400 dark:border-slate-600 flex items-center justify-center flex-shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    </div>
                  )}
                  <span className={item.done ? "font-semibold" : "font-normal text-slate-500 dark:text-slate-500"}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Security & Governance (Institutional Standards) ── */}
      <section id="governance" className="relative py-20 bg-slate-50/70 dark:bg-ink-card/25 border-y border-slate-200/80 dark:border-ink-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-3 border-emerald-500/40 text-emerald-700 dark:text-risk-low bg-emerald-500/10">
              Governance &amp; Evidence Integrity
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Institutional Oversight Standards
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-3 max-w-2xl mx-auto text-base">
              Every analysis run is bound to strict data provenance, cryptographic signatures, and human-in-the-loop escalation gates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-2xl border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card p-6 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-signal-blue/15 text-signal-blue flex items-center justify-center mb-3">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1.5">Human Authority</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                AI provides evidentiary assistance and risk synthesis. Final clearance and rejection remains exclusively with authorized personnel.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card p-6 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-signal-cyan/15 text-signal-cyan flex items-center justify-center mb-3">
                <Binary className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1.5">Evidence Provenance</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Documents and live captures are SHA-256 hashed and bound to their processing run. Each result is traceable to the exact input that produced it.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card p-6 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1.5">Data Minimization</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Biometric feature vectors are not persisted. Raw face crops are held only in ephemeral memory for the duration of the active screening run.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card p-6 shadow-xs">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-risk-low flex items-center justify-center mb-3">
                <FileCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1.5">Honest Unavailability</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Missing inputs and unavailable stages report explicit null or UNAVAILABLE status — not fabricated confidence values. Uncertainty is never hidden.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Ready to Screen CTA ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-4">
          Ready to screen your first document?
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto text-base leading-relaxed">
          Sign in as an authorized officer and open the screening console. The pipeline runs
          locally in-browser — no external AI APIs required.
        </p>
        <div className="flex flex-wrap gap-3.5 justify-center">
          <Link to="/login">
            <Button variant="primary" size="lg" className="shadow-glow font-semibold h-12 px-6">
              Open Screening Console
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link to="/login">
            <Button
              variant="outline"
              size="lg"
              className="border-slate-300 dark:border-ink-border bg-white dark:bg-transparent text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-ink-raised h-12 px-6 shadow-xs font-medium"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 dark:border-ink-border bg-slate-50/70 dark:bg-ink-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
            {/* Brand Info */}
            <div className="md:col-span-5">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src="/trustgate-logo.png"
                  alt="TrustGate AI"
                  className="h-8 w-8 rounded-lg object-cover shadow-xs border border-signal-blue/40"
                />
                <div>
                  <div className="font-extrabold tracking-[0.18em] text-slate-900 dark:text-white text-xs">
                    TRUSTGATE AI
                  </div>
                  <div className="text-[10px] text-slate-500 tracking-wide font-mono">
                    AI-Assisted Identity Screening Platform
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed mb-4">
                Institutional-grade document verification and forensic risk analysis designed to augment border screening personnel.
              </p>
              <div className="inline-flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-ink-raised/40 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                <span>AI-ASSISTED SCREENING PLATFORM</span>
              </div>
            </div>

            {/* Quick Links Column 1: Platform */}
            <div className="md:col-span-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
                Platform
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><a href="#demo-video" className="hover:text-signal-blue transition-colors text-signal-blue font-medium flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-signal-blue animate-pulse" />Live Video Briefing</a></li>
                <li><a href="#features" className="hover:text-signal-blue transition-colors">Forensic Capabilities</a></li>
                <li><a href="#how-it-works" className="hover:text-signal-blue transition-colors">TrustFusion Risk Engine</a></li>
                <li><a href="#architecture" className="hover:text-signal-blue transition-colors">Multi-Engine Architecture</a></li>
                <li><a href="#specifications" className="hover:text-signal-blue transition-colors">Specifications Matrix</a></li>
              </ul>
            </div>

            {/* Quick Links Column 2: Governance & Access */}
            <div className="md:col-span-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3">
                Access &amp; Security
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li><Link to="/login" className="hover:text-signal-blue transition-colors">Authorized Personnel Sign In</Link></li>
                <li><Link to="/screening" className="hover:text-signal-blue transition-colors">Live Inspection Console</Link></li>
                <li><Link to="/dashboard" className="hover:text-signal-blue transition-colors">Operational Case Management</Link></li>
                <li><a href="#governance" className="hover:text-signal-blue transition-colors">Human-in-the-Loop Governance</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Disclaimer */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} TRUSTGATE AI. All rights reserved.
            </div>
            <div className="max-w-md text-[11px] leading-relaxed text-slate-500">
              AI-generated screening assistance. Final determination remains with authorized personnel.
              Designed for official border checkpoint decision support.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
