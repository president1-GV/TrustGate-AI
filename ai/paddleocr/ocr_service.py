"""
TRUSTGATE AI BILLION — PADDLEOCR PRODUCTION SERVICE
Wraps image preprocessing, DBNet text detection, recognition,
confidence processing, and KYC structured field extraction.
"""

import time
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from PIL import Image
import numpy as np

from ai.paddleocr.version_metadata import PADDLEOCR_VERSION, ENGINE_ID, METADATA
from ai.paddleocr.preprocessor import DocumentPreprocessor
from ai.paddleocr.confidence_processor import ConfidenceProcessor
from ai.paddleocr.field_extractor import KycFieldExtractor
from ai.paddleocr.engine import PaddleOcrEngine

def calculate_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

class PaddleOcrService:
    """Production PaddleOCR Service implementing Section 6 OCR Output Contract."""

    def __init__(self, lang: str = "en"):
        self.engine = PaddleOcrEngine(lang=lang)
        self.preprocessor = DocumentPreprocessor()
        self.confidence_processor = ConfidenceProcessor()
        self.field_extractor = KycFieldExtractor(model_id=ENGINE_ID, model_version=PADDLEOCR_VERSION)
        self.model_id = ENGINE_ID
        self.model_version = PADDLEOCR_VERSION

    def process_document(
        self,
        image_input,
        document_id: str,
        processing_run_id: str,
        image_hash: Optional[str] = None,
        capture_source: str = "UPLOAD",
        document_type_hint: Optional[str] = None
    ) -> Dict[str, Any]:
        """Executes full OCR detection, recognition, confidence scoring, and field extraction."""
        start_time = time.perf_counter()

        # Compute SHA-256 if not provided
        if not image_hash:
            if isinstance(image_input, Image.Image):
                import io
                buf = io.BytesIO()
                image_input.save(buf, format="JPEG")
                computed_hash = calculate_sha256(buf.getvalue())
            elif isinstance(image_input, (bytes, bytearray)):
                computed_hash = calculate_sha256(bytes(image_input))
            else:
                computed_hash = "UNKNOWN_HASH"
        else:
            computed_hash = image_hash

        # Run core recognition
        raw_result = self.engine.recognize_document(
            image_input=image_input,
            document_id=document_id,
            processing_run_id=processing_run_id,
            image_hash=computed_hash,
            capture_source=capture_source
        )

        detected_lines = raw_result.get("lines", [])
        text_content = raw_result.get("text", "")
        bounding_boxes = [l.get("polygon", []) for l in detected_lines]

        # Process confidence
        conf_metrics = self.confidence_processor.calculate_document_confidence(detected_lines)

        # Extract structured KYC fields
        extraction = self.field_extractor.extract_fields(
            text_lines=detected_lines,
            document_type_hint=document_type_hint
        )

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "document_id": document_id,
            "processing_run_id": processing_run_id,
            "image_hash": computed_hash,
            "model_id": self.model_id,
            "model_version": self.model_version,
            "text": text_content,
            "lines_count": len(detected_lines),
            "bounding_boxes": bounding_boxes,
            "confidence": conf_metrics["overall_confidence"],
            "confidence_metrics": conf_metrics,
            "structured_fields": extraction["fields"],
            "field_provenance": extraction["provenance"],
            "document_type_detected": extraction["document_type"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latency_ms": latency_ms,
            "status": "PASS" if len(text_content) > 0 else "WARNING"
        }
