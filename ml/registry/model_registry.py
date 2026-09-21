"""
TRUSTGATE AI BILLION — MODEL REGISTRY & ARTIFACT ATTESTATION
Tracks trained neural network models, architectures, training dataset hashes,
split hashes, and operational metrics (FAR, FRR, EER, AUC-ROC).
"""

import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional

from ml.config import REGISTRY_FILE, MODELS_DIR, ensure_directories


def compute_file_hash(file_path: Path) -> str:
    """Computes SHA-256 checksum for a model checkpoint artifact."""
    if not file_path.exists():
        return "ARTIFACT_NOT_FOUND"
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


class ModelRegistry:
    """Manages the registration and provenance of trained TrustGate AI models."""

    def __init__(self, registry_path: Path = REGISTRY_FILE):
        self.registry_path = registry_path
        self._ensure_loaded()

    def _ensure_loaded(self):
        ensure_directories()
        if not self.registry_path.exists():
            self.catalog: Dict[str, Any] = {
                "schema_version": "2.0.0",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "models": {},
            }
            self._save()
        else:
            with open(self.registry_path, "r", encoding="utf-8") as f:
                self.catalog = json.load(f)

    def _save(self):
        self.catalog["updated_at"] = datetime.now(timezone.utc).isoformat()
        with open(self.registry_path, "w", encoding="utf-8") as f:
            json.dump(self.catalog, f, indent=2)

    def register_model(
        self,
        model_name: str,
        architecture: str,
        version: str,
        task: str,
        checkpoint_path: Path,
        dataset_name: str,
        dataset_hash: str,
        split_hash: str,
        metrics: Dict[str, float],
        parameters_count: Optional[int] = None,
        author: str = "TRUSTGATE_AI_MLOPS",
    ) -> Dict[str, Any]:
        """
        Registers a trained model checkpoint with cryptographic artifact hash
        and provenance link to training data.
        """
        artifact_hash = compute_file_hash(checkpoint_path)

        entry = {
            "model_name": model_name,
            "architecture": architecture,
            "version": version,
            "task": task,
            "artifact_path": str(checkpoint_path),
            "artifact_sha256": artifact_hash,
            "dataset": {
                "name": dataset_name,
                "dataset_sha256": dataset_hash,
                "split_sha256": split_hash,
            },
            "metrics": metrics,
            "parameters_count": parameters_count,
            "author": author,
            "registered_at": datetime.now(timezone.utc).isoformat(),
        }

        key = f"{model_name}:{version}"
        self.catalog["models"][key] = entry
        self._save()
        return entry

    def get_model(self, model_name: str, version: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Retrieves model metadata by name and optional version."""
        if version:
            return self.catalog["models"].get(f"{model_name}:{version}")
        # Return latest version matching model_name
        matching = [v for k, v in self.catalog["models"].items() if v["model_name"] == model_name]
        return matching[-1] if matching else None

    def list_models(self) -> List[Dict[str, Any]]:
        """Lists all registered models."""
        return list(self.catalog["models"].values())


if __name__ == "__main__":
    registry = ModelRegistry()
    print(f"TrustGate Model Registry initialized at: {registry.registry_path}")
    print(f"Total registered models: {len(registry.list_models())}")
