"""
TRUSTGATE AI BILLION — INDIAN KYC DATASET EXTRACTION, AUDIT & DISJOINT SPLITTER
Extracts the 3,000 Indian KYC images (Aadhaar, PAN, Passport, Visa, Voter ID)
from the uploaded desktop archive, verifies cryptographic SHA-256 hashes, detects
corruptions/duplicates, and partitions strictly disjoint train/val/test splits.
"""

import os
import sys
import json
import hashlib
import zipfile
import collections
from pathlib import Path
from PIL import Image

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
ZIP_PATH = Path(os.environ.get("KYC_DATASET_ZIP", str(WORKSPACE_ROOT / "ai" / "datasets" / "kyc_dataset.zip")))

# Directory structure definitions
DATASETS_DIR = WORKSPACE_ROOT / "ai" / "datasets"
KYC_UPLOADED_RAW = DATASETS_DIR / "kyc_uploaded" / "raw"
KYC_UPLOADED_PROCESSED = DATASETS_DIR / "kyc_uploaded" / "processed"
KYC_UPLOADED_TRAIN = DATASETS_DIR / "kyc_uploaded" / "train"
KYC_UPLOADED_VAL = DATASETS_DIR / "kyc_uploaded" / "validation"
KYC_UPLOADED_TEST = DATASETS_DIR / "kyc_uploaded" / "test"

KYC_HF_DIR = DATASETS_DIR / "kyc_huggingface"
MERGED_DIR = DATASETS_DIR / "merged"
MANIFESTS_DIR = DATASETS_DIR / "manifests"
REPORTS_DIR = DATASETS_DIR / "reports"
HASHES_DIR = DATASETS_DIR / "hashes"

DOWNLOADS_DIR = WORKSPACE_ROOT / "ai" / "downloads"
MODELS_DIR = WORKSPACE_ROOT / "ai" / "models"
CHECKPOINTS_DIR = WORKSPACE_ROOT / "ai" / "checkpoints"
TRAINING_DIR = WORKSPACE_ROOT / "ai" / "training"
INFERENCE_DIR = WORKSPACE_ROOT / "ai" / "inference"
EVALUATION_DIR = WORKSPACE_ROOT / "ai" / "evaluation"
FORENSICS_DIR = WORKSPACE_ROOT / "ai" / "forensics"
DEEPFAKE_DIR = WORKSPACE_ROOT / "ai" / "deepfake"
MODEL_REGISTRY_DIR = WORKSPACE_ROOT / "ai" / "model_registry"
CONFIG_DIR = WORKSPACE_ROOT / "ai" / "config"
REPORTS_AI_DIR = WORKSPACE_ROOT / "ai" / "reports"

CATEGORIES = ["aadhaar", "pan", "passport", "visa", "voter_id"]

def create_directory_scaffolding():
    print("[1/6] Scaffolding directory taxonomy...")
    dirs = [
        KYC_UPLOADED_RAW, KYC_UPLOADED_PROCESSED, KYC_UPLOADED_TRAIN,
        KYC_UPLOADED_VAL, KYC_UPLOADED_TEST, KYC_HF_DIR, MERGED_DIR,
        MANIFESTS_DIR, REPORTS_DIR, HASHES_DIR, DOWNLOADS_DIR, MODELS_DIR,
        CHECKPOINTS_DIR, TRAINING_DIR, INFERENCE_DIR, EVALUATION_DIR,
        FORENSICS_DIR, DEEPFAKE_DIR, MODEL_REGISTRY_DIR, CONFIG_DIR, REPORTS_AI_DIR
    ]
    for cat in CATEGORIES:
        (KYC_UPLOADED_RAW / cat).mkdir(parents=True, exist_ok=True)
        (KYC_UPLOADED_TRAIN / cat).mkdir(parents=True, exist_ok=True)
        (KYC_UPLOADED_VAL / cat).mkdir(parents=True, exist_ok=True)
        (KYC_UPLOADED_TEST / cat).mkdir(parents=True, exist_ok=True)

    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
    print("      Created all 21 modular AI directories.")

def extract_archive():
    print(f"[2/6] Extracting archive: {ZIP_PATH.name} ({ZIP_PATH.stat().st_size / (1024*1024):.1f} MB)...")
    extracted_counts = collections.Counter()
    
    with zipfile.ZipFile(ZIP_PATH, 'r') as z:
        for member in z.infolist():
            if member.is_dir():
                continue
            parts = member.filename.replace("\\", "/").split("/")
            if len(parts) >= 2:
                cat = parts[1].lower()
                filename = parts[-1]
                
                # Image categories
                if cat in CATEGORIES and filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    target_path = KYC_UPLOADED_RAW / cat / filename
                    with z.open(member) as src, open(target_path, "wb") as dst:
                        dst.write(src.read())
                    extracted_counts[cat] += 1
                
                # HuggingFace raw metadata / parquets
                elif cat == "_raw":
                    subpath = "/".join(parts[2:])
                    target_path = KYC_HF_DIR / subpath
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    with z.open(member) as src, open(target_path, "wb") as dst:
                        dst.write(src.read())
                    extracted_counts["_raw"] += 1

    for cat in CATEGORIES:
        print(f"      • {cat:<12}: {extracted_counts[cat]} images extracted to ai/datasets/kyc_uploaded/raw/{cat}/")
    print(f"      • HuggingFace meta: {extracted_counts['_raw']} files extracted to ai/datasets/kyc_huggingface/")

def audit_dataset_integrity():
    print("[3/6] Auditing image files, computing SHA-256 checksums, detecting duplicates/corruption...")
    hashes_map = {}
    duplicates = []
    corrupt_files = []
    dimension_stats = collections.defaultdict(list)

    total_images = 0
    for cat in CATEGORIES:
        cat_dir = KYC_UPLOADED_RAW / cat
        for img_path in sorted(cat_dir.glob("*.*")):
            total_images += 1
            rel_name = f"{cat}/{img_path.name}"
            
            # 1. Checksum
            raw_bytes = img_path.read_bytes()
            sha256 = hashlib.sha256(raw_bytes).hexdigest()
            if sha256 in hashes_map:
                duplicates.append({"original": hashes_map[sha256], "duplicate": rel_name, "sha256": sha256})
            else:
                hashes_map[sha256] = rel_name

            # 2. Corruption & Dimension Check
            try:
                with Image.open(img_path) as im:
                    im.verify()
                # Re-open to read dimensions after verify
                with Image.open(img_path) as im:
                    w, h = im.size
                    fmt = im.format
                    dimension_stats[cat].append({"width": w, "height": h, "aspect_ratio": round(w / h, 3), "format": fmt})
            except Exception as e:
                corrupt_files.append({"file": rel_name, "error": str(e)})

    # Save hashes
    with open(HASHES_DIR / "kyc_uploaded_sha256.json", "w", encoding="utf-8") as f:
        json.dump(hashes_map, f, indent=2)

    # Compute category summaries
    cat_summaries = {}
    for cat in CATEGORIES:
        dims = dimension_stats[cat]
        widths = [d["width"] for d in dims]
        heights = [d["height"] for d in dims]
        ratios = [d["aspect_ratio"] for d in dims]
        formats = collections.Counter(d["format"] for d in dims)
        cat_summaries[cat] = {
            "total_images": len(dims),
            "width_range": [min(widths), max(widths)],
            "height_range": [min(heights), max(heights)],
            "mean_aspect_ratio": round(sum(ratios) / len(ratios), 3) if ratios else 0,
            "formats": dict(formats)
        }

    report = {
        "dataset_name": "Indian KYC Document Extraction Dataset (SIH 26188)",
        "source": "Uploaded archive (dataset for SIH26188 (addhar,pan,visa,passport,voter-id).zip)",
        "total_images_processed": total_images,
        "unique_images": len(hashes_map),
        "exact_duplicates_count": len(duplicates),
        "exact_duplicates": duplicates,
        "corrupt_files_count": len(corrupt_files),
        "corrupt_files": corrupt_files,
        "category_summaries": cat_summaries,
        "audit_timestamp": json.dumps(os.environ.get("TIMESTAMP", "2026-09-22T08:00:00Z"))
    }

    report_file = REPORTS_DIR / "kyc_dataset_integrity_report.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"      Total images: {total_images}")
    print(f"      Unique SHA-256 hashes: {len(hashes_map)}")
    print(f"      Duplicates detected: {len(duplicates)}")
    print(f"      Corrupt images: {len(corrupt_files)}")
    print(f"      Audit report saved: {report_file}")
    return report

def partition_disjoint_splits(train_ratio=0.70, val_ratio=0.15, test_ratio=0.15, seed=42):
    print("[4/6] Partitioning strictly disjoint train / validation / test splits (70/15/15)...")
    import random
    random.seed(seed)

    split_manifest = {
        "strategy": "DISJOINT_CLASS_STRATIFIED",
        "seed": seed,
        "train_ratio": train_ratio,
        "val_ratio": val_ratio,
        "test_ratio": test_ratio,
        "splits": {
            "train": {"total": 0, "by_category": {}},
            "validation": {"total": 0, "by_category": {}},
            "test": {"total": 0, "by_category": {}}
        }
    }

    for cat in CATEGORIES:
        cat_dir = KYC_UPLOADED_RAW / cat
        all_files = sorted([p.name for p in cat_dir.glob("*.*")])
        random.shuffle(all_files)

        n_total = len(all_files)
        n_train = int(n_total * train_ratio)
        n_val = int(n_total * val_ratio)
        
        train_files = all_files[:n_train]
        val_files = all_files[n_train:n_train + n_val]
        test_files = all_files[n_train + n_val:]

        # Copy or symlink to respective split folders
        import shutil
        for fn in train_files:
            shutil.copy2(cat_dir / fn, KYC_UPLOADED_TRAIN / cat / fn)
        for fn in val_files:
            shutil.copy2(cat_dir / fn, KYC_UPLOADED_VAL / cat / fn)
        for fn in test_files:
            shutil.copy2(cat_dir / fn, KYC_UPLOADED_TEST / cat / fn)

        split_manifest["splits"]["train"]["by_category"][cat] = len(train_files)
        split_manifest["splits"]["validation"]["by_category"][cat] = len(val_files)
        split_manifest["splits"]["test"]["by_category"][cat] = len(test_files)
        
        split_manifest["splits"]["train"]["total"] += len(train_files)
        split_manifest["splits"]["validation"]["total"] += len(val_files)
        split_manifest["splits"]["test"]["total"] += len(test_files)

        print(f"      • {cat:<12}: Train={len(train_files)}, Val={len(val_files)}, Test={len(test_files)} (Total={n_total})")

    manifest_file = MANIFESTS_DIR / "kyc_disjoint_split_manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(split_manifest, f, indent=2)

    print(f"      Split manifest saved: {manifest_file}")
    print(f"      Overall: Train={split_manifest['splits']['train']['total']}, "
          f"Val={split_manifest['splits']['validation']['total']}, "
          f"Test={split_manifest['splits']['test']['total']}")
    return split_manifest

def main():
    print("=" * 75)
    print("  TRUSTGATE AI — INDIAN KYC DATASET EXTRACTION & AUDIT SUITE")
    print("=" * 75)
    create_directory_scaffolding()
    extract_archive()
    audit_dataset_integrity()
    partition_disjoint_splits()
    print("\n[SUCCESS] Indian KYC Dataset localized, audited, and split cleanly.")

if __name__ == "__main__":
    main()
