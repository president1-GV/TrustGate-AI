"""
TRUSTGATE AI — REAL-TIME INFERENCE MICROSERVICE
Endpoints:
- GET  /health
- POST /api/v1/ocr
- POST /api/v1/forensics
- POST /api/v1/deepfake
- POST /api/v1/pipeline
"""

import base64
import io
import time
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image

from ai.paddleocr.engine import PaddleOcrEngine, calculate_sha256
from ai.document_forensics.tampering import DocumentForensicsEngine
from ai.deepfake_detection.detector import DeepfakePresentationAttackDetector

app = FastAPI(
    title="TrustGate AI Forensic Microservice",
    version="1.0.0",
    description="Official PaddleOCR 3.7.0, Document Forensics, and Deepfake Detection Service"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model singletons
ocr_engine = PaddleOcrEngine()
forensics_engine = DocumentForensicsEngine()
deepfake_detector = DeepfakePresentationAttackDetector()

class OcrRequest(BaseModel):
    image_base64: str
    document_id: str
    processing_run_id: str
    image_hash: Optional[str] = None
    capture_source: str = "UPLOAD"
    text_hint: Optional[str] = None

class ForensicsRequest(BaseModel):
    image_base64: str
    document_id: str
    processing_run_id: str
    image_hash: Optional[str] = None
    photo_bbox: Optional[List[int]] = None

class DeepfakeRequest(BaseModel):
    face_base64: str
    document_id: str
    processing_run_id: str
    image_hash: Optional[str] = None
    reference_doc_face_base64: Optional[str] = None

def decode_image(b64_str: str) -> Image.Image:
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    data = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(data)).convert("RGB")

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "TrustGate AI Forensic Engine",
        "paddleocr_version": ocr_engine.version,
        "forensics_version": forensics_engine.version,
        "deepfake_detector": deepfake_detector.version,
        "backend": "ONNX Runtime / AVX2 CPU"
    }

@app.post("/api/v1/ocr")
def process_ocr(req: OcrRequest):
    try:
        img = decode_image(req.image_base64)
        raw_bytes = req.image_base64.encode("utf-8")
        computed_hash = req.image_hash or calculate_sha256(raw_bytes)
        result = ocr_engine.recognize_document(
            image_input=img,
            document_id=req.document_id,
            processing_run_id=req.processing_run_id,
            image_hash=computed_hash,
            capture_source=req.capture_source,
            custom_text_hint=req.text_hint
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/forensics")
def process_forensics(req: ForensicsRequest):
    try:
        img = decode_image(req.image_base64)
        computed_hash = req.image_hash or calculate_sha256(req.image_base64.encode("utf-8"))
        result = forensics_engine.analyze_tampering(
            image_input=img,
            document_id=req.document_id,
            processing_run_id=req.processing_run_id,
            image_hash=computed_hash,
            photo_bbox=req.photo_bbox
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/deepfake")
def process_deepfake(req: DeepfakeRequest):
    try:
        face = decode_image(req.face_base64)
        ref_face = decode_image(req.reference_doc_face_base64) if req.reference_doc_face_base64 else None
        computed_hash = req.image_hash or calculate_sha256(req.face_base64.encode("utf-8"))
        result = deepfake_detector.analyze(
            face_input=face,
            document_id=req.document_id,
            processing_run_id=req.processing_run_id,
            image_hash=computed_hash,
            reference_doc_face=ref_face
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)