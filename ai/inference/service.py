"""
TRUSTGATE AI — REAL-TIME INFERENCE MICROSERVICE
Unified Forensic Service hosting:
- GET  /health
- GET  /datasets/catalog
- GET  /model/status
- POST /model/train
- POST /model/predict
- POST /verify
- POST /api/v1/ocr
- POST /api/v1/forensics
- POST /api/v1/deepfake
"""

import uvicorn
from midv_llm_engine.server import app, PORT, start_server

if __name__ == "__main__":
    start_server(port=PORT)