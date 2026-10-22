import * as React from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Radio,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Fingerprint,
  AlertTriangle,
  BrainCircuit,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Chapter Interface ─────────────────────────────────────────── */
export interface VideoChapter {
  id: string;
  time: number; // in seconds
  label: string;
  category: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const VIDEO_CHAPTERS: VideoChapter[] = [
  {
    id: "overview",
    time: 0,
    label: "Inspection Initialization",
    category: "01 · CORE ARCHITECTURE",
    desc: "Platform startup, edge pipeline initialization, and device camera stream calibration.",
    icon: ShieldCheck,
  },
  {
    id: "capture",
    time: 75,
    label: "Live Camera & Quality Gate",
    category: "02 · ACQUISITION",
    desc: "Real-time document framing, glare detection, blur suppression, and perspective correction.",
    icon: Eye,
  },
  {
    id: "ocr",
    time: 150,
    label: "Dual-Engine OCR Extraction",
    category: "03 · VISUAL PARSING",
    desc: "PaddleOCR & Tesseract structured extraction for name, DOB, nationality, and expiry.",
    icon: Sliders,
  },
  {
    id: "mrz",
    time: 225,
    label: "ICAO 9303 MRZ Validation",
    category: "04 · CHECKSUM RULES",
    desc: "ISO/ICAO TD1, TD2, TD3 checksum computation and visual cross-field discrepancy checks.",
    icon: Fingerprint,
  },
  {
    id: "tamper",
    time: 300,
    label: "ELA Tampering Forensics",
    category: "05 · PIXEL FORENSICS",
    desc: "Error Level Analysis & JPEG quantization artifact radar detecting photo swaps & edits.",
    icon: AlertTriangle,
  },
  {
    id: "biometrics",
    time: 375,
    label: "128-D Face Verification",
    category: "06 · BIOMETRICS",
    desc: "Calibrated spatial gradient biometric face comparison with pose & quality assessment.",
    icon: BrainCircuit,
  },
  {
    id: "synthesis",
    time: 435,
    label: "TrustFusion Risk Synthesis",
    category: "07 · AUDIT SEAL",
    desc: "Composite 0–100 risk scoring with human-in-the-loop review and SHA-256 audit seal.",
    icon: Lock,
  },
];

/* ─── Helper: Format seconds to MM:SS ────────────────────────────── */
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/* ─── Operational Video Player Component ────────────────────────── */
export function OperationalVideoPlayer() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const progressBarRef = React.useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);
  const [volume, setVolume] = React.useState(1);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(488); // 8m 8s default based on file metadata
  const [bufferedTime, setBufferedTime] = React.useState(0);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);
  const [showScanlines, setShowScanlines] = React.useState(true);
  const [hoverTime, setHoverTime] = React.useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = React.useState<number>(0);
  const [isHoveringSeek, setIsHoveringSeek] = React.useState(false);
  const [videoError, setVideoError] = React.useState(false);
  const [activeChapterIndex, setActiveChapterIndex] = React.useState(0);

  const hideControlsTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-play on mount when visible in viewport
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => {
                // Browser autoplay restrictions handled gracefully
                setIsPlaying(false);
              });
          }
        });
      },
      { threshold: 0.25 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Update active chapter based on currentTime
  React.useEffect(() => {
    let activeIdx = 0;
    for (let i = VIDEO_CHAPTERS.length - 1; i >= 0; i--) {
      if (currentTime >= VIDEO_CHAPTERS[i].time) {
        activeIdx = i;
        break;
      }
    }
    setActiveChapterIndex(activeIdx);
  }, [currentTime]);

  // Fullscreen change listener
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Hide controls on idle mouse
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  // Play / Pause Toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Mute / Unmute Toggle
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.muted = false;
      video.volume = volume > 0 ? volume : 1;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  // Volume Slider Change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVol;
    if (newVol === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  // Seek / Progress Click
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * (duration || 488);
    const video = videoRef.current;
    if (video) {
      video.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Progress Bar Hover Preview
  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hoverX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percentage = hoverX / rect.width;
    const previewTime = percentage * (duration || 488);
    setHoverTime(previewTime);
    setHoverPosition(hoverX);
    setIsHoveringSeek(true);
  };

  const handleProgressMouseLeave = () => {
    setIsHoveringSeek(false);
    setHoverTime(null);
  };

  // Jump to specific chapter
  const handleJumpToChapter = (chapterTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = chapterTime;
    setCurrentTime(chapterTime);
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch((err) => {
        console.warn("Fullscreen request error:", err);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.warn("Exit fullscreen error:", err);
      });
    }
  };

  // Playback Rate Cycle
  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  // Keyboard Shortcuts Handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const video = videoRef.current;
    if (!video) return;

    switch (e.key.toLowerCase()) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlay();
        break;
      case "m":
        e.preventDefault();
        toggleMute();
        break;
      case "f":
        e.preventDefault();
        toggleFullscreen();
        break;
      case "arrowright":
        e.preventDefault();
        video.currentTime = Math.min(duration, video.currentTime + 5);
        break;
      case "arrowleft":
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        break;
    }
  };

  // Progress Percentages
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (bufferedTime / duration) * 100 : 0;

  return (
    <div className="w-full space-y-6">
      {/* ── Main High-Tech Video Console Container ── */}
      <div
        ref={containerRef}
        data-terminal="true"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className={cn(
          "terminal-console relative rounded-2xl sm:rounded-3xl border border-slate-700/80 dark:border-signal-blue/40 bg-slate-950 text-slate-100 shadow-[0_20px_60px_-15px_rgba(2,6,23,0.8)] overflow-hidden group select-none transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-blue",
          isFullscreen ? "fixed inset-0 z-50 rounded-none border-none bg-black" : "w-full"
        )}
      >
        {/* Subtle Ambient Top Illumination */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-signal-blue/80 to-transparent pointer-events-none z-20" />
        
        {/* Cyber Reticle Corner Brackets */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-signal-blue/60 pointer-events-none z-20" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-signal-blue/60 pointer-events-none z-20" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-signal-blue/60 pointer-events-none z-20" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-signal-blue/60 pointer-events-none z-20" />

        {/* ── Top Telemetry HUD Header Bar ── */}
        <div
          className={cn(
            "absolute top-0 inset-x-0 z-30 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent transition-opacity duration-300",
            showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Left: Stream Status & Identifier */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE WALKTHROUGH
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-300">
              <Radio className="h-3 w-3 text-signal-cyan animate-pulse" />
              SYS-DEMO · 1080P 60FPS
            </span>
            <span className="hidden md:inline-block text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800">
              ICAO 9303 / ELA FORENSICS
            </span>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2">
            {/* Quick Unmute Action Badge (If muted, highly visible to invite listening) */}
            {isMuted && (
              <button
                type="button"
                onClick={toggleMute}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-signal-blue/20 hover:bg-signal-blue/30 text-signal-cyan border border-signal-blue/50 transition-all shadow-xs cursor-pointer animate-pulse"
                title="Click to enable demonstration audio"
              >
                <VolumeX className="h-3.5 w-3.5" />
                <span>UNMUTE AUDIO</span>
              </button>
            )}

            {/* Scanline shader toggle */}
            <button
              type="button"
              onClick={() => setShowScanlines(!showScanlines)}
              className={cn(
                "hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-colors cursor-pointer",
                showScanlines
                  ? "bg-slate-800/90 border-signal-blue/40 text-signal-cyan"
                  : "bg-slate-900/60 border-slate-700/60 text-slate-400"
              )}
              title="Toggle HUD Scanline Grid Overlay"
            >
              <Sparkles className="h-3 w-3" />
              <span>HUD {showScanlines ? "ON" : "OFF"}</span>
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ── Video Viewport Area ── */}
        <div
          onClick={togglePlay}
          className={cn(
            "relative w-full cursor-pointer flex items-center justify-center bg-black overflow-hidden",
            isFullscreen ? "h-full" : "aspect-video max-h-[720px]"
          )}
        >
          {/* Native HTML5 Video Element */}
          <video
            ref={videoRef}
            src="/videos/TrustGate-AI-YouTube-Privacy-Redacted-FINAL.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
                if (videoRef.current.buffered.length > 0) {
                  setBufferedTime(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
                }
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                const dur = videoRef.current.duration;
                if (!isNaN(dur) && dur > 0) setDuration(dur);
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => setVideoError(true)}
            className="w-full h-full object-contain"
          >
            {/* Video Source */}
            <source src="/videos/TrustGate-AI-YouTube-Privacy-Redacted-FINAL.mp4" type="video/mp4" />
            Your browser does not support high-definition video playback.
          </video>

          {/* Optional Cyber Scanlines Overlay Effect */}
          {showScanlines && (
            <div
              className="absolute inset-0 pointer-events-none opacity-25 z-10"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(14, 165, 255, 0.05) 50%, rgba(0, 0, 0, 0.4) 50%)",
                backgroundSize: "100% 4px",
              }}
            />
          )}

          {/* Central Play/Pause Pulse Button Overlay (visible on pause or hover) */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 z-20",
              !isPlaying || showControls ? "opacity-100" : "opacity-0"
            )}
          >
            <div
              className={cn(
                "h-16 w-16 sm:h-20 sm:w-20 rounded-full flex items-center justify-center border transition-all duration-300 backdrop-blur-md shadow-2xl",
                !isPlaying
                  ? "bg-signal-blue/20 border-signal-blue text-signal-cyan scale-100 shadow-[0_0_40px_rgba(14,165,255,0.4)]"
                  : "bg-slate-900/60 border-slate-600/60 text-white/80 scale-95 opacity-0 group-hover:opacity-80"
              )}
            >
              {!isPlaying ? (
                <Play className="h-8 w-8 sm:h-9 sm:w-9 ml-1 fill-current" />
              ) : (
                <Pause className="h-8 w-8 sm:h-9 sm:w-9 fill-current" />
              )}
            </div>
          </div>

          {/* Error Banner Fallback (in case video fails to decode) */}
          {videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-center p-6 z-30">
              <AlertTriangle className="h-12 w-12 text-amber-400 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">Video Stream Initializing</h4>
              <p className="text-xs text-slate-400 max-w-md mb-4">
                The demonstration video is loading from local storage. Click retry to reload the stream.
              </p>
              <button
                type="button"
                onClick={() => {
                  setVideoError(false);
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className="px-4 py-2 rounded-lg bg-signal-blue text-white text-xs font-semibold"
              >
                Retry Stream
              </button>
            </div>
          )}
        </div>

        {/* ── Bottom Interactive Control HUD Bar ── */}
        <div
          className={cn(
            "absolute bottom-0 inset-x-0 z-30 px-3 sm:px-6 pt-6 pb-3 sm:pb-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent transition-all duration-300",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          )}
        >
          {/* Interactive Progress Bar & Scrubber */}
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            onMouseMove={handleProgressMouseMove}
            onMouseLeave={handleProgressMouseLeave}
            className="relative h-2 sm:h-2.5 w-full bg-slate-800/80 hover:h-3.5 rounded-full cursor-pointer mb-3.5 transition-all duration-150 group/bar"
          >
            {/* Buffered Progress Fill */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-slate-700/60 rounded-full transition-all"
              style={{ width: `${Math.min(100, bufferPercent)}%` }}
            />

            {/* Current Playback Progress Fill */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-signal-blue to-signal-cyan rounded-full transition-all shadow-[0_0_12px_rgba(14,165,255,0.7)]"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />

            {/* Chapter Milestone Ticks */}
            {VIDEO_CHAPTERS.map((ch) => {
              const chPercent = (ch.time / (duration || 488)) * 100;
              return (
                <div
                  key={ch.id}
                  title={`${ch.label} (${formatTime(ch.time)})`}
                  className="absolute top-0 bottom-0 w-0.5 bg-white/40 hover:bg-white z-10 transition-colors"
                  style={{ left: `${chPercent}%` }}
                />
              );
            })}

            {/* Scrubber Handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -ml-2 h-4 w-4 rounded-full bg-white border-2 border-signal-blue shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `${Math.min(100, progressPercent)}%` }}
            />

            {/* Hover Timestamp Preview Tooltip */}
            {isHoveringSeek && hoverTime !== null && (
              <div
                className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-signal-cyan pointer-events-none shadow-lg z-30"
                style={{ left: `${hoverPosition}px` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Lower Control Buttons Bar */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap text-slate-200">
            {/* Left Controls: Play/Pause, Replay, Timecode */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Play / Pause Toggle Button */}
              <button
                type="button"
                onClick={togglePlay}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-200 hover:text-white transition-colors cursor-pointer"
                title={isPlaying ? "Pause (Space/K)" : "Play (Space/K)"}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5 fill-current" />
                )}
              </button>

              {/* Replay Button */}
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play().catch(() => {});
                  }
                }}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Restart from beginning"
                aria-label="Restart from beginning"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              {/* Volume & Mute Toggle with Hover Slider */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title={isMuted ? "Unmute (M)" : "Mute (M)"}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4 text-rose-400" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-signal-cyan" />
                  )}
                </button>

                <div className="w-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 transition-all duration-200 overflow-hidden flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="h-1.5 w-16 sm:w-20 accent-signal-blue bg-slate-700 rounded-lg cursor-pointer"
                    aria-label="Volume slider"
                  />
                </div>
              </div>

              {/* Monospaced Digital Timecode */}
              <div className="font-mono text-xs text-slate-300 font-semibold tracking-wide ml-1">
                <span className="text-white">{formatTime(currentTime)}</span>
                <span className="text-slate-500 mx-1">/</span>
                <span className="text-slate-400">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Active Stage, Playback Rate, Fullscreen */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Current Active Pipeline Stage Tag */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-signal-cyan">
                <span className="h-1.5 w-1.5 rounded-full bg-signal-cyan animate-pulse" />
                <span>{VIDEO_CHAPTERS[activeChapterIndex]?.label || "Active Screening"}</span>
              </div>

              {/* Speed Multiplier Pill */}
              <button
                type="button"
                onClick={cyclePlaybackRate}
                className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 font-mono text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Cycle playback speed"
                aria-label="Playback speed"
              >
                {playbackRate}x
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Chapter Navigator & System Telemetry ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 dark:bg-cyan-400"></span>
            </span>
            <h3 className="text-xs sm:text-sm font-mono font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Interactive Forensic Milestones (Click to Jump)
            </h3>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border border-slate-700 dark:border-slate-300 text-xs font-mono font-bold shadow-xs">
            <span className="text-cyan-400 dark:text-blue-600 font-extrabold">{VIDEO_CHAPTERS.length}</span>
            <span className="font-bold tracking-wide">Key Screening Chapters</span>
          </div>
        </div>

        {/* Dynamic Chapter Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {VIDEO_CHAPTERS.map((ch, idx) => {
            const isActive = activeChapterIndex === idx;
            const Icon = ch.icon;

            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleJumpToChapter(ch.time)}
                className={cn(
                  "p-3.5 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-xs",
                  isActive
                    ? "bg-blue-50/90 dark:bg-blue-950/60 border-blue-600 dark:border-cyan-400 text-slate-900 dark:text-white shadow-md ring-2 ring-blue-500/20"
                    : "bg-white dark:bg-slate-900/90 border-slate-300 dark:border-slate-800 hover:border-blue-500 dark:hover:border-cyan-400 hover:bg-blue-50/30 dark:hover:bg-slate-800/80 text-slate-900 dark:text-slate-100"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors shadow-2xs",
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-cyan-400 group-hover:bg-blue-50"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-mono font-bold tracking-tight",
                        isActive
                          ? "text-blue-700 dark:text-cyan-300 font-extrabold"
                          : "text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-cyan-400"
                      )}
                    >
                      {ch.category}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border",
                      isActive
                        ? "bg-blue-600 border-blue-600 text-white shadow-xs font-extrabold"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    )}
                  >
                    {formatTime(ch.time)}
                  </span>
                </div>

                <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors mb-1.5 leading-snug">
                  {ch.label}
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed line-clamp-2">
                  {ch.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Operational Telemetry Summary Strip ── */}
      <div className="p-4 rounded-xl border-2 border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm">
            Recorded Live on TrustGate AI Border Screening Node
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold flex-wrap">
          <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-2xs">
            RESOLUTION: <span className="text-blue-600 dark:text-cyan-400">1080P</span>
          </span>
          <span className="hidden sm:inline text-slate-400">•</span>
          <span className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-2xs">
            LATENCY: <span className="text-emerald-600 dark:text-emerald-400">&lt; 5s PER RUN</span>
          </span>
          <span className="hidden sm:inline text-slate-400">•</span>
          <span className="px-2.5 py-1 rounded bg-blue-600 text-white dark:bg-cyan-400 dark:text-slate-950 font-extrabold shadow-2xs">
            100% DEVICE-LOCAL AI
          </span>
        </div>
      </div>
    </div>
  );
}
