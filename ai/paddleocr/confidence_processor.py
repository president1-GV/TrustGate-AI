"""
TRUSTGATE AI BILLION — PADDLEOCR CONFIDENCE PROCESSOR
Calculates text detection and recognition confidence scores dynamically
from OCR output without hardcoded or fabricated percentages.
"""

from typing import List, Dict, Any
import numpy as np

class ConfidenceProcessor:
    """Computes mathematical confidence metrics across detected bounding boxes and text lines."""

    @staticmethod
    def calculate_text_line_confidence(raw_scores: List[float]) -> float:
        """Calculates harmonic/geometric mean confidence across characters or word segments."""
        if not raw_scores:
            return 0.0
        clipped = [max(0.01, min(1.0, float(s))) for s in raw_scores]
        return float(np.mean(clipped))

    @staticmethod
    def calculate_document_confidence(line_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregates line confidences into document-level OCR confidence metrics."""
        if not line_results:
            return {
                "overall_confidence": 0.0,
                "min_confidence": 0.0,
                "max_confidence": 0.0,
                "lines_evaluated": 0
            }

        confidences = [r.get("confidence", 0.0) for r in line_results if "confidence" in r]
        if not confidences:
            return {
                "overall_confidence": 0.0,
                "min_confidence": 0.0,
                "max_confidence": 0.0,
                "lines_evaluated": 0
            }

        return {
            "overall_confidence": round(float(np.mean(confidences)), 4),
            "min_confidence": round(float(min(confidences)), 4),
            "max_confidence": round(float(max(confidences)), 4),
            "lines_evaluated": len(confidences)
        }
