# TRUSTGATE AI BILLION — THIRD-PARTY SOFTWARE NOTICES & ATTRIBUTIONS
**Problem Statement**: SIH 26188 (AI-Based Fake Identity & Document Screening System)

TrustGate AI incorporates open-source libraries, neural architectures, and research benchmark corpora under their respective licenses. This document provides formal attribution and statutory notices.

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
- **Component**: High-Performance Cross-Platform ONNX Inference Runtime
- **Authors**: Microsoft Corporation
- **License**: MIT License
- **URL**: `https://github.com/microsoft/onnxruntime`
- **Notice**:
  ```
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the MIT License.
  ```

### OpenCV (Open Source Computer Vision Library)
- **Component**: `cv2` (Morphological filtering, Laplacian operators, CLAHE, FFT analysis)
- **Authors**: OpenCV Foundation
- **License**: Apache License, Version 2.0
- **URL**: `https://opencv.org`

### Pillow (PIL Fork)
- **Component**: Python Imaging Library (Color space conversion, ELA image difference)
- **Authors**: Jeffrey A. Clark (Alex) and contributors
- **License**: Historical Permission Notice and Disclaimer (HPND)
- **URL**: `https://github.com/python-pillow/Pillow`

---

## 2. Backend Infrastructure & BaaS Frameworks

### FastAPI & Uvicorn
- **Component**: Asynchronous Web Framework & ASGI Server
- **Authors**: Sebastián Ramírez and Uvicorn contributors
- **License**: MIT License
- **URL**: `https://fastapi.tiangolo.com`

### InsForge SDK & Platform
- **Component**: Postgres Backend, Auth, Edge Functions, Realtime WebSockets
- **Authors**: InsForge Team
- **License**: MIT License
- **URL**: `https://insforge.dev`

---

## 3. Frontend Application & UI Components

### React & React DOM
- **Component**: Declarative User Interface Framework
- **Authors**: Meta Platforms, Inc. and affiliates
- **License**: MIT License

### Tailwind CSS
- **Component**: Utility-first CSS styling framework (v3.4.17 LTS)
- **Authors**: Tailwind Labs, Inc.
- **License**: MIT License

### Lucide React
- **Component**: Vector Security and Status Icons
- **Authors**: Lucide Project Contributors
- **License**: ISC License

---

## 4. Academic Datasets & Sovereign Specifications

### KYC Document Extraction VLM Dataset
- **Author**: Jwalit Shah
- **Repository**: `https://huggingface.co/datasets/Jwalit/kyc-document-extraction-vlm`
- **License**: Apache License, Version 2.0
- **Statutory Use**: Offline evaluation and synthetic training dataset for Indian document formats (Aadhaar, PAN, Passport, Visa, Voter ID). Strictly prohibited from serving as an identity verification oracle.

### MIDV-2020 & MIDV-500 Benchmarks
- **Authors**: Smart Engines, Federal Research Center "Computer Science and Control" of RAS
- **Statutory Use**: Visual inspection zones, homography tolerance specifications, and geometric aspect ratio reference parameters.

### ICAO Document 9303 (Machine Readable Travel Documents)
- **Authority**: International Civil Aviation Organization (ICAO)
- **Specifications**: Part 3 (Specifications Common to all MRTDs), Part 4 (TD3 Passports), Part 5 (TD1 ID Cards), Part 7 (Machine Readable Visas - MRV-A/B).
- **Checksum Weighting**: Repetitive 7-3-1 weighting scheme modulo 10.
