# TrustGate AI — Official PaddleOCR 3.7.0 Integration Architecture
**Smart India Hackathon (SIH) Problem Statement 26188**  
**Document**: Technical Integration Guide & Architecture  
**Author**: Principal AI/CV Engineer & Forensic Specialist  
**Status**: ACTIVE PRODUCTION  

---

## 1. Architectural Overview

TrustGate AI incorporates an enterprise-grade document extraction pipeline utilizing official **PaddleOCR 3.7.0** and **PaddleX 3.7.2** with the **PP-OCRv4** architecture. This replaces generic or unverified OCR with a high-throughput, multi-lingual text detection and recognition system capable of processing passports, national ID cards, visas, and driving licenses under complex optical conditions.

```
+-----------------------------------------------------------------------------------+
|                        OFFICER'S CURRENT DOCUMENT CAPTURE                         |
|           (Cryptographically Bound with SHA-256 Hash + Document Provenance)       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
                         +-------------------------------+
                         |   TrustGate OCR Dispatcher    |
                         |   (src/ai/pipeline/03-ocr.ts) |
                         +-------------------------------+
                                         |
                +------------------------+------------------------+
                |                                                 |
                v (Primary / High-Accuracy)                       v (Resilient Client Fallback)
+-------------------------------+               +-----------------------------------+
| Python Local Microservice     |               | In-Browser Tesseract Engine       |
| (http://127.0.0.1:8000/api/ocr)               | (WebAssembly / Client-Side)       |
| - PaddleOCR 3.7.0 Engine      |               | - Offline Resilient Operation     |
| - DBNet Text Detection        |               | - Regex Field Extraction          |
| - SVTR-LCNet / CRNN           |               +-----------------------------------+
| - ICAO Doc 9303 Verification  |
+-------------------------------+
                |
                v
+-----------------------------------------------------------------------------------+
|                              NORMALIZED OCR RESULT                                |
|  - Full Name, DOB, Document Number, Expiry, Nationality, Sex, Authority           |
|  - Bounding Boxes, Exact Confidence Scores, Cryptographic Image Hash Verified     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Technical Specifications & Dependencies

- **Language Runtime**: Python 3.14.3 (`.venv`)
- **Core OCR Framework**: `paddleocr==3.7.0`, `paddlex==3.7.2`
- **Execution Engine**: `onnxruntime==1.29.0` (AVX2 CPU Provider)
- **Image Processing**: `opencv-contrib-python==4.10.0.84`, `pillow==12.3.0`, `shapely==2.1.2`, `pyclipper==1.4.0`
- **License**: Apache License 2.0 (Strict attribution preserved per Section 43)
- **Third-Party Attribution**: PaddlePaddle Authors (Baidu Inc., 2024-2026)

---

## 3. ICAO Doc 9303 Deterministic Check Digit Matrix

PaddleOCR extracts both visual inspection zone (VIZ) text and machine readable zone (MRZ) lines. The MRZ lines are immediately subjected to deterministic modulo 10 check digit verification with the standard `[7, 3, 1]` repeating weight vector:

$$\text{CheckDigit} = \left( \sum_{i=0}^{n-1} c_i \cdot w_{i \pmod 3} \right) \pmod{10}$$

Where character values $c_i$ are mapped:
- `'0'`–`'9'` $\rightarrow 0 - 9$
- `'A'`–`'Z'` $\rightarrow 10 - 35$
- `'<'` $\rightarrow 0$

Check digits are validated for:
1. **Document Number Check Digit** (Line 2, chars 1-10)
2. **Date of Birth Check Digit** (Line 2, chars 14-20)
3. **Date of Expiry Check Digit** (Line 2, chars 22-28)
4. **Composite Check Digit** covering all concatenated data fields.

Any discrepancy triggers an immediate `CRITICAL` finding and sets risk level to `REJECT`.

---

## 4. Current-Document-Only Isolation Guarantee

1. Every OCR execution requires:
   - `document_id`: Unique identifier of the uploaded or captured credential.
   - `processing_run_id`: Unique monotonic run UUID.
   - `image_hash`: SHA-256 hex digest of the raw pixel buffer.
2. If `image_hash` does not match the active document in memory, the execution is terminated with an error, preventing cross-session contamination or stale artifact leakage.
3. No synthetic or cached OCR records are permitted in production screenings.
