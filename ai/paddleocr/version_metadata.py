"""
TRUSTGATE AI BILLION — PADDLEOCR VERSION & METADATA CONTRACT
"""

PADDLEOCR_VERSION = "3.7.0"
PADDLEX_VERSION = "3.7.2"
ENGINE_ID = "paddleocr-ppocr-v4"
ENGINE_NAME = "PaddleOCR PP-OCRv4 Multi-Lingual Engine"
LICENSE = "Apache-2.0"
FRAMEWORK = "PaddlePaddle / ONNXRuntime 1.29.0"
SUPPORTED_DOCUMENTS = ["AADHAAR", "PAN", "PASSPORT", "VISA", "VOTER_ID"]

METADATA = {
    "model_id": ENGINE_ID,
    "model_name": ENGINE_NAME,
    "version": PADDLEOCR_VERSION,
    "license": LICENSE,
    "framework": FRAMEWORK,
    "supported_documents": SUPPORTED_DOCUMENTS,
    "responsibilities": [
        "text_detection",
        "text_recognition",
        "ocr_confidence",
        "bounding_boxes",
        "structured_field_extraction"
    ],
    "explicit_non_responsibilities": [
        "deepfake_detection",
        "identity_database_authority",
        "fraud_oracle",
        "government_verification_service"
    ]
}
