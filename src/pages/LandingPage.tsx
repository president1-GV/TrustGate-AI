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
  Play,
  Radio,
  CheckCircle,
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
    <div className="group relative rounded-2xl border border-slate-200/90 dark:border-ink-border bg-white dark:bg-ink-card/70 p-6 hover:border-signal-blue/50 hover:bg-slate-50/90 dark:hover:bg-ink-raised/80 shadow-xs hover:shadow-lg hover:shadow-signal-blue/5 hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-xs", iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        {tag && (
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 group-hover:border-signal-blue/30 transition-colors">
            {tag}
          </span>
        )}
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-signal-blue transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

/* ─── Stat Metric Card Component ────────────────────────── */
function StatMetricCard({
  value,
  label,
  subtext,
  badge,
}: {
  value: string;
  label: string;
  subtext?: string;
  badge?: string;
}) {
  return (
    <div className="group relative overflow-hidden text-center p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-ink-border bg-white dark:bg-ink-card/70 shadow-xs hover:shadow-md hover:border-signal-blue/40 transition-all duration-300 hover:-translate-y-0.5">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-signal-blue/30 to-transparent group-hover:via-signal-blue transition-all" />
      <div className="text-3xl sm:text-4xl font-black text-gradient-signal tabular-nums tracking-tight group-hover:scale-105 transition-transform">
        {value}
      </div>
      <div className="text-xs text-slate-900 dark:text-slate-200 font-bold uppercase tracking-wider mt-2.5">
        {label}
      </div>
      {subtext && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
          {subtext}
        </div>
      )}
      {badge && (
        <div className="mt-2 inline-flex items-center gap-1 text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-signal-blue/10 text-signal-blue dark:text-signal-cyan border border-signal-blue/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {badge}
        </div>
      )}
    </div>
  );
}

/* ─── Interactive Pipeline Stages ───────────────────────── */
const PIPELINE_STAGES = [
  {
    num: 1,
    name: "Image Quality Analysis",
    code: "01-quality",
    desc: "Assesses blur, resolution, glare, shadows, and perspective skew before inference.",
    engine: "Client-side OpenCV & Canvas Sobel Operator",
    runtime: "~45ms",
    input: "Raw Camera / Upload Frame (1080p+)",
    output: "Quality Score, Blur Ratio & Skew Angle",
    status: "LOCAL REALTIME",
  },
  {
    num: 2,
    name: "Document Type Detection",
    code: "02-detect",
    desc: "Identifies document class (Passport, National ID, Aadhaar, Visa) and geometry.",
    engine: "Aspect-Ratio Geometry & Feature Keypoint Matcher",
    runtime: "~35ms",
    input: "Quality-Gated Image Matrix",
    output: "Document Class, ISO Format (TD1/TD2/TD3)",
    status: "HEURISTIC SENSING",
  },
  {
    num: 3,
    name: "OCR & Field Extraction",
    code: "03-ocr",
    desc: "Dual-engine PaddleOCR & Tesseract extracts structured identity fields with confidence scoring.",
    engine: "Tesseract.js WASM + Bounding Box Normalizer",
    runtime: "~180ms",
    input: "Deskewed Document Visual Zone",
    output: "Name, DOB, Doc Number, Expiry, Nationality",
    status: "DUAL OCR ENGINE",
  },
  {
    num: 4,
    name: "MRZ Analysis & Validation",
    code: "04-mrz",
    desc: "Parses TD1/TD2/TD3 zones with ISO/ICAO 9303 checksum calculation.",
    engine: "ICAO 9303 Checksum Validator (Weights 7-3-1)",
    runtime: "~15ms",
    input: "Cropped Machine-Readable Lines",
    output: "Checksum Matrix & Cross-Zone Divergence",
    status: "ISO / ICAO STANDARD",
  },
  {
    num: 5,
    name: "Cross-Field Rule Validation",
    code: "05-rules",
    desc: "Validates consistency between visual zone text, MRZ metadata, and issuing country rules.",
    engine: "Country-Specific Rule Verification Matrices",
    runtime: "~25ms",
    input: "Visual OCR Fields + Parsed MRZ Fields",
    output: "Field-Pair Consistency & Logic Violations",
    status: "INTEGRITY AUDIT",
  },
  {
    num: 6,
    name: "Tampering Detection (ELA)",
    code: "06-forensics",
    desc: "Error Level Analysis & JPEG artifact inspection to detect photo swapping and text manipulation.",
    engine: "JPEG Quantization Error Analysis (ELA 95%)",
    runtime: "~110ms",
    input: "Full Document Image Matrix",
    output: "Pixel Heatmap & Resave Delta Histogram",
    status: "FORENSIC VISION",
  },
  {
    num: 7,
    name: "Face Analysis & Similarity",
    code: "07-face",
    desc: "128-D spatial gradient biometric comparison with calibrated ICAO 9303 cosine distance.",
    engine: "128-D HOG Descriptor + YCbCr Skin Locus Tracker",
    runtime: "~85ms",
    input: "Doc Photo Crop vs Live Officer Web-Cam",
    output: "Cosine Similarity & Confidence Interval",
    status: "BIOMETRIC ENGINE",
  },
  {
    num: 8,
    name: "Identity Consistency Engine",
    code: "08-identity",
    desc: "Cross-correlates biometric, textual, and layout parameters for synthesized veracity.",
    engine: "Multi-Source Corroboration Engine",
    runtime: "~30ms",
    input: "Biometrics + OCR + MRZ + Watchlist Data",
    output: "Identity Verification Confidence State",
    status: "IDENTITY SYNTHESIS",
  },
  {
    num: 9,
    name: "Explainable Risk Scoring",
    code: "09-risk",
    desc: "TrustFusion multi-signal synthesis producing composite 0–100 index with reasoning.",
    engine: "TrustFusion Multi-Signal Weighted Decision Core",
    runtime: "~20ms",
    input: "Aggregated Pipeline Signal Vector",
    output: "0–100 Risk Score, Severity & Reason Codes",
    status: "EXPLAINABLE FUSION",
  },
];

/* ─── Main Institutional Landing Page ───────────────────── */
export function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [activeStage, setActiveStage] = React.useState(1);
  const [previewSpecimen, setPreviewSpecimen] = React.useState<"genuine" | "tampered">("genuine");

  // Close mobile menu on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden selection:bg-blue-100 selection:text-blue-900 relative font-sans">
      {/* ── Top Navigation Bar ── */}
      <nav
        aria-label="Main Navigation"
        className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-colors shadow-2xs"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Mark */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded-lg p-1"
          >
            <div className="relative">
              <img
                src="/trustgate-logo.png"
                alt="TrustGate AI Logo"
                className="h-9 w-9 rounded-xl object-cover shadow-xs border border-signal-blue/40 group-hover:scale-105 transition-transform"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-ink" />
            </div>
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
              <span className="h-2 w-2 rounded-full bg-signal-blue animate-pulse" />
              Live Demo
            </a>
            <a
              href="#features"
              className="hover:text-slate-900 dark:hover:text-white transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-slate-900 dark:hover:text-white transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded"
            >
              How It Works
            </a>
            <a
              href="#architecture"
              className="hover:text-slate-900 dark:hover:text-white transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded"
            >
              Architecture
            </a>
            <a
              href="#specifications"
              className="hover:text-slate-900 dark:hover:text-white transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded"
            >
              Specifications
            </a>
            <a
              href="#governance"
              className="hover:text-slate-900 dark:hover:text-white transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue rounded"
            >
              Governance
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
                    Dashboard
                  </Button>
                </Link>
                <Link to="/screening">
                  <Button variant="primary" size="sm" className="font-semibold shadow-xs">
                    Launch Screening <ArrowRight className="h-4 w-4 ml-1" />
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
                    Get Started <ArrowRight className="h-4 w-4 ml-1" />
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
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-signal-blue" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-9 w-9 rounded-lg border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
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
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-12 sm:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Headline & Action */}
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-signal-blue/40 bg-signal-blue/10 px-3.5 py-1 text-xs font-semibold text-signal-blue mb-5 shadow-xs">
              <Shield className="h-3.5 w-3.5 text-signal-blue" />
              <span>AI-POWERED IDENTITY &amp; DOCUMENT SECURITY PLATFORM</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-[1.12]">
              See Beyond <br />
              <span className="text-gradient-signal">the Document.</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              AI-assisted border security screening that detects inconsistencies,
              manipulation, and identity anomalies — before they become security risks.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
              <Link to={isAuthenticated ? "/screening" : "/login"}>
                <Button variant="primary" size="lg" className="shadow-glow font-bold h-12 px-6 text-sm">
                  <ScanLine className="h-5 w-5 mr-1" />
                  {isAuthenticated ? "Launch Live Screening" : "Start Screening"}
                </Button>
              </Link>

              <a href="#demo-video">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-signal-blue/40 hover:border-signal-blue bg-signal-blue/5 hover:bg-signal-blue/10 text-signal-blue dark:text-signal-cyan h-12 px-5 shadow-xs font-semibold flex items-center gap-2"
                >
                  <Play className="h-4 w-4 fill-current text-signal-blue" />
                  Watch Live Demo
                </Button>
              </a>

              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-slate-300 dark:border-ink-border bg-white dark:bg-transparent text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-ink-raised h-12 px-5 shadow-xs font-medium"
                  >
                    Cases Console
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              ) : (
                <a href="#how-it-works">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-slate-300 dark:border-ink-border bg-white dark:bg-transparent text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-ink-raised h-12 px-5 shadow-xs font-medium"
                  >
                    How It Works
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </a>
              )}
            </div>

            {/* Trust Statement */}
            <div className="mt-5 flex items-center justify-center lg:justify-start">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 rounded-full shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>HUMAN-IN-THE-LOOP — AI ASSISTS OFFICERS, NOT REPLACES THEM</span>
              </span>
            </div>
          </div>

          {/* Right Column: Live Screening Console Demonstration Preview */}
          <div className="lg:col-span-5 w-full">
            <div className="relative rounded-2xl border border-slate-200/90 dark:border-ink-border bg-white/95 dark:bg-ink-card p-5 sm:p-6 shadow-panel backdrop-blur-xl">
              {/* Terminal / Specimen Header */}
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-xs font-bold uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                    SCREENING PIPELINE
                  </span>
                </div>
                <Badge
                  variant={previewSpecimen === "genuine" ? "pass" : "critical"}
                  className="text-[10px] font-mono font-bold"
                >
                  {previewSpecimen === "genuine" ? "VERIFIED GENUINE" : "TAMPERING FLAGGED"}
                </Badge>
              </div>

              {/* Dynamic Interactive Specimen Toggle (Adds live dynamism) */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-3.5">
                <button
                  type="button"
                  onClick={() => setPreviewSpecimen("genuine")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer",
                    previewSpecimen === "genuine"
                      ? "bg-white dark:bg-ink-card text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-500/30 font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  )}
                  title="Simulate genuine passport verification"
                >
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                  <span>GENUINE DEMO</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSpecimen("tampered")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer",
                    previewSpecimen === "tampered"
                      ? "bg-white dark:bg-ink-card text-rose-600 dark:text-rose-400 shadow-xs border border-rose-500/30 font-bold"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  )}
                  title="Simulate fraudulent identity detection"
                >
                  <AlertTriangle className="h-3 w-3 text-rose-500" />
                  <span>ALTERED DEMO</span>
                </button>
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
                  <span>8:08 MIN</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover/videolink:translate-x-0.5 transition-transform" />
                </div>
              </a>

              {/* Specimen Case Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-4 p-3 rounded-xl bg-slate-50 dark:bg-ink-raised/60 border border-slate-200/80 dark:border-slate-800/80 font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">DOCUMENT TYPE</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {previewSpecimen === "genuine" ? "TD3 PASSPORT" : "ALTERED TD3 PASSPORT"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">PROCESSING RUN</span>
                  <span className="font-semibold text-signal-blue">
                    {previewSpecimen === "genuine" ? "RUN-2026-LIVE" : "RUN-2026-SUSPECT"}
                  </span>
                </div>
              </div>

              {/* Pipeline Live Checks */}
              <div className="space-y-2.5 mb-5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-ink-card/40 transition-colors">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    {previewSpecimen === "genuine" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    )}
                    <span>Visual OCR Extraction</span>
                  </div>
                  <span className={cn("font-mono text-[11px] font-semibold", previewSpecimen === "genuine" ? "text-slate-600 dark:text-slate-400" : "text-amber-500")}>
                    {previewSpecimen === "genuine" ? "98.4% conf" : "78.2% (Field Blur)"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-ink-card/40 transition-colors">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    {previewSpecimen === "genuine" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                    )}
                    <span>MRZ Checksum Validation</span>
                  </div>
                  <span className={cn("font-mono text-[11px] font-bold", previewSpecimen === "genuine" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {previewSpecimen === "genuine" ? "PASS (TD3)" : "FAIL (Digit 7 ≠ 9)"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-ink-card/40 transition-colors">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    {previewSpecimen === "genuine" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                    )}
                    <span>ELA Tampering Forensics</span>
                  </div>
                  <span className={cn("font-mono text-[11px] font-bold", previewSpecimen === "genuine" ? "text-slate-600 dark:text-slate-400" : "text-rose-600 dark:text-rose-400")}>
                    {previewSpecimen === "genuine" ? "0% anomaly" : "84% (Photo Swap)"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-ink-card/40 transition-colors">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    {previewSpecimen === "genuine" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                    )}
                    <span>Biometric Face Verification</span>
                  </div>
                  <span className={cn("font-mono text-[11px] font-bold", previewSpecimen === "genuine" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {previewSpecimen === "genuine" ? "MATCH (94%)" : "MISMATCH (38%)"}
                  </span>
                </div>
              </div>

              {/* Composite TrustGate Fusion Score Bar */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">
                    COMPOSITE RISK INDEX
                  </div>
                  <div className={cn("text-xl font-bold font-mono", previewSpecimen === "genuine" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {previewSpecimen === "genuine" ? (
                      <>8 / 100 <span className="text-xs font-normal text-slate-500">(LOW RISK)</span></>
                    ) : (
                      <>86 / 100 <span className="text-xs font-normal text-rose-500">(HIGH RISK)</span></>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">CRYPTO SEAL</span>
                  <span className={cn("text-[11px] font-mono font-bold", previewSpecimen === "genuine" ? "text-signal-blue" : "text-rose-500")}>
                    {previewSpecimen === "genuine" ? "SHA-256 SEALED" : "FLAGGED RECORD"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Stat Metric Cards (Exact 4 Points Preserved) ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          <StatMetricCard
            value="9"
            label="TrustGate Fusion Engine Stages"
            subtext="End-to-end sequential pipeline"
            badge="LOCAL INFERENCE"
          />
          <StatMetricCard
            value="32"
            label="Database Tables"
            subtext="PostgreSQL with RLS & Audit Ledger"
            badge="143 ACTIVE CASES"
          />
          <StatMetricCard
            value="4"
            label="RBAC Roles"
            subtext="Officer, Supervisor, Admin, Analyst"
            badge="ROLE ENFORCED"
          />
          <StatMetricCard
            value="< 5s"
            label="Avg Processing Time"
            subtext="Zero external API dependencies"
            badge="WASM ACCELERATED"
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
          <div className="relative rounded-2xl border border-rose-200/90 dark:border-risk-high/30 bg-rose-50/60 dark:bg-risk-high/5 p-7 sm:p-8 shadow-xs hover:border-rose-400/50 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500/80 via-rose-500 to-rose-400 rounded-t-2xl" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 mb-4 shadow-2xs">
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
          <div className="relative rounded-2xl border border-emerald-200/90 dark:border-risk-low/30 bg-emerald-50/60 dark:bg-risk-low/5 p-7 sm:p-8 shadow-xs hover:border-emerald-400/50 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/80 via-emerald-500 to-teal-400 rounded-t-2xl" />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 mb-4 shadow-2xs">
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

      {/* ── Section: Features / Capabilities (Exact 9 Points Preserved) ── */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-3 border-signal-blue/40 text-signal-blue bg-signal-blue/10">
            Platform Capabilities
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Intelligence Behind Every Verification
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-3 max-w-2xl mx-auto text-base">
            A full-stack identity forensics platform built on open-source AI and a production-grade backend.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            icon={Eye}
            iconClass="bg-signal-blue/15 text-signal-blue"
            tag="Inference"
            title="OCR Field Extraction"
            description="PaddleOCR / Tesseract extracts name, DOB, nationality, document number, issue/expiry dates with per-field confidence scores."
          />
          <FeatureCard
            icon={Fingerprint}
            iconClass="bg-signal-cyan/15 text-signal-cyan"
            tag="Standard"
            title="MRZ Validation"
            description="Machine-readable zone parsing with check-digit verification and pixel-level OCR/MRZ cross-field consistency checking."
          />
          <FeatureCard
            icon={AlertTriangle}
            iconClass="bg-rose-500/15 text-rose-600 dark:text-risk-high"
            tag="Forensics"
            title="Tampering Detection"
            description="ELA-based forensic analysis detects photo replacement, text alterations, JPEG compression inconsistencies, and cloning artifacts."
          />
          <FeatureCard
            icon={Activity}
            iconClass="bg-purple-500/15 text-purple-600 dark:text-purple-400"
            tag="Biometrics"
            title="Face Analysis"
            description="Open-source face detection, quality scoring, similarity comparison, and pose estimation — no paid APIs required."
          />
          <FeatureCard
            icon={BrainCircuit}
            iconClass="bg-amber-500/15 text-amber-600 dark:text-risk-medium"
            tag="TrustFusion"
            title="Explainable Risk Scoring"
            description="Multi-signal risk engine combining image quality, OCR, MRZ, tampering, face, and consistency signals into a 0–100 score with human-readable explanations."
          />
          <FeatureCard
            icon={ShieldCheck}
            iconClass="bg-emerald-500/15 text-emerald-700 dark:text-risk-low"
            tag="Governance"
            title="Human-in-the-Loop"
            description="Officers review all evidence before decisions. AI overrides are logged with reasons. Final authority stays with authorized personnel — always."
          />
          <FeatureCard
            icon={Database}
            iconClass="bg-slate-500/15 text-slate-700 dark:text-slate-300"
            tag="Database"
            title="Production Backend"
            description="InsForge Postgres with 32-table schema, row-level security, RBAC, immutable audit logs, and configurable data retention policies."
          />
          <FeatureCard
            icon={Lock}
            iconClass="bg-signal-blue/15 text-signal-blue"
            tag="Security"
            title="Security First"
            description="HTTPS-only, parameterized queries, JWT auth, RLS enforcement, MIME validation, PII minimization, and INSERT-only audit ledger."
          />
          <FeatureCard
            icon={Globe}
            iconClass="bg-signal-cyan/15 text-signal-cyan"
            tag="Deployment"
            title="Edge-Ready Architecture"
            description="Designed for future deployment at border checkpoints with offline OCR/MRZ capability and central analytics synchronization."
          />
        </div>
      </section>

      {/* ── Section: How It Works / TrustFusion Pipeline (Exact 9 Stages Preserved) ── */}
      <section id="how-it-works" className="relative py-20 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-3 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-bold uppercase tracking-wider text-[11px]">
              TrustFusion Risk Engine
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              How It Works
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-3 max-w-xl mx-auto text-base">
              A 9-stage sequential pipeline that processes every document from raw image to explainable risk decision in under 5 seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: The 9 Pipeline Steps */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-ink-border bg-white dark:bg-ink-card p-5 sm:p-6 shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 uppercase">
                <span>PIPELINE STAGE SEQUENCE</span>
                <span className="text-signal-blue">SELECT TO INSPECT SPECIFICATION</span>
              </div>
              {PIPELINE_STAGES.map((stg) => {
                const isSelected = activeStage === stg.num;
                return (
                  <button
                    key={stg.num}
                    type="button"
                    onClick={() => setActiveStage(stg.num)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-signal-blue bg-signal-blue/10 dark:bg-signal-blue/15 text-slate-900 dark:text-white shadow-xs"
                        : "border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-ink-raised/60 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-transform",
                          isSelected
                            ? "bg-signal-blue text-white scale-105"
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
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400">
                        {stg.runtime}
                      </span>
                      <ChevronRight className={cn("h-4 w-4 transition-transform", isSelected ? "text-signal-blue translate-x-1" : "text-slate-400")} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Stage Inspector & 3 Realistic Example Findings */}
            <div className="lg:col-span-6 space-y-4">
              {/* Active Stage Inspector Box (Enriched with Deep Dynamic Details) */}
              <div className="rounded-2xl border border-signal-blue/40 bg-sky-50/60 dark:bg-signal-blue/10 p-5 shadow-xs transition-all">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-signal-blue uppercase">
                    <Cpu className="h-4 w-4 text-signal-blue" />
                    <span>Stage 0{activeStage} Specification</span>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-signal-blue/15 text-signal-cyan border border-signal-blue/30 font-bold">
                    {PIPELINE_STAGES[activeStage - 1].status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {PIPELINE_STAGES[activeStage - 1].name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {PIPELINE_STAGES[activeStage - 1].desc}
                </p>

                {/* Technical Telemetry Specs */}
                <div className="mt-3.5 pt-3 border-t border-signal-blue/20 grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-ink-card/60 border border-signal-blue/15">
                    <span className="text-[9px] text-slate-400 block font-sans uppercase">ENGINE CORE</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold truncate block">
                      {PIPELINE_STAGES[activeStage - 1].engine}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-ink-card/60 border border-signal-blue/15">
                    <span className="text-[9px] text-slate-400 block font-sans uppercase">AVG RUNTIME</span>
                    <span className="text-signal-blue font-bold truncate block">
                      {PIPELINE_STAGES[activeStage - 1].runtime} (Local)
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-ink-card/60 border border-signal-blue/15">
                    <span className="text-[9px] text-slate-400 block font-sans uppercase">INPUT PAYLOAD</span>
                    <span className="text-slate-700 dark:text-slate-300 truncate block">
                      {PIPELINE_STAGES[activeStage - 1].input}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-ink-card/60 border border-signal-blue/15">
                    <span className="text-[9px] text-slate-400 block font-sans uppercase">OUTPUT ARTIFACT</span>
                    <span className="text-slate-700 dark:text-slate-300 truncate block">
                      {PIPELINE_STAGES[activeStage - 1].output}
                    </span>
                  </div>
                </div>
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

              {/* Example 2: TAMPERING (Exact points preserved) */}
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
                  Texture inconsistency in PHOTO region. JPEG compression grid differs from surrounding document area. Probability: 88%.
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Region: PHOTO · Model: ela-tamper-v1 · Confidence: 92%
                </div>
              </div>

              {/* Example 3: PASS (Exact points preserved) */}
              <div className="rounded-2xl border border-emerald-200 dark:border-risk-low/30 bg-emerald-50/70 dark:bg-risk-low/5 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    Example Finding — PASS
                  </div>
                  <Badge variant="pass">PASSED</Badge>
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">
                  Genuine Document — Score: 8/100
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  All 7 validation rules passed. MRZ composite valid. Face similarity 93%. No tampering indicators. Proceed with clearance workflow.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Architecture (Exact 3 Pillars Preserved) ── */}
      <section id="architecture" className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-20 border-t border-slate-100 dark:border-slate-800/80">
        <div className="text-center mb-12">
          <Badge variant="default" className="mb-3 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-bold uppercase tracking-wider text-[11px]">
            System Architecture
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Scalable from Prototype to Production
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-3 max-w-xl mx-auto text-base">
            Modern full-stack security platform architecture built with decoupled client inference and hardened BaaS infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              tier: "TIER 01 · CLIENT EXECUTION",
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
              tier: "TIER 02 · DATA PLATFORM",
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
              tier: "TIER 03 · INFERENCE PIPELINE",
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
                className="group relative rounded-2xl border border-slate-200/90 dark:border-ink-border bg-white dark:bg-ink-card p-6 shadow-xs hover:border-signal-blue/40 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", col.iconClass)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {col.tier}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg group-hover:text-signal-blue transition-colors">
                  {col.title}
                </h3>
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
      <section id="specifications" className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-20 border-t border-slate-100 dark:border-slate-800/80">
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-10 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <Badge variant="default" className="mb-3 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-bold uppercase tracking-wider text-[11px]">
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
                  <Button variant="primary" size="lg" className="shadow-glow font-bold">
                    Launch Dashboard
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* The 10 Specifications Badges (Exact 10 Preserved) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200/90 dark:border-ink-border bg-white dark:bg-ink-card/60 p-3 shadow-2xs hover:border-signal-blue/30 transition-colors"
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
                  <span className="font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Security & Governance (Institutional Standards) ── */}
      <section id="governance" className="relative py-20 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-3 border-emerald-500/40 text-emerald-700 dark:text-risk-low bg-emerald-500/10 font-bold uppercase tracking-wider text-[11px]">
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
            <div className="rounded-2xl border border-slate-200/90 dark:border-ink-border bg-white dark:bg-ink-card p-6 shadow-xs hover:border-signal-blue/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-signal-blue/15 text-signal-blue flex items-center justify-center mb-3">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1.5">Human Authority</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                AI provides evidentiary assistance and risk synthesis; final clearance and rejection remains exclusively with authorized personnel.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-ink-border bg-white dark:bg-ink-card p-6 shadow-xs hover:border-signal-cyan/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-signal-cyan/15 text-signal-cyan flex items-center justify-center mb-3">
                <Binary className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1.5">SHA-256 Provenance</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                All documents, crops, live camera frames, and model inferences are cryptographically hashed and sealed into immutable audit records.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-ink-border bg-white dark:bg-ink-card p-6 shadow-xs hover:border-purple-400/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1.5">PII Minimization</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Zero biometric data or personal identity parameters are logged to public endpoints or browser storage without access controls.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 dark:border-ink-border bg-white dark:bg-ink-card p-6 shadow-xs hover:border-emerald-400/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-risk-low flex items-center justify-center mb-3">
                <FileCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1.5">Zero Mock Fallbacks</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Inconclusive or unavailable signals report honest null status codes rather than fabricated confidence percentages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Ready to Screen CTA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-24 border-t border-slate-100 dark:border-slate-800/80">
        <div className="relative rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-8 sm:p-14 text-center shadow-xs overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-signal-blue to-transparent" />
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold text-signal-blue bg-signal-blue/10 border border-signal-blue/30 mb-5 shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 text-signal-blue" />
            <span>HUMAN-IN-THE-LOOP SCREENING · 100% LOCAL PROCESSING</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-4">
            Ready to screen your first document?
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed font-normal">
            Sign in as an authorized officer and run live document &amp; biometric screening in under 60 seconds.
            The complete neural inspection pipeline executes locally on device with zero external dependencies.
          </p>
          <div className="flex flex-wrap gap-4 justify-center items-center">
            <Link to={isAuthenticated ? "/screening" : "/login"}>
              <Button variant="primary" size="lg" className="shadow-glow font-bold h-12 px-7 text-sm">
                Get Started
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                variant="outline"
                size="lg"
                className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 h-12 px-7 shadow-2xs font-semibold text-sm"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
            {/* Brand Info */}
            <div className="md:col-span-5">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src="/trustgate-logo.png"
                  alt="TrustGate AI"
                  className="h-9 w-9 rounded-xl object-cover shadow-xs border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <div className="font-extrabold tracking-[0.16em] text-slate-900 dark:text-white text-sm">
                    TRUSTGATE AI
                  </div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                    AI-Assisted Identity Screening Platform
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed mb-4">
                Institutional-grade document verification and forensic risk analysis designed to augment border screening personnel.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>SYSTEM STATUS: OPERATIONAL</span>
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
          <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs text-slate-500 dark:text-slate-400">
            <div>
              &copy; {new Date().getFullYear()} TRUSTGATE AI. All rights reserved.
            </div>
            <div className="max-w-xl text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
              Ethical AI Governance: TrustGate AI operates strictly as an evidentiary decision-support tool.
              Final clearance and identity admissibility determinations remain strictly with authorized screening officers.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
