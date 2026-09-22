"""
TRUSTGATE AI BILLION — PADDLEOCR MODULE UNIT TESTS
Command: python -m unittest ai.paddleocr.tests
"""

import unittest
import numpy as np
from PIL import Image

from ai.paddleocr.version_metadata import PADDLEOCR_VERSION, METADATA
from ai.paddleocr.preprocessor import DocumentPreprocessor
from ai.paddleocr.confidence_processor import ConfidenceProcessor
from ai.paddleocr.field_extractor import KycFieldExtractor
from ai.paddleocr.ocr_service import PaddleOcrService

class TestPaddleOcrModule(unittest.TestCase):

    def setUp(self):
        self.preprocessor = DocumentPreprocessor()
        self.extractor = KycFieldExtractor()
        self.service = PaddleOcrService()

    def test_01_version_contract(self):
        self.assertEqual(METADATA["version"], "3.7.0")
        self.assertIn("text_detection", METADATA["responsibilities"])
        self.assertIn("deepfake_detection", METADATA["explicit_non_responsibilities"])

    def test_02_preprocessor_quality_assessment(self):
        img = Image.new("RGB", (300, 200), color=(240, 240, 240))
        cv_img = self.preprocessor.to_cv2(img)
        quality = self.preprocessor.assess_quality(cv_img)
        self.assertIn("laplacian_variance", quality)
        self.assertIn("brightness", quality)
        self.assertIn("status", quality)

    def test_03_confidence_processor(self):
        lines = [
            {"text": "REPUBLIC OF INDIA", "confidence": 0.98},
            {"text": "PASSPORT", "confidence": 0.96},
            {"text": "P<INDDOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<", "confidence": 0.99}
        ]
        conf = ConfidenceProcessor.calculate_document_confidence(lines)
        self.assertAlmostEqual(conf["overall_confidence"], (0.98 + 0.96 + 0.99) / 3, places=3)
        self.assertEqual(conf["lines_evaluated"], 3)

    def test_04_aadhaar_field_extraction(self):
        lines = [
            {"text": "Government of India", "confidence": 0.98},
            {"text": "Unique Identification Authority of India", "confidence": 0.99},
            {"text": "Name: Rajesh Kumar Sharma", "confidence": 0.95},
            {"text": "DOB: 15/08/1990", "confidence": 0.97},
            {"text": "Gender: MALE", "confidence": 0.99},
            {"text": "5423 8912 3041", "confidence": 0.96}
        ]
        result = self.extractor.extract_fields(lines)
        self.assertEqual(result["document_type"], "AADHAAR")
        self.assertEqual(result["fields"]["document_number"], "5423 8912 3041")
        self.assertEqual(result["fields"]["gender"], "MALE")
        self.assertEqual(result["fields"]["date_of_birth"], "15/08/1990")

    def test_05_pan_field_extraction(self):
        lines = [
            {"text": "INCOME TAX DEPARTMENT", "confidence": 0.99},
            {"text": "GOVT. OF INDIA", "confidence": 0.98},
            {"text": "Name: PRIYA PATEL", "confidence": 0.96},
            {"text": "Permanent Account Number", "confidence": 0.97},
            {"text": "ABCDE1234F", "confidence": 0.99},
            {"text": "12/04/1985", "confidence": 0.95}
        ]
        result = self.extractor.extract_fields(lines)
        self.assertEqual(result["document_type"], "PAN")
        self.assertEqual(result["fields"]["document_number"], "ABCDE1234F")
        self.assertEqual(result["fields"]["date_of_birth"], "12/04/1985")

    def test_06_passport_field_extraction(self):
        lines = [
            {"text": "PASSPORT", "confidence": 0.99},
            {"text": "REPUBLIC OF INDIA", "confidence": 0.99},
            {"text": "Passport No: Z1234567", "confidence": 0.97},
            {"text": "P<INDSHARMA<<VIKRAM<<<<<<<<<<<<<<<<<<<<<<<<<", "confidence": 0.99},
            {"text": "Z12345678IND8811155M3111142<<<<<<<<<<<<<<<44", "confidence": 0.99}
        ]
        result = self.extractor.extract_fields(lines)
        self.assertEqual(result["document_type"], "PASSPORT")
        self.assertEqual(result["fields"]["passport_number"], "Z1234567")
        self.assertEqual(len(result["fields"]["mrz"]), 2)

    def test_07_ocr_service_output_contract(self):
        img = Image.new("RGB", (400, 200), color=(250, 250, 245))
        res = self.service.process_document(
            image_input=img,
            document_id="DOC-TEST-001",
            processing_run_id="RUN-TEST-001",
            image_hash="hash-12345"
        )
        self.assertIn("document_id", res)
        self.assertIn("processing_run_id", res)
        self.assertIn("image_hash", res)
        self.assertIn("model_id", res)
        self.assertIn("model_version", res)
        self.assertIn("text", res)
        self.assertIn("bounding_boxes", res)
        self.assertIn("confidence", res)
        self.assertIn("timestamp", res)
        self.assertIn("structured_fields", res)

if __name__ == "__main__":
    unittest.main()
