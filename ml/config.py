"""
TRUSTGATE AI BILLION — ML PIPELINE CONFIGURATION
Central configuration for dataset roots, model checkpoints, and training parameters.

Strict Zero-Mock Policy:
If datasets or weights are missing from DATA_ROOT, pipelines raise DatasetNotFoundError
with actionable download instructions. Never substitute synthetic values or random noise.
"""

import os
from pathlib import Path
from typing import Dict, Any

# Primary Data Root — defaults to C:\TRUSTGATE_DATA on Windows
DATA_ROOT = Path(os.environ.get("DATA_ROOT", r"C:\TRUSTGATE_DATA"))

# Directory Taxonomy
RAW_DIR = DATA_ROOT / "raw"
PROCESSED_DIR = DATA_ROOT / "processed"
SPLITS_DIR = DATA_ROOT / "splits"
MODELS_DIR = DATA_ROOT / "models"
BENCHMARKS_DIR = DATA_ROOT / "benchmarks"
REGISTRY_FILE = MODELS_DIR / "model_registry.json"

# Supported Benchmark Datasets
DATASET_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "midv2020": {
        "name": "MIDV-2020",
        "description": "Synthetic and genuine identity document video dataset (ICAO TD1/TD2/TD3)",
        "expected_subdirs": ["images", "annotations"],
        "min_documents": 10,
    },
    "midv500": {
        "name": "MIDV-500",
        "description": "500 identity document video clips captured on mobile devices",
        "expected_subdirs": ["images", "ground_truth"],
        "min_documents": 50,
    },
    "faceforensics": {
        "name": "FaceForensics++ (c23)",
        "description": "Manipulated and pristine facial video sequences (Deepfakes, Face2Face, FaceSwap, NeuralTextures)",
        "expected_subdirs": ["original_sequences", "manipulated_sequences"],
        "min_sequences": 20,
    },
}

class DatasetNotFoundError(FileNotFoundError):
    """Raised when a required dataset is missing from DATA_ROOT."""
    def __init__(self, dataset_key: str, path: Path):
        schema = DATASET_SCHEMAS.get(dataset_key, {})
        name = schema.get("name", dataset_key)
        msg = (
            f"\n[TRUSTGATE DATA INTEGRITY ERROR] Required dataset '{name}' was not found at:\n"
            f"  {path}\n\n"
            f"Action Required:\n"
            f"1. Create the data directory: mkdir \"{path}\"\n"
            f"2. Download the official {name} benchmark corpus into the directory.\n"
            f"3. Verify SHA-256 checksums before initiating training or evaluation.\n"
            f"4. Set DATA_ROOT environment variable if stored in a non-default location.\n"
            f"\nZero-Mock Policy: TrustGate AI refuses to run training with simulated or synthetic fallback data."
        )
        super().__init__(msg)


def ensure_directories() -> None:
    """Ensures that all required directory paths exist."""
    for d in [RAW_DIR, PROCESSED_DIR, SPLITS_DIR, MODELS_DIR, BENCHMARKS_DIR]:
        d.mkdir(parents=True, exist_ok=True)


def get_dataset_path(dataset_key: str) -> Path:
    """Returns the verified raw dataset path or raises DatasetNotFoundError."""
    path = RAW_DIR / dataset_key
    if not path.exists():
        raise DatasetNotFoundError(dataset_key, path)
    return path
