# TRUSTGATE AI — PADDLEOCR & RUNTIME ENVIRONMENT VERSIONS

| Component | Version | Source | License | Role / Backend |
|---|---|---|---|---|
| **Python** | 3.14.3 | Official Python Software Foundation (64-bit) | PSF License | Runtime interpreter |
| **PaddleOCR** | 3.7.0 | Official PaddlePaddle / PaddleOCR Repository | Apache-2.0 | OCR Detection, Recognition & Layout Engine |
| **PaddleX** | 3.7.2 | Official PaddleX Core SDK | Apache-2.0 | PP-OCRv4 / PP-Structure Pipeline Engine |
| **ONNX Runtime** | 1.29.0 | Microsoft ONNX Runtime | MIT | Accelerated Local Neural Inference |
| **OpenCV** | 5.0.0.93 / 4.10.0 | OpenCV Foundation | Apache-2.0 | Computer Vision & Perspective Rectification |
| **NumPy** | 2.3.5 | NumPy Developers | BSD-3-Clause | Tensor & Matrix Calculations |
| **Pillow (PIL)** | 12.3.0 | Python Imaging Library | HPND | Image Decoding & Format Verification |
| **Shapely** | 2.1.2 | Shapely Developers | BSD-3-Clause | DBNet Polygon Expansion & Bounding Box |
| **PyClipper** | 1.4.0 | Clipper Library | Boost-1.0 | Geometric Text Polygon Clipping |
| **FastAPI** | 0.141.1 | Tiangolo / FastAPI | MIT | Forensic Inference Microservice API |
| **Uvicorn** | 0.52.4 | Encode / Uvicorn | BSD-3-Clause | High-Performance ASGI HTTP Server |
| **Pydantic** | 2.13.5 | Pydantic Developers | MIT | Strict JSON Schema & Contract Validation |

## Execution Providers & Hardware Target
- **Primary Inference Provider**: `CPUExecutionProvider` (AVX2 / SSE4.2 SIMD optimized)
- **CUDA Availability**: False (No NVIDIA CUDA GPU detected on screening station; CPU fallback is strictly validated and deterministic)
- **Hardware Architecture**: x86_64 Windows (NT 10.0)

## Third-Party Compliance & Licensing
- **PaddleOCR** is licensed under **Apache License 2.0** by PaddlePaddle Authors.
- It is integrated as an external dependency in `.venv` and wrapped via TRUSTGATE AI structured forensic adapters.
- TRUSTGATE AI claims ownership only over original TRUSTGATE logic, pipelines, forensics, and Trust Fusion implementations.