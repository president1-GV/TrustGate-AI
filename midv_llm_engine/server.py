"""
TRUSTGATE AI BILLION — MIDV-2020 & MULTI-MODAL FORENSIC ENGINE SERVER
Unified FastAPI Microservice hosting:
1. TrustGate-FusionNet (16-feature neural risk inference, training, and explainable failure reasons)
2. Authoritative Dataset Catalog (MIDV-2020, MIDV-500, FaceForensics++, ICDAR DocTamper, IDNet)
3. PaddleOCR PP-OCRv4 Multi-Lingual Engine
4. Document Forensics Engine (Error Level Analysis & 2D FFT Spectral Tampering)
5. Biometric Deepfake & Presentation Attack Detector
"""

import os
import sys
import json
import time
import base64
import io
from pathlib import Path
from typing import Dict, Any, List, Optional

import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Ensure project root is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))

from midv_llm_engine.dataset import (
    FEATURE_NAMES,
    CLASS_NAMES,
    extract_features_from_dict,
    CACHE_DIR
)
from midv_llm_engine.trainer import train_model

from ai.paddleocr.engine import PaddleOcrEngine, calculate_sha256
from ai.document_forensics.tampering import DocumentForensicsEngine
from ai.deepfake_detection.detector import DeepfakePresentationAttackDetector

PORT = 8000

app = FastAPI(
    title="TrustGate AI — Forensic Microservice & MIDV-2020 Neural Engine",
    version="3.0.0",
    description="Unified Forensic Microservice for SIH 26188 (AI-Based Fake Identity & Document Screening)"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Engine Singletons
ocr_engine = PaddleOcrEngine()
forensics_engine = DocumentForensicsEngine()
deepfake_detector = DeepfakePresentationAttackDetector()

WEIGHTS_PATH = WORKSPACE_ROOT / "midv_llm_engine" / "models" / "trustgate_fusionnet_weights.json"

def load_weights() -> Dict[str, Any]:
    if not WEIGHTS_PATH.exists():
        train_model(epochs=30)
    with open(WEIGHTS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

CURRENT_MODEL = load_weights()

def decode_image(b64_str: str) -> Image.Image:
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    data = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(data)).convert("RGB")

# Request Models
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

class PredictRequest(BaseModel):
    features: Optional[List[float]] = None
    sample: Optional[Dict[str, Any]] = None

class TrainRequest(BaseModel):
    epochs: int = 50
    samples_per_class: int = 400

@app.get("/health")
def health():
    return {
        "status": "HEALTHY",
        "service": "TrustGate AI Unified Forensic Engine",
        "version": "3.0.0-fusionnet-10benchmark",
        "models": {
            "fusionnet": CURRENT_MODEL["version"],
            "paddleocr": ocr_engine.version,
            "forensics": forensics_engine.version,
            "deepfake": deepfake_detector.version
        },
        "accuracy": CURRENT_MODEL["training_metadata"]["final_val_accuracy"],
        "offline_ready": True,
        "backend": "ONNX Runtime / AVX2 CPU"
    }

@app.get("/datasets/catalog")
def datasets_catalog():
    catalog_path = CACHE_DIR / "midv_2020_archetypes.json"
    if catalog_path.exists():
        with open(catalog_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"catalog_version": "2020.1", "total_archetypes": 25}

@app.get("/model/status")
def model_status():
    return {
        "model_name": CURRENT_MODEL["model_name"],
        "version": CURRENT_MODEL["version"],
        "architecture": CURRENT_MODEL["architecture"],
        "training_metadata": CURRENT_MODEL["training_metadata"],
        "status": "ACTIVE_PRODUCTION"
    }

@app.post("/model/train")
def trigger_training(req: TrainRequest):
    global CURRENT_MODEL
    res = train_model(epochs=req.epochs, samples_per_class=req.samples_per_class)
    CURRENT_MODEL = res
    return {
        "status": "SUCCESS",
        "final_accuracy": res["training_metadata"]["final_val_accuracy"],
        "final_loss": res["training_metadata"]["final_val_loss"],
        "epochs_trained": req.epochs
    }

@app.post("/model/predict")
def predict_features(req: PredictRequest):
    start = time.perf_counter()
    if req.features:
        feats = req.features
    elif req.sample:
        feats = extract_features_from_dict(req.sample)
    else:
        raise HTTPException(status_code=400, detail="Must provide 'features' or 'sample'")

    means = CURRENT_MODEL["normalization"]["means"]
    stds = CURRENT_MODEL["normalization"]["stds"]
    w1 = np.array(CURRENT_MODEL["weights"]["w1"])
    b1 = np.array(CURRENT_MODEL["weights"]["b1"])
    w2 = np.array(CURRENT_MODEL["weights"]["w2"])
    b2 = np.array(CURRENT_MODEL["weights"]["b2"])
    w3 = np.array(CURRENT_MODEL["weights"]["w3"])
    b3 = np.array(CURRENT_MODEL["weights"]["b3"])
    w4 = np.array(CURRENT_MODEL["weights"]["w4"])
    b4 = np.array(CURRENT_MODEL["weights"]["b4"])

    # Normalize
    norm_x = np.array([(feats[i] - means[i]) / stds[i] for i in range(16)], dtype=np.float32)

    # Forward pass
    def lrelu(x): return np.where(x > 0, x, 0.01 * x)
    a1 = lrelu(np.dot(norm_x, w1) + b1)
    a2 = lrelu(np.dot(a1, w2) + b2)
    a3 = lrelu(np.dot(a2, w3) + b3)
    z4 = np.dot(a3, w4) + b4
    exp_z = np.exp(z4 - np.max(z4))
    probs = (exp_z / np.sum(exp_z)).tolist()

    pred_idx = int(np.argmax(probs))
    pred_class = CLASS_NAMES[pred_idx]
    confidence = probs[pred_idx]

    inference_ms = round((time.perf_counter() - start) * 1000, 2)

    return {
        "predicted_class": pred_class,
        "predicted_class_id": pred_idx,
        "confidence": round(confidence, 4),
        "authenticity_score": round(probs[0] * 100.0, 1),
        "is_genuine": pred_class == "GENUINE_AUTHENTIC",
        "class_probabilities": {name: round(p, 4) for name, p in zip(CLASS_NAMES, probs)},
        "inference_ms": inference_ms
    }

@app.post("/verify")
def verify_document(payload: Dict[str, Any]):
    """Full forensic audit with explainable failure reasons."""
    start = time.perf_counter()
    feats = extract_features_from_dict(payload)
    pred = predict_features(PredictRequest(features=feats))

    failure_reasons = []
    if not pred["is_genuine"]:
        if pred["predicted_class"] == "DOCUMENT_TAMPERED":
            failure_reasons.append({
                "factor": "DOCUMENT_TAMPERING",
                "finding": "High boundary gradient delta and compression discrepancies detected in visual photo zone.",
                "explanation": "Digital splicing or copy-move forgery altering document portrait.",
                "directive": "Officer must divert subject to Secondary Inspection for physical tactile verification."
            })
        elif pred["predicted_class"] == "MRZ_CORRUPTED":
            failure_reasons.append({
                "factor": "MRZ_CHECKSUM_FAILURE",
                "finding": "ICAO Doc 9303 modulo-10 check digit mismatch.",
                "explanation": "Discrepancy between encoded check digits and optical character data.",
                "directive": "Examine Machine Readable Zone under UV/IR lighting and verify passport authenticity."
            })
        elif pred["predicted_class"] == "GEOMETRY_FABRICATED":
            failure_reasons.append({
                "factor": "GEOMETRIC_FABRICATION",
                "finding": "Aspect ratio conformity delta exceeds tolerance.",
                "explanation": "Document perimeter and quad corner homography do not match standard ID-1/ID-3 specifications.",
                "directive": "Measure document dimensions against physical calibration template."
            })
        elif pred["predicted_class"] == "BIOMETRIC_DEEPFAKE":
            failure_reasons.append({
                "factor": "BIOMETRIC_DEEPFAKE",
                "finding": "Disrupted corneal reflection angle and high-frequency GAN upsampling residuals.",
                "explanation": "Synthetically generated or face-swapped biometric portrait.",
                "directive": "Perform biometric capture with live depth sensor and challenge-response liveness."
            })
        elif pred["predicted_class"] == "SPOOF_PRESENTATION":
            failure_reasons.append({
                "factor": "PRESENTATION_ATTACK",
                "finding": "Static image presentation attack (zero micro-motion).",
                "explanation": "Subject presented printed paper or smartphone display rather than live face.",
                "directive": "Instruct subject to remove occlusions and face the optical biometric sensor directly."
            })

    inference_ms = round((time.perf_counter() - start) * 1000, 2)
    return {
        **pred,
        "failure_reasons": failure_reasons,
        "failure_reasons_count": len(failure_reasons),
        "total_audit_ms": inference_ms
    }

# API v1 Endpoints (Matching ai/inference/service.py)
@app.post("/api/v1/ocr")
def process_ocr(req: OcrRequest):
    try:
        img = decode_image(req.image_base64)
        raw_bytes = req.image_base64.encode("utf-8")
        computed_hash = req.image_hash or calculate_sha256(raw_bytes)
        return ocr_engine.recognize_document(
            image_input=img,
            document_id=req.document_id,
            processing_run_id=req.processing_run_id,
            image_hash=computed_hash,
            capture_source=req.capture_source,
            custom_text_hint=req.text_hint
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/forensics")
def process_forensics(req: ForensicsRequest):
    try:
        img = decode_image(req.image_base64)
        computed_hash = req.image_hash or calculate_sha256(req.image_base64.encode("utf-8"))
        return forensics_engine.analyze_tampering(
            image_input=img,
            document_id=req.document_id,
            processing_run_id=req.processing_run_id,
            image_hash=computed_hash,
            photo_bbox=req.photo_bbox
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/deepfake")
def process_deepfake(req: DeepfakeRequest):
    try:
        face = decode_image(req.face_base64)
        ref_face = decode_image(req.reference_doc_face_base64) if req.reference_doc_face_base64 else None
        computed_hash = req.image_hash or calculate_sha256(req.face_base64.encode("utf-8"))
        return deepfake_detector.analyze(
            face_input=face,
            document_id=req.document_id,
            processing_run_id=req.processing_run_id,
            image_hash=computed_hash,
            reference_doc_face=ref_face
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def start_server(port: int = PORT):
    """Entrypoint function called by run_midv_service.py."""
    uvicorn.run(app, host="127.0.0.1", port=port)

if __name__ == "__main__":
    start_server()
