# TRUSTGATE AI — THIRD-PARTY SOFTWARE NOTICES & ATTRIBUTIONS

TRUSTGATE AI incorporates open-source libraries, neural frameworks, and research benchmark corpora under their respective licenses. This document provides formal attribution and statutory notices pursuant to their licensing requirements.

TRUSTGATE AI is proprietary software. The proprietary license applies solely to original TRUSTGATE AI intellectual property and software. **NO OWNERSHIP IS CLAIMED OVER ANY THIRD-PARTY MATERIALS, MODELS, SOFTWARE LIBRARIES, OR DATASETS IDENTIFIED BELOW.**

---

## 1. Deep Learning, Computer Vision & OCR Engines

### PaddleOCR & PaddleX
- **Component**: PP-OCRv6 Text Detection, Text Recognition, Orientation & Angle Classification
- **Authors**: PaddlePaddle Authors, Baidu, Inc.
- **License**: Apache License, Version 2.0
- **URL**: `https://github.com/PaddlePaddle/PaddleOCR`
- **Notice**:
  ```
  Copyright (c) 2020-2026 PaddlePaddle Authors. All Rights Reserved.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  ```

### ONNX Runtime
- **Component**: Cross-Platform ONNX Inference Engine (`onnxruntime`)
- **Authors**: Microsoft Corporation
- **License**: MIT License
- **URL**: `https://github.com/microsoft/onnxruntime`
- **Notice**:
  ```
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the MIT License.
  ```

### OpenCV
- **Component**: `cv2` (Morphological filtering, Laplacian operators, CLAHE, FFT analysis)
- **Authors**: OpenCV Foundation
- **License**: Apache License, Version 2.0
- **URL**: `https://opencv.org`

### Pillow (PIL Fork)
- **Component**: Python Imaging Library (`PIL`)
- **Authors**: Jeffrey A. Clark (Alex) and contributors
- **License**: Historical Permission Notice and Disclaimer (HPND)
- **URL**: `https://github.com/python-pillow/Pillow`

---

## 2. Backend Infrastructure & Microservices

### FastAPI & Uvicorn
- **Component**: Asynchronous Web Framework & ASGI Server
- **Authors**: Sebastián Ramírez and Uvicorn contributors
- **License**: MIT License
- **URL**: `https://fastapi.tiangolo.com`

### InsForge SDK & PostgreSQL Client
- **Component**: Postgres BaaS, Authentication, Edge Functions, Realtime WebSockets (`@insforge/sdk`)
- **Authors**: InsForge Team
- **License**: MIT License
- **URL**: `https://insforge.dev`

---

## 3. Frontend Application & UI Framework

### React & React DOM
- **Component**: Core UI Component Library (v18.3)
- **Authors**: Meta Platforms, Inc. and affiliates
- **License**: MIT License
- **URL**: `https://react.dev`

### Tailwind CSS
- **Component**: Utility-First CSS Framework (v3.4 LTS)
- **Authors**: Tailwind Labs, Inc.
- **License**: MIT License
- **URL**: `https://tailwindcss.com`

### Lucide React
- **Component**: Vector Security and Status Icons
- **Authors**: Lucide Project Contributors
- **License**: ISC License
- **URL**: `https://lucide.dev`

### TanStack React Query
- **Component**: Asynchronous State Management & Caching (`@tanstack/react-query`)
- **Authors**: Tanner Linsley and contributors
- **License**: MIT License
- **URL**: `https://tanstack.com/query`

### Zustand
- **Component**: Minimal Client State Management
- **Authors**: Paul Henschel and Zustand contributors
- **License**: MIT License
- **URL**: `https://github.com/pmndrs/zustand`

---

## 4. Academic Datasets & International Standards

### KYC Document Extraction VLM Dataset
- **Author**: Jwalit Shah
- **Repository**: `https://huggingface.co/datasets/Jwalit/kyc-document-extraction-vlm`
- **License**: Apache License, Version 2.0
- **Use Scope**: Academic benchmark and offline training evaluation corpus for Indian identity formats (Aadhaar, PAN, Passport, Visa, Voter ID). Strictly separated from production verification.

### MIDV-2020 & MIDV-500 Benchmarks
- **Authors**: Smart Engines, Federal Research Center "Computer Science and Control" of RAS
- **License**: CC BY 4.0 / Research Dataset Agreement
- **Use Scope**: Document geometry, aspect ratio calibration, and visual inspection benchmarks.

### ICAO Document 9303 (Machine Readable Travel Documents)
- **Authority**: International Civil Aviation Organization (ICAO)
- **Specifications**: Part 3 (Specifications Common to all MRTDs), Part 4 (TD3 Passports), Part 5 (TD1 ID Cards), Part 7 (Machine Readable Visas - MRV-A/B).
- **Checksum Calculation**: Standard repetitive 7-3-1 weighting scheme modulo 10.
