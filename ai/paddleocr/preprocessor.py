"""
TRUSTGATE AI BILLION — PADDLEOCR IMAGE PREPROCESSOR
Provides adaptive contrast enhancement, CLAHE equalization, deskewing,
and boundary detection prior to text recognition.
"""

import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Dict, Any

class DocumentPreprocessor:
    """Preprocesses input document images for optimal text detection and recognition."""

    def __init__(self, clip_limit: float = 2.0, tile_grid_size: Tuple[int, int] = (8, 8)):
        self.clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)

    def to_cv2(self, image_input) -> np.ndarray:
        """Converts PIL Image or byte array to BGR OpenCV ndarray."""
        if isinstance(image_input, Image.Image):
            rgb = np.array(image_input.convert("RGB"))
            return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        elif isinstance(image_input, np.ndarray):
            return image_input
        else:
            raise TypeError(f"Unsupported image input type: {type(image_input)}")

    def enhance_contrast(self, bgr_img: np.ndarray) -> np.ndarray:
        """Applies CLAHE on luminance channel in LAB color space."""
        lab = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        enhanced_l = self.clahe.apply(l)
        enhanced_lab = cv2.merge([enhanced_l, a, b])
        return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

    def assess_quality(self, bgr_img: np.ndarray) -> Dict[str, Any]:
        """Calculates image sharpness (Laplacian variance) and average brightness."""
        gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        brightness = float(np.mean(gray))

        is_blurry = laplacian_var < 50.0
        is_dark = brightness < 40.0
        is_overexposed = brightness > 230.0

        quality_score = min(100.0, max(0.0, (laplacian_var / 3.0) * 0.5 + (1.0 - abs(brightness - 128) / 128) * 50))

        return {
            "laplacian_variance": round(laplacian_var, 2),
            "brightness": round(brightness, 2),
            "is_blurry": is_blurry,
            "is_dark": is_dark,
            "is_overexposed": is_overexposed,
            "quality_score": round(quality_score, 1),
            "status": "PASS" if not (is_blurry or is_dark or is_overexposed) else "DEGRADED"
        }
