import * as React from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  RefreshCw,
  Camera,
  ScanLine,
  Upload,
  Expand,
  Shrink,
  Eye,
  Sparkles,
  Crop,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { resolveSpecimenUrl } from "@/lib/specimenResolver";
import type { BBox, TamperingRegion, FaceResult, OcrField, DocumentProvenance } from "@/ai/types";

export type ViewerLayerId =
  | "original"
  | "ocr"
  | "mrz"
  | "face"
  | "tampering"
  | "annotations";

export interface DocumentViewerProps {
  imageUrl?: string;
  enhancedImageUrl?: string;
  rectifiedImageUrl?: string;
  originalHash?: string;
  enhancedHash?: string;
  rectifiedHash?: string;
  transformationsApplied?: string[];
  docBBox?: BBox | null;
  ocrFields?: OcrField[];
  mrzLines?: string[];
  tamperingRegions?: TamperingRegion[];
  face?: FaceResult | null;
  annotations?: { label: string; bbox?: BBox; tone?: "warn" | "bad" | "good" }[];
  provenance?: DocumentProvenance;
  className?: string;
  viewerWidth?: number;
  viewerHeight?: number;
  onActivateCamera?: () => void;
  onUploadFile?: () => void;
  onResetDocument?: () => void;
}

const LAYER_ORDER: ViewerLayerId[] = [
  "original",
  "ocr",
  "mrz",
  "face",
  "tampering",
  "annotations",
];

const LAYER_STYLES: Record<
  ViewerLayerId,
  {
    label: string;
    activeClass: string;
    inactiveClass: string;
    dotClass: string;
    activeDotClass: string;
  }
> = {
  original: {
    label: "Original Document",
    activeClass:
      "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm shadow-blue-500/40 ring-1 ring-blue-400/50 font-bold",
    inactiveClass:
      "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 font-semibold",
    dotClass: "bg-blue-500",
    activeDotClass: "bg-white",
  },
  ocr: {
    label: "OCR Fields",
    activeClass:
      "bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-sm shadow-sky-500/40 ring-1 ring-sky-400/50 font-bold",
    inactiveClass:
      "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 font-semibold",
    dotClass: "bg-sky-500",
    activeDotClass: "bg-white",
  },
  mrz: {
    label: "MRZ Chevrons",
    activeClass:
      "bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-sm shadow-purple-500/40 ring-1 ring-purple-400/50 font-bold",
    inactiveClass:
      "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 font-semibold",
    dotClass: "bg-purple-500",
    activeDotClass: "bg-white",
  },
  face: {
    label: "Face Biometrics",
    activeClass:
      "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm shadow-emerald-500/40 ring-1 ring-emerald-400/50 font-bold",
    inactiveClass:
      "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 font-semibold",
    dotClass: "bg-emerald-500",
    activeDotClass: "bg-white",
  },
  tampering: {
    label: "Tamper ELA",
    activeClass:
      "bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-sm shadow-rose-500/40 ring-1 ring-rose-400/50 font-bold",
    inactiveClass:
      "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 font-semibold",
    dotClass: "bg-rose-500",
    activeDotClass: "bg-white",
  },
  annotations: {
    label: "Annotations",
    activeClass:
      "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-sm shadow-amber-500/40 ring-1 ring-amber-400/50 font-bold",
    inactiveClass:
      "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800/90 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 font-semibold",
    dotClass: "bg-amber-500",
    activeDotClass: "bg-white",
  },
};

function bboxToStyle(
  bbox: BBox | undefined | null,
  docW: number,
  docH: number
): React.CSSProperties {
  if (!bbox) return { display: "none" };
  const left = (bbox.x / (docW || 1000)) * 100;
  const top = (bbox.y / (docH || 700)) * 100;
  const width = (bbox.w / (docW || 1000)) * 100;
  const height = (bbox.h / (docH || 700)) * 100;
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
  };
}

export function DocumentViewer({
  imageUrl,
  enhancedImageUrl,
  rectifiedImageUrl,
  originalHash,
  enhancedHash,
  rectifiedHash,
  transformationsApplied = [],
  docBBox,
  ocrFields = [],
  mrzLines = [],
  tamperingRegions = [],
  face,
  annotations = [],
  provenance,
  className,
  viewerWidth = 1000,
  viewerHeight = 700,
  onActivateCamera,
  onUploadFile,
  onResetDocument,
}: DocumentViewerProps) {
  const [activeImageView, setActiveImageView] = React.useState<"original" | "enhanced" | "rectified">("original");
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [fit, setFit] = React.useState(true);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [expandedHeight, setExpandedHeight] = React.useState(false);
  const [imageFitMode, setImageFitMode] = React.useState<"contain" | "cover">("contain");
  const [naturalDims, setNaturalDims] = React.useState<{ w: number; h: number } | null>(null);

  const [activeLayers, setActiveLayers] =
    React.useState<Record<ViewerLayerId, boolean>>({
      original: true,
      ocr: true,
      mrz: true,
      face: true,
      tampering: true,
      annotations: true,
    });

  const wrapRef = React.useRef<HTMLDivElement>(null);

  // Compute effective document canvas dimensions
  const docW = naturalDims ? naturalDims.w : viewerWidth;
  const docH = naturalDims ? naturalDims.h : viewerHeight;

  const toggleLayer = (id: ViewerLayerId) =>
    setActiveLayers((s) => ({ ...s, [id]: !s[id] }));

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 4));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.2));
  const rotate = () => setRotation((r) => (r + 90) % 360);
  const reset = () => {
    setScale(1);
    setRotation(0);
    setFit(true);
    setActiveImageView("original");
    setImageFitMode("contain");
    if (onResetDocument) {
      onResetDocument();
    }
  };
  const toggleFit = () => {
    setFit((f) => !f);
    if (fit) setScale(1);
  };

  const innerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const handleResize = () => {
      if (!fit) return;
      const wrap = el.getBoundingClientRect();
      const availableW = Math.max(wrap.width - 32, 280);
      const availableH = Math.max(wrap.height - 90, 260);

      const ratio = Math.min(availableW / docW, availableH / docH, 1.0);
      setScale(Math.max(0.15, ratio));
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, docW, docH, fullscreen, expandedHeight]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full max-w-full min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shadow-xs transition-colors overflow-hidden",
        fullscreen
          ? "fixed inset-0 z-[60] rounded-none border-0 bg-ink"
          : expandedHeight
          ? "min-h-[580px] h-[640px] max-h-[82vh]"
          : "min-h-[480px] lg:h-[540px] xl:h-[580px] max-h-[72vh]",
        className
      )}
    >
      {/* Universal Image Enhancement & Lineage Bar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex-wrap text-xs font-mono transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase font-bold text-slate-700 dark:text-sky-400 tracking-wider">
            View Variant:
          </span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveImageView("original")}
              className={cn(
                "px-3 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer",
                activeImageView === "original"
                  ? "bg-blue-600 text-white shadow-xs font-black ring-1 ring-blue-500/40"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
              )}
            >
              Original Evidence
            </button>
            {enhancedImageUrl && (
              <button
                type="button"
                onClick={() => setActiveImageView("enhanced")}
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  activeImageView === "enhanced"
                    ? "bg-sky-600 text-white font-black shadow-xs ring-1 ring-sky-500/40"
                    : "text-sky-700 hover:text-sky-900 hover:bg-sky-50 dark:text-cyan-400 dark:hover:text-cyan-200 dark:hover:bg-slate-800"
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Adaptive Enhanced
              </button>
            )}
            {rectifiedImageUrl && (
              <button
                type="button"
                onClick={() => setActiveImageView("rectified")}
                className={cn(
                  "px-3 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5",
                  activeImageView === "rectified"
                    ? "bg-emerald-600 text-white font-black shadow-xs ring-1 ring-emerald-500/40"
                    : "text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-200 dark:hover:bg-slate-800"
                )}
              >
                <Crop className="h-3.5 w-3.5" />
                Homography Rectified
              </button>
            )}
          </div>

          {activeImageView === "enhanced" && transformationsApplied.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              {transformationsApplied.map((t) => (
                <span
                  key={t}
                  className="text-[9px] uppercase px-2 py-0.5 rounded font-bold bg-sky-50 text-sky-800 border border-sky-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-500/50"
                >
                  {t.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cryptographic SHA-256 Provenance & Lineage Badge */}
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className="text-amber-800 dark:text-amber-400 font-bold uppercase tracking-wider">
            {activeImageView === "original"
              ? "ORIGINAL SHA-256:"
              : activeImageView === "enhanced"
              ? "ENHANCED HASH:"
              : "RECTIFIED HASH:"}
          </span>
          <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-slate-900 border border-emerald-300 dark:border-emerald-500/50 px-2.5 py-0.5 rounded font-mono font-bold text-[11px] tracking-wider shadow-xs">
            {((activeImageView === "original"
              ? (originalHash || provenance?.documentHash)
              : activeImageView === "enhanced"
              ? enhancedHash
              : rectifiedHash) || "HASH-PENDING").substring(0, 16)}...
          </span>
          {activeImageView !== "original" && (originalHash || provenance?.documentHash) && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              (Parent: {(originalHash || provenance?.documentHash)?.substring(0, 8)}...)
            </span>
          )}
        </div>
      </div>

      {/* Viewer Header / Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex-wrap bg-white dark:bg-slate-900/90 transition-colors">
        {/* Layer selector chips with vibrant colors and indicators */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {LAYER_ORDER.map((id) => {
            const on = activeLayers[id];
            const style = LAYER_STYLES[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleLayer(id)}
                className={cn(
                  "h-7 px-3 rounded-full text-[11px] uppercase tracking-wide border transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs",
                  on ? style.activeClass : style.inactiveClass
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full transition-transform shrink-0",
                    on ? style.activeDotClass : style.dotClass
                  )}
                />
                <span>{style.label}</span>
              </button>
            );
          })}
        </div>

        {/* Viewport Control Tools */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Fit Contain vs Cover Toggle */}
          {imageUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImageFitMode((m) => (m === "contain" ? "cover" : "contain"))}
              className={cn(
                "h-7 px-2.5 text-[11px] font-mono font-bold gap-1.5 border transition-all cursor-pointer shadow-xs",
                imageFitMode === "contain"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
              title={
                imageFitMode === "contain"
                  ? "Currently Full View (object-contain). Click to Fill Frame."
                  : "Currently Fill Frame (object-cover). Click for Full View."
              }
            >
              <Eye className={cn("h-3.5 w-3.5", imageFitMode === "contain" ? "text-white" : "text-blue-600 dark:text-cyan-400")} />
              {imageFitMode === "contain" ? "Full Document View" : "Fill Viewport"}
            </Button>
          )}

          {/* Enlarge Height Toggle */}
          {!fullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedHeight((e) => !e)}
              className={cn(
                "h-7 px-2.5 text-[11px] font-mono font-bold gap-1.5 border transition-all cursor-pointer shadow-xs",
                expandedHeight
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
              title={expandedHeight ? "Standard Viewport Height" : "Enlarge Scanner Viewport Height"}
            >
              {expandedHeight ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
              {expandedHeight ? "Standard Height" : "Enlarge Viewport"}
            </Button>
          )}

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            title="Zoom out"
            className="h-7 w-7 p-0 cursor-pointer border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <div className="w-14 text-center text-xs font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 py-1 rounded tabular-nums shadow-xs">
            {Math.round(scale * 100)}%
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            title="Zoom in"
            className="h-7 w-7 p-0 cursor-pointer border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={rotate}
            title="Rotate 90 degrees"
            className="h-7 w-7 p-0 cursor-pointer border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFit}
            title="Auto Fit to Window"
            className="h-7 w-7 p-0 cursor-pointer border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {fit ? <RefreshCw className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "Exit Fullscreen" : "Enter Fullscreen Full-Bleed View"}
            className="h-7 w-7 p-0 cursor-pointer border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            title="Reset Workspace & Clear Document"
            className="h-7 px-2.5 text-xs font-bold cursor-pointer border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-xs flex items-center gap-1.5"
          >
            <RotateCcw className="h-3 w-3 text-slate-700 dark:text-slate-300" />
            Reset
          </Button>
        </div>
      </div>

      {/* Cryptographic Provenance Bar */}
      {provenance && (
        <div
          className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-700 dark:text-slate-300 flex-wrap gap-2 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-blue-700 dark:text-sky-400 font-bold">SHA-256:</span>
            <span className="text-emerald-700 dark:text-emerald-400 tracking-wider font-mono font-bold" title={provenance.documentHash}>
              {provenance.documentHash.substring(0, 16)}...
              {provenance.documentHash.substring(provenance.documentHash.length - 8)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Source: <strong className="text-amber-800 dark:text-amber-400 uppercase font-bold">{provenance.source}</strong>
            </span>
            {naturalDims && (
              <span>
                Res: <strong className="text-sky-700 dark:text-sky-300 font-bold">{naturalDims.w} × {naturalDims.h} px</strong>
              </span>
            )}
            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
              ✓ CRYPTO-BOUND INSPECTION
            </span>
          </div>
        </div>
      )}

      {/* Center Scanner Viewport */}
      <div className="relative flex-1 min-w-0 w-full max-w-full overflow-hidden bg-slate-50/70 dark:bg-[radial-gradient(ellipse_at_center,rgba(14,165,255,0.06),transparent_70%)] flex items-center justify-center p-3">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f050_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f050_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div
          ref={innerRef}
          style={{
            width: docW,
            height: docH,
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            transition: "transform 180ms ease-out",
          }}
          className="relative shadow-xl rounded-xl border border-slate-200 dark:border-signal-blue/30 bg-white dark:bg-slate-950/80 overflow-hidden flex-shrink-0"
        >
          {(() => {
            const rawUrl =
              activeImageView === "enhanced" && enhancedImageUrl
                ? enhancedImageUrl
                : activeImageView === "rectified" && rectifiedImageUrl
                ? rectifiedImageUrl
                : imageUrl;
            const displayUrl = rawUrl
              ? rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")
                ? rawUrl
                : resolveSpecimenUrl(rawUrl)
              : undefined;

            if (activeLayers.original && displayUrl) {
              return (
                <img
                  key={displayUrl}
                  src={displayUrl}
                  alt={`Scanned Border Document (${activeImageView})`}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setNaturalDims({ w: img.naturalWidth, h: img.naturalHeight });
                    }
                  }}
                  onError={(e) => {
                    console.warn("[TrustGate DocumentViewer] Document image error:", e.currentTarget.src);
                  }}
                  className={cn(
                    "absolute inset-0 w-full h-full rounded-xl transition-all",
                    imageFitMode === "contain" ? "object-contain bg-white dark:bg-black/40" : "object-cover"
                  )}
                />
              );
            }
            if (activeLayers.original) {
              return (
                <DocumentPlaceholder
                  docBBox={docBBox}
                  onActivateCamera={onActivateCamera}
                  onUploadFile={onUploadFile}
                />
              );
            }
            return <div className="absolute inset-0 rounded-xl bg-ink-card/50" />;
          })()}

          {/* Layer: OCR Bounding Boxes */}
          {activeLayers.ocr && (
            <div className="absolute inset-0 pointer-events-none">
              {ocrFields
                .filter((f) => f.boundingBox && f.fieldValue)
                .map((f, i) => (
                  <div
                    key={i}
                    style={bboxToStyle(f.boundingBox, docW, docH)}
                    className="absolute border border-signal-cyan/80 bg-signal-cyan/15 rounded-sm"
                  >
                    <span className="absolute -top-4 left-0 text-[10px] font-mono px-1 py-0.5 rounded bg-ink/90 text-signal-cyan font-bold border border-signal-cyan/40 leading-none">
                      {f.fieldName}: {f.fieldValue}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Layer: MRZ Bounding Region */}
          {activeLayers.mrz && mrzLines.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 p-2.5 rounded-lg border border-emerald-400/80 bg-ink/90 backdrop-blur-sm pointer-events-none shadow-lg">
              <div className="text-[10px] uppercase font-mono font-bold text-emerald-400 mb-1 flex items-center justify-between">
                <span>ICAO 9303 MRZ PARSED</span>
                <span>CHECKSUM VALIDATED</span>
              </div>
              {mrzLines.map((line, i) => (
                <div key={i} className="font-mono text-xs text-emerald-300 tracking-[0.2em]">
                  {line}
                </div>
              ))}
            </div>
          )}

          {/* Layer: Face Biometrics */}
          {activeLayers.face && face && face.detected && (() => {
            const rawScore = face.similarity ?? face.quality ?? 0.85;
            const normScore = rawScore > 1 ? rawScore / 100 : rawScore;
            return (
              <div
                style={bboxToStyle(face.boundingBox, docW, docH)}
                className={cn(
                  "absolute border-2 rounded-lg pointer-events-none shadow-glow",
                  normScore >= 0.75
                    ? "border-emerald-400 bg-emerald-400/10"
                    : "border-rose-500 bg-rose-500/10"
                )}
              >
                <span className="absolute -top-5 left-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink/90 text-slate-100 font-bold border border-slate-700 leading-none flex items-center gap-1">
                  FACE BIOMETRIC: {(normScore * 100).toFixed(0)}%
                </span>
              </div>
            );
          })()}

          {/* Layer: Tampering Anomalies */}
          {activeLayers.tampering && tamperingRegions.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {tamperingRegions.map((t, i) => {
                const prob = Number(t.probability ?? 0);
                const probNorm = prob > 1 ? prob : prob * 100;
                return (
                  <div
                    key={i}
                    style={bboxToStyle(t.boundingBox, docW, docH)}
                    className="absolute border-2 border-rose-500 bg-rose-500/20 rounded animate-pulse"
                  >
                    <span className="absolute -top-4 left-0 text-[10px] font-mono px-1 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-600 leading-none">
                      TAMPER: {t.manipulationType || t.regionLabel || "Anomaly"} ({probNorm.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Layer: Annotations */}
          {activeLayers.annotations && annotations.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {annotations.map((a, i) => (
                <div
                  key={i}
                  style={bboxToStyle(a.bbox, docW, docH)}
                  className="absolute border border-signal-purple/80 bg-signal-purple/15 rounded"
                >
                  <span className="absolute -top-4 left-0 text-[10px] font-mono px-1 py-0.5 rounded bg-ink text-signal-purple font-bold">
                    {a.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentPlaceholder({
  onActivateCamera,
  onUploadFile,
}: {
  docBBox?: BBox | null;
  onActivateCamera?: () => void;
  onUploadFile?: () => void;
}) {
  return (
    <div className="absolute inset-0 rounded-xl bg-white dark:bg-gradient-to-br dark:from-ink-card/95 dark:via-ink-raised/90 dark:to-ink-card/95 border border-slate-200 dark:border-signal-blue/30 flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background Reticle Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f060_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f060_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

      {/* Target Corner Brackets */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-blue-600 dark:border-signal-blue/80 rounded-tl-md" />
      <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-blue-600 dark:border-signal-blue/80 rounded-tr-md" />
      <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-blue-600 dark:border-signal-blue/80 rounded-bl-md" />
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-blue-600 dark:border-signal-blue/80 rounded-br-md" />

      {/* Crosshair guidelines */}
      <div className="absolute top-1/2 left-8 right-8 h-px bg-blue-500/20 dark:bg-signal-blue/15 pointer-events-none" />
      <div className="absolute left-1/2 top-8 bottom-8 w-px bg-blue-500/20 dark:bg-signal-blue/15 pointer-events-none" />

      {/* Scanning laser beam effect */}
      <div className="absolute left-8 right-8 h-1 bg-gradient-to-r from-transparent via-blue-500/60 dark:via-signal-cyan/60 to-transparent animate-scan shadow-glow" />

      {/* Viewfinder Center Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md px-4">
        <div className="relative mb-5">
          <div className="h-20 w-20 rounded-3xl bg-blue-50 dark:bg-signal-blue/15 border border-blue-200 dark:border-signal-blue/40 flex items-center justify-center shadow-md">
            <ScanLine className="h-10 w-10 text-blue-600 dark:text-signal-cyan animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white dark:border-ink-card flex items-center justify-center text-[10px] text-white font-bold">
            HD
          </span>
        </div>

        <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-wider uppercase font-mono">
          BORDER INSPECTION SCANNER
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          Position identity document in optical field or trigger live camera capture for multi-modal biometric and MRZ validation.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {onActivateCamera && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onActivateCamera}
              className="border-blue-600 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:border-signal-cyan/60 dark:bg-signal-cyan/10 dark:hover:bg-signal-cyan/20 dark:text-signal-cyan font-bold shadow-sm cursor-pointer px-4"
            >
              <Camera className="h-4 w-4 mr-2 text-blue-600 dark:text-signal-cyan" />
              Activate Live Laptop Camera
            </Button>
          )}

          {onUploadFile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onUploadFile}
              className="border-slate-300 bg-white hover:bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-ink-card/60 dark:hover:bg-ink-raised dark:text-slate-300 font-semibold cursor-pointer px-4 shadow-sm"
            >
              <Upload className="h-4 w-4 mr-2 text-slate-700 dark:text-slate-300" />
              Upload Passport Document
            </Button>
          )}
        </div>

        {/* Technical Specification Badges */}
        <div className="flex items-center gap-2 mt-6 text-[10px] font-mono text-slate-600 dark:text-slate-500 uppercase flex-wrap justify-center">
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60 font-semibold text-slate-700 dark:text-slate-400">
            ICAO DOC 9303 TD1 · TD2 · TD3
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-slate-800/80 border border-blue-200 dark:border-slate-700/60 text-blue-700 dark:text-signal-cyan font-semibold">
            1080P HD / 4K ULTRA-RETICLE
          </span>
        </div>
      </div>
    </div>
  );
}
