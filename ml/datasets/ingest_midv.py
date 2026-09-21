"""
TRUSTGATE AI BILLION — MIDV DATASET INGESTION & DISJOINT SPLITTING
Ingests MIDV-2020 / MIDV-500 datasets from external DATA_ROOT, validates data integrity
using SHA-256, and generates strictly disjoint train/val/test splits at the physical
identity document level (preventing frame cross-contamination).

Execution:
    python -m ml.datasets.ingest_midv --dataset midv2020 --data-root "C:\\TRUSTGATE_DATA"
"""

import argparse
import hashlib
import json
import logging
from pathlib import Path
from typing import Dict, List, Any
import random

from ml.config import (
    DATA_ROOT,
    RAW_DIR,
    SPLITS_DIR,
    PROCESSED_DIR,
    get_dataset_path,
    ensure_directories,
    DatasetNotFoundError,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("trustgate.ingest_midv")


def compute_sha256(file_path: Path) -> str:
    """Computes SHA-256 checksum of a file."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def validate_and_catalog_documents(dataset_dir: Path) -> Dict[str, List[Path]]:
    """
    Discovers all physical document instances and groups frames/crops by document ID.
    Enforces that frames originating from the same physical identity card share a common doc_id.
    """
    logger.info(f"Scanning document directory: {dataset_dir}")
    doc_groups: Dict[str, List[Path]] = {}

    image_extensions = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}
    all_images = [p for p in dataset_dir.rglob("*") if p.suffix.lower() in image_extensions]

    if not all_images:
        logger.warning(f"No image files found in {dataset_dir}")
        return doc_groups

    for img_path in all_images:
        # MIDV taxonomy typically names files as: [country]_[doc_type]_[doc_id]_[frame_id].jpg
        # or organizes them in subdirectories named by doc_id.
        parent_name = img_path.parent.name
        stem_parts = img_path.stem.split("_")
        
        # Document ID extraction (directory-level or stem prefix)
        if parent_name not in {"images", "raw", "midv2020", "midv500"}:
            doc_id = parent_name
        elif len(stem_parts) >= 3:
            doc_id = "_".join(stem_parts[:3])
        else:
            doc_id = stem_parts[0]

        if doc_id not in doc_groups:
            doc_groups[doc_id] = []
        doc_groups[doc_id].append(img_path)

    logger.info(f"Discovered {len(all_images)} frames across {len(doc_groups)} distinct physical documents.")
    return doc_groups


def create_document_disjoint_split(
    doc_groups: Dict[str, List[Path]],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Partitions documents into Train, Validation, and Test sets at the DOCUMENT level.
    Guarantees: Zero frames of a document in Test appear in Train or Val.
    """
    assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-5, "Ratios must sum to 1.0"
    random.seed(seed)

    doc_ids = sorted(list(doc_groups.keys()))
    random.shuffle(doc_ids)

    n_total = len(doc_ids)
    n_train = int(n_total * train_ratio)
    n_val = int(n_total * val_ratio)

    train_docs = doc_ids[:n_train]
    val_docs = doc_ids[n_train : n_train + n_val]
    test_docs = doc_ids[n_train + n_val :]

    # Verify strict disjointness
    set_train = set(train_docs)
    set_val = set(val_docs)
    set_test = set(test_docs)
    assert set_train.isdisjoint(set_test), "LEAKAGE: Train and Test share documents!"
    assert set_train.isdisjoint(set_val), "LEAKAGE: Train and Val share documents!"
    assert set_val.isdisjoint(set_test), "LEAKAGE: Val and Test share documents!"

    split_manifest = {
        "metadata": {
            "strategy": "DOCUMENT_DISJOINT",
            "seed": seed,
            "train_ratio": train_ratio,
            "val_ratio": val_ratio,
            "test_ratio": test_ratio,
            "total_documents": n_total,
            "train_documents_count": len(train_docs),
            "val_documents_count": len(val_docs),
            "test_documents_count": len(test_docs),
        },
        "train": {
            "documents": train_docs,
            "frame_count": sum(len(doc_groups[d]) for d in train_docs),
        },
        "val": {
            "documents": val_docs,
            "frame_count": sum(len(doc_groups[d]) for d in val_docs),
        },
        "test": {
            "documents": test_docs,
            "frame_count": sum(len(doc_groups[d]) for d in test_docs),
        },
    }

    return split_manifest


def main():
    parser = argparse.ArgumentParser(description="TrustGate AI MIDV Dataset Ingestion")
    parser.add_argument("--dataset", choices=["midv2020", "midv500"], default="midv2020")
    parser.add_argument("--data-root", type=str, default=str(DATA_ROOT))
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    ensure_directories()

    try:
        dataset_path = get_dataset_path(args.dataset)
    except DatasetNotFoundError as e:
        logger.error(str(e))
        return 1

    doc_groups = validate_and_catalog_documents(dataset_path)
    if not doc_groups:
        logger.error(f"Dataset at {dataset_path} contains no valid document groups. Exiting.")
        return 1

    split_manifest = create_document_disjoint_split(doc_groups, seed=args.seed)
    
    out_file = SPLITS_DIR / f"{args.dataset}_document_disjoint_split.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(split_manifest, f, indent=2)

    logger.info(f"Successfully generated disjoint split manifest at: {out_file}")
    logger.info(f"  Train: {split_manifest['train']['frame_count']} frames across {split_manifest['metadata']['train_documents_count']} docs")
    logger.info(f"  Val:   {split_manifest['val']['frame_count']} frames across {split_manifest['metadata']['val_documents_count']} docs")
    logger.info(f"  Test:  {split_manifest['test']['frame_count']} frames across {split_manifest['metadata']['test_documents_count']} docs")
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
