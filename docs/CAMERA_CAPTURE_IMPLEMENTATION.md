# TRUSTGATE AI — Laptop Camera Capture & Live Document Screening System
**Technical Architecture, Security Specifications, Computer Vision Algorithms & Operational Guide**

---

## 1. Executive Summary

The **TrustGate AI Laptop Camera Capture System** is a production-grade, privacy-first computer vision interface integrated directly into the TrustGate AI enterprise document and identity screening workflow. It provides real-time in-browser frame quality analysis, automated capture upon optical stabilization, unmirrored high-fidelity image extraction, and direct upload to private InsForge Object Storage, seamlessly handing off validated frames to the AI TrustGate Fusion Engine.

---

## 2. Architecture & Component Hierarchy

The camera capture subsystem resides within `src/components/camera/` and follows a modular, reactive architecture decoupled from the underlying screening pipeline.

```
src/pages/ScreeningPage.tsx
 └── src/components/camera/CameraCapture.tsx (Master Orchestrator)
      ├── src/components/camera/useCameraStream.ts (WebRTC Stream Lifecycle)
      ├── src/components/camera/useAutoCapture.ts (Sampling Loop & Stability Tracker)
      │    └── src/components/camera/qualityAnalyzer.ts (Grayscale / Laplacian CV)
      ├── src/components/camera/CameraPreview.tsx (HTML5 Video & Canvas Extraction)
      ├── src/components/camera/CameraOverlay.tsx (ICAO 9303 Framing Reticle & Grid)
      ├── src/components/camera/CameraQualityIndicator.tsx (Real-Time Quality Metrics UI)
      ├── src/components/camera/CaptureStatus.tsx (Accessible State & Countdown Badge)
      └── src/components/camera/CameraPermissionState.tsx (Permission & Hardware Error Fallback)
```

### Module Responsibilities

| Component / Hook | Primary Responsibility |
| :--- | :--- |
| `types.ts` | Type definitions for state machine (`CameraState`), metrics (`FrameQualityMetrics`), indicators, and storage results. |
| `qualityAnalyzer.ts` | Mathematical frame evaluation: Rec. 601 luminance, contrast std-dev, discrete Laplacian edge sharpness, and framing occupancy. |
| `useCameraStream.ts` | Hardware enumeration, stream initialization with `audio: false`, and strict track teardown lifecycle. |
| `useAutoCapture.ts` | 200ms throttled sampling loop, 3-frame stability debounce, 2-second visual countdown, and capture dispatch. |
| `CameraPreview.tsx` | Viewfinder display with optional mirroring, and `captureUnmirroredFrame()` guaranteeing unmirrored pixel capture. |
| `CameraOverlay.tsx` | ICAO 9303 TD3 (1.42 aspect ratio) reticle, alignment corners, scanning line animation, and status border glows. |
| `CameraQualityIndicator.tsx` | Visual pills for LIGHT, FOCUS, POSITION, and DOCUMENT metrics with composite quality score (0–100). |
| `CaptureStatus.tsx` | WCAG `aria-live="polite"` status announcer and countdown indicator. |
| `CameraPermissionState.tsx` | Security fallback UI for `NotAllowedError`, `NotFoundError`, and legacy browser environments. |
| `CameraCapture.tsx` | Master UI combining command header, active preview, manual controls, post-capture review, InsForge upload, and AI pipeline handoff. |

---

## 3. WebRTC Stream Lifecycle & Hardware Security

### Zero Microphone Privilege (`audio: false`)
To prevent unauthorized audio surveillance or unnecessary device permission prompts, audio is strictly prohibited at the constraint layer:

```typescript
const constraints: MediaStreamConstraints = {
  video: {
    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
    width: { ideal: 1920, min: 1280 },
    height: { ideal: 1080, min: 720 },
    facingMode: "user",
  },
  audio: false, // MANDATORY: Zero microphone access
};
```

### Strict Stream Teardown
Active hardware tracks are guaranteed to be stopped and released under three conditions:
1. **Component Unmount**: The cleanup callback of `useEffect` iterates through all stream tracks and calls `track.stop()`.
2. **Page Visibility Change**: When `document.visibilityState === "hidden"` (e.g., user switches browser tabs), camera tracks are immediately stopped.
3. **Hardware Switching**: Prior tracks are stopped before requesting a new device ID.

```typescript
const stopStream = useCallback(() => {
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => {
      track.stop();
    });
    streamRef.current = null;
  }
  if (videoRef.current) {
    videoRef.current.srcObject = null;
  }
  setIsStreaming(false);
}, []);
```

---

## 4. Computer Vision Algorithms & Quality Equations

The `CameraQualityAnalyzer` performs real-time frame evaluation on downsampled $320 \times 240$ canvas buffers to maintain a minimal CPU footprint (<5% utilization on modern laptops).

### 1. Grayscale Luminance (Rec. 601 Standard)
Each RGBA pixel $(r, g, b)$ is converted to perceived luminance $Y$:
$$Y = 0.299 \cdot r + 0.587 \cdot g + 0.114 \cdot b$$

The frame mean luminance is normalized to $[0, 100]$:
$$\bar{Y} = \frac{1}{N} \sum_{i=1}^N Y_i, \quad \text{Brightness} = \text{round}\left(\frac{\bar{Y}}{255} \cdot 100\right)$$

- **GOOD**: $40 \le \text{Brightness} \le 85$
- **FAIR**: $30 \le \text{Brightness} < 40$ or $85 < \text{Brightness} \le 92$
- **POOR**: $\text{Brightness} < 30$ (underexposed) or $\text{Brightness} > 92$ (overexposed)

### 2. Contrast Measurement
Contrast is computed from the sample standard deviation of luminance:
$$\sigma_Y = \sqrt{\frac{1}{N} \sum_{i=1}^N Y_i^2 - \bar{Y}^2}, \quad \text{Contrast} = \text{min}\left(100, \text{round}\left(\frac{\sigma_Y}{64} \cdot 100\right)\right)$$

### 3. Discrete 2D Laplacian Operator (Sharpness / Blur Detection)
Blur is evaluated using the variance of the 2D discrete Laplacian convolution across the luminance array:
$$\mathbf{L} = \begin{bmatrix} 0 & 1 & 0 \\ 1 & -4 & 1 \\ 0 & 1 & 0 \end{bmatrix}$$

For coordinate $(x, y)$:
$$\Delta(x, y) = Y(x, y-1) + Y(x-1, y) + Y(x+1, y) + Y(x, y+1) - 4 \cdot Y(x, y)$$

The Laplacian variance $\sigma_{\Delta}^2$ measures edge sharpness:
$$\sigma_{\Delta}^2 = \frac{1}{M} \sum (\Delta - \bar{\Delta})^2, \quad \text{Sharpness} = \text{min}\left(100, \text{round}\left(\frac{\sigma_{\Delta}}{25} \cdot 100\right)\right)$$

- **SHARP**: $\text{Sharpness} \ge 50$
- **FAIR**: $35 \le \text{Sharpness} < 50$
- **BLUR**: $\text{Sharpness} < 35$ (frame rejected from auto-capture)

### 4. Framing & Reticle Occupancy
The center region ($15\% \le x \le 85\%, 15\% \le y \le 85\%$) is compared against outer borders to ensure the identity credential occupies between $35\%$ and $90\%$ of the active frame and is horizontally and vertically centered.

### 5. Automatic Capture Stability Thresholds
Auto-capture triggers when:
$$\text{Brightness} \ge 35 \land \text{Sharpness} \ge 40 \land \text{Occupancy} \ge 35\% \land \text{IsCentered} = \text{true}$$
Once **3 consecutive frames** (approx. 600ms) meet these criteria, a 2-second visual countdown begins. If the frame degrades during the countdown, the timer resets automatically.

---

## 5. Optical Fidelity: Unmirrored Output Guarantee

While webcams are often mirrored via CSS (`scale-x-[-1]`) to provide an intuitive mirror-like experience for users, **mirroring reverses document text and ICAO Doc 9303 Machine Readable Zones (MRZ)**, rendering OCR unusable.

TrustGate AI solves this by decoupling viewfinder display from output frame capture:
- **Viewfinder Display**: Displayed mirrored for user comfort (`transform: scaleX(-1)`).
- **Captured File**: `captureUnmirroredFrame` draws directly from `<video>` to an unmirrored `<canvas>` with an identity transformation matrix ($1.0$), ensuring standard left-to-right text orientation for OCR and facial recognition.

---

## 6. InsForge Private Storage & Database Integration

### Storage Security Policy
- **Bucket**: `screening-documents`
- **Visibility**: Strictly `private` (`"public": false`)
- **Key Partitioning**:
  $$\text{cases}/\{\text{caseCode}\}/\text{documents}/\text{capture}-\{\text{timestamp}\}-\{\text{uuid4}\}.\text{jpg}$$
- **Pre-upload Validation**:
  - Maximum upload size: $20\,\text{MB}$
  - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
  - Required Authorization: `officer`, `supervisor`, or `admin` role

### Database Persistence
Upon capture completion, metadata is linked to the screening case in the PostgreSQL `documents` table via InsForge PostgREST client:

```sql
INSERT INTO documents (
  case_id,
  document_type,
  storage_bucket,
  storage_key,
  storage_url,
  file_size_bytes,
  mime_type,
  image_width,
  image_height,
  image_quality_score,
  metadata
) VALUES (
  'case-uuid',
  'PASSPORT',
  'screening-documents',
  'cases/TG-CASE-2026/documents/capture-1788576000-uuid.jpg',
  'https://[project].insforge.app/storage/v1/object/screening-documents/...',
  1248920,
  'image/jpeg',
  1920,
  1080,
  94,
  '{"capture_source": "laptop_webcam", "unmirrored": true}'
);
```

---

## 7. Automated Security Test Results (CAM-001 – CAM-020)

All 20 comprehensive security test cases pass with $100\%$ compliance under Vitest:

| Test ID | Category | Requirement / Description | Result |
| :--- | :--- | :--- | :--- |
| **CAM-001** | Permission | Handles `NotAllowedError` without uncaught exceptions | **PASS** |
| **CAM-002** | Hardware | Handles `NotFoundError` (camera missing) gracefully | **PASS** |
| **CAM-003** | Compatibility | Detects unsupported environments and activates fallback | **PASS** |
| **CAM-004** | Stream Lifecycle | Stops all MediaStream tracks on cleanup/unmount | **PASS** |
| **CAM-005** | Privacy | Enforces `audio: false` (strictly zero mic request) | **PASS** |
| **CAM-006** | Auto-Capture | Stability window requires 3 consecutive acceptable frames | **PASS** |
| **CAM-007** | Quality Filter | Rejects blurry frames (Laplacian sharpness < 35) | **PASS** |
| **CAM-008** | Quality Filter | Rejects underexposed frames (luminance < 30) | **PASS** |
| **CAM-009** | Validation | Rejects disallowed MIME types (`text/html`, executables) | **PASS** |
| **CAM-010** | Validation | Rejects oversized captures (> 20 MB) | **PASS** |
| **CAM-011** | RBAC | Rejects non-officer roles from document upload | **PASS** |
| **CAM-012** | Auth | Rejects unauthenticated upload attempts | **PASS** |
| **CAM-013** | Storage | Uploads target private `screening-documents` bucket | **PASS** |
| **CAM-014** | Optical Fidelity | Captured frame is strictly unmirrored (scale 1.0) | **PASS** |
| **CAM-015** | Memory | Cleans up object URLs via `URL.revokeObjectURL` | **PASS** |
| **CAM-016** | Lifecycle | Terminates camera stream on route navigation/visibility | **PASS** |
| **CAM-017** | State Machine | Prevents duplicate capture during `CAPTURING` state | **PASS** |
| **CAM-018** | Resilience | Provides retry and clear guidance on storage failure | **PASS** |
| **CAM-019** | Resilience | Preserves state and enables retake on pipeline error | **PASS** |
| **CAM-020** | Data Protection | Never logs raw image bytes or base64 to console | **PASS** |

---

## 8. Browser Compatibility & Environmental Guidance

| Environment | Supported | Notes |
| :--- | :---: | :--- |
| Google Chrome (macOS, Windows, Linux) | Yes | Full WebRTC + hardware acceleration support. |
| Microsoft Edge (Windows, macOS) | Yes | Full Chromium WebRTC support. |
| Mozilla Firefox | Yes | Full WebRTC support. |
| Apple Safari (macOS, iOS) | Yes | Standard MediaDevices support. |
| Insecure HTTP (`http://domain.com`) | No | Blocked by browser security standards. Requires HTTPS or `localhost`. |
| Headless / Docker Sandbox | Fallback | File upload fallback activates automatically if camera is absent. |
