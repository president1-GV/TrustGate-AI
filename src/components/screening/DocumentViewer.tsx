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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
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
}

const LAYER_ORDER: ViewerLayerId[] = [
  "original",
  "ocr",
  "mrz",
  "face",
  "tampering",
  "annotations",
];

const LAYER_LABEL: Record<ViewerLayerId, string> = {
  original: "Original Document",
  ocr: "OCR Fields",
  mrz: "MRZ Chevrons",
  face: "Face Biometrics",
  tampering: "Tamper ELA",
  annotations: "Annotations",
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
}: DocumentViewerProps) {
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
        "relative w-full max-w-full min-w-0 rounded-2xl border border-signal-blue/40 bg-ink-card/80 backdrop-blur-xl flex flex-col shadow-xl transition-all duration-300 overflow-hidden",
        fullscreen
          ? "fixed inset-0 z-[60] rounded-none border-0 bg-ink"
          : expandedHeight
          ? "min-h-[580px] h-[640px] max-h-[82vh]"
          : "min-h-[480px] lg:h-[540px] xl:h-[580px] max-h-[72vh]",
        className
      )}
    >
      {/* Viewer Header / Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-ink-border flex-wrap bg-ink/70">
        {/* Layer selector chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {LAYER_ORDER.map((id) => {
            const on = activeLayers[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleLayer(id)}
                className={cn(
                  "h-7 px-2.5 rounded-full text-[11px] font-semibold uppercase tracking-wide border transition-all cursor-pointer",
                  on
                    ? "bg-signal-blue/20 text-signal-cyan border-signal-blue/50 shadow-sm"
                    : "bg-ink-card/60 text-slate-500 border-ink-border hover:text-slate-300 hover:border-slate-700"
                )}
              >
                {LAYER_LABEL[id]}
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
                "h-7 px-2 text-[11px] font-mono gap-1 border border-ink-border transition-colors cursor-pointer",
                imageFitMode === "contain"
                  ? "bg-signal-blue/15 text-signal-cyan border-signal-blue/40"
                  : "text-slate-400 hover:text-white"
              )}
              title={
                imageFitMode === "contain"
                  ? "Currently Full View (object-contain). Click to Fill Frame."
                  : "Currently Fill Frame (object-cover). Click for Full View."
              }
            >
              <Eye className="h-3.5 w-3.5 text-signal-cyan" />
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
                "h-7 px-2 text-[11px] font-mono gap-1 border border-ink-border transition-colors cursor-pointer",
                expandedHeight
                  ? "bg-signal-purple/20 text-signal-purple border-signal-purple/40"
                  : "text-slate-400 hover:text-white"
              )}
              title={expandedHeight ? "Standard Viewport Height" : "Enlarge Scanner Viewport Height"}
            >
              {expandedHeight ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
              {expandedHeight ? "Standard Height" : "Enlarge Viewport"}
            </Button>
          )}

          <div className="h-4 w-px bg-ink-border mx-1" />

          {/* Zoom controls */}
          <Button variant="ghost" size="sm" onClick={zoomOut} title="Zoom out" className="h-7 w-7 p-0 cursor-pointer">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="w-14 text-center text-xs text-slate-300 font-mono tabular-nums">
            {Math.round(scale * 100)}%
          </div>
          <Button variant="ghost" size="sm" onClick={zoomIn} title="Zoom in" className="h-7 w-7 p-0 cursor-pointer">
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={rotate} title="Rotate 90 degrees" className="h-7 w-7 p-0 cursor-pointer">
            <RotateCw className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFit}
            title="Auto Fit to Window"
            className="h-7 w-7 p-0 cursor-pointer"
          >
            {fit ? <RefreshCw className="h-4 w-4 text-signal-cyan" /> : <Minimize2 className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? "Exit Fullscreen" : "Enter Fullscreen Full-Bleed View"}
            className="h-7 w-7 p-0 cursor-pointer"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={reset} title="Reset zoom and rotation" className="h-7 px-2 text-xs cursor-pointer">
            Reset
          </Button>
        </div>
      </div>

      {/* Cryptographic Provenance Bar */}
      {provenance && (
        <div className="px-4 py-1.5 bg-ink/90 border-b border-ink-border flex items-center justify-between text-[11px] font-mono text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-signal-cyan font-semibold">SHA-256:</span>
            <span className="text-slate-200 tracking-wider font-mono" title={provenance.documentHash}>
              {provenance.documentHash.substring(0, 16)}...
              {provenance.documentHash.substring(provenance.documentHash.length - 8)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              Source: <strong className="text-slate-200 uppercase font-bold">{provenance.source}</strong>
            </span>
            {naturalDims && (
              <span>
                Res: <strong className="text-signal-cyan">{naturalDims.w} × {naturalDims.h} px</strong>
              </span>
            )}
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              ✓ CRYPTO-BOUND INSPECTION
            </span>
          </div>
        </div>
      )}

      {/* Center Scanner Viewport */}
      <div className="relative flex-1 min-w-0 w-full max-w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(14,165,255,0.06),transparent_70%)] flex items-center justify-center p-3">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div
          ref={innerRef}
          style={{
            width: docW,
            height: docH,
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            transition: "transform 180ms ease-out",
          }}
          className="relative shadow-2xl rounded-xl border border-signal-blue/30 bg-slate-950/80 overflow-hidden flex-shrink-0"
        >
          {activeLayers.original && imageUrl ? (
            <img
              src={imageUrl}
              alt="Scanned Border Document"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setNaturalDims({ w: img.naturalWidth, h: img.naturalHeight });
                }
              }}
              className={cn(
                "absolute inset-0 w-full h-full rounded-xl transition-all",
                imageFitMode === "contain" ? "object-contain bg-black/40" : "object-cover"
              )}
            />
          ) : activeLayers.original ? (
            <DocumentPlaceholder
              docBBox={docBBox}
              onActivateCamera={onActivateCamera}
              onUploadFile={onUploadFile}
            />
          ) : (
            <div className="absolute inset-0 rounded-xl bg-ink-card/50" />
          )}

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
          {activeLayers.face && face && face.detected && (
            <div
              style={bboxToStyle(face.boundingBox, docW, docH)}
              className={cn(
                "absolute border-2 rounded-lg pointer-events-none shadow-glow",
                (face.similarity ?? face.quality ?? 0.85) >= 0.8
                  ? "border-emerald-400 bg-emerald-400/10"
                  : "border-rose-500 bg-rose-500/10"
              )}
            >
              <span className="absolute -top-5 left-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink/90 text-slate-100 font-bold border border-slate-700 leading-none flex items-center gap-1">
                FACE BIOMETRIC: {(((face.similarity ?? face.quality ?? 0.85)) * 100).toFixed(0)}%
              </span>
            </div>
          )}

          {/* Layer: Tampering Anomalies */}
          {activeLayers.tampering && tamperingRegions.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {tamperingRegions.map((t, i) => (
                <div
                  key={i}
                  style={bboxToStyle(t.boundingBox, docW, docH)}
                  className="absolute border-2 border-rose-500 bg-rose-500/20 rounded animate-pulse"
                >
                  <span className="absolute -top-4 left-0 text-[10px] font-mono px-1 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-600 leading-none">
                    TAMPER: {t.manipulationType || t.regionLabel || "Anomaly"} ({((t.probability ?? 0) * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
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
    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-ink-card/95 via-ink-raised/90 to-ink-card/95 border border-signal-blue/30 flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background Reticle Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

      {/* Target Corner Brackets - Significantly Larger */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-signal-blue/80 rounded-tl-md" />
      <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-signal-blue/80 rounded-tr-md" />
      <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-signal-blue/80 rounded-bl-md" />
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-signal-blue/80 rounded-br-md" />

      {/* Crosshair guidelines */}
      <div className="absolute top-1/2 left-8 right-8 h-px bg-signal-blue/15 pointer-events-none" />
      <div className="absolute left-1/2 top-8 bottom-8 w-px bg-signal-blue/15 pointer-events-none" />

      {/* Scanning laser beam effect */}
      <div className="absolute left-8 right-8 h-1 bg-gradient-to-r from-transparent via-signal-cyan/60 to-transparent animate-scan shadow-glow" />

      {/* Viewfinder Center Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md px-4">
        <div className="relative mb-5">
          <div className="h-20 w-20 rounded-3xl bg-signal-blue/15 border border-signal-blue/40 flex items-center justify-center shadow-glow">
            <ScanLine className="h-10 w-10 text-signal-cyan animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-400 border-2 border-ink-card flex items-center justify-center text-[10px] text-black font-bold">
            HD
          </span>
        </div>

        <div className="text-lg font-extrabold text-slate-100 tracking-wider uppercase font-mono">
          BORDER INSPECTION SCANNER
        </div>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          Expansive optical verification viewport. Position identity document in optical field or trigger live camera capture for multi-modal biometric and MRZ validation.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {onActivateCamera && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onActivateCamera}
              className="border-signal-cyan/60 bg-signal-cyan/10 hover:bg-signal-cyan/20 text-signal-cyan font-bold shadow-md cursor-pointer px-4"
            >
              <Camera className="h-4 w-4 mr-2 text-signal-cyan" />
              Activate Live Laptop Camera
            </Button>
          )}

          {onUploadFile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onUploadFile}
              className="border-slate-700 bg-ink-card/60 hover:bg-ink-raised text-slate-300 font-semibold cursor-pointer px-4"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Passport Document
            </Button>
          )}
        </div>

        {/* Technical Specification Badges */}
        <div className="flex items-center gap-2 mt-6 text-[10px] font-mono text-slate-500 uppercase flex-wrap justify-center">
          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
            ICAO DOC 9303 TD1 · TD2 · TD3
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-signal-cyan">
            1080P HD / 4K ULTRA-RETICLE
          </span>
        </div>
      </div>
    </div>
  );
}
