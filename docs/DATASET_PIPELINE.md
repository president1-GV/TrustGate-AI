# TRUSTGATE AI BILLION — DATASET PIPELINE & EXTERNAL REPO SPECIFICATION
**External Root Directory**: `C:\TRUSTGATE_DATA`  
**Environment Variable**: `DATA_ROOT`  
**Strict Policy**: Zero raw dataset bloat in application git repository.

---

## 1. Directory Structure

All training corpora, ground-truth annotations, and model checkpoints are maintained externally in `C:\TRUSTGATE_DATA` to ensure repository agility, zero git-LFS lock-in, and full auditability:

```
C:\TRUSTGATE_DATA\
├── raw\
│   ├── midv2020\              # Official MIDV-2020 dataset
│   │   ├── images\
│   │   └── annotations\
│   ├── midv500\               # Official MIDV-500 dataset
│   │   ├── images\
│   │   └── ground_truth\
│   └── faceforensics\          # FaceForensics++ (c23 compression)
│       ├── original_sequences\
│       └── manipulated_sequences\
├── processed\                  # Normalized crops & precomputed embeddings
├── splits\                     # Document-level disjoint split manifests (*.json)
├── models\                     # Exported PyTorch/ONNX checkpoints
│   └── model_registry.json    # Cryptographic registry ledger
└── benchmarks\                 # Offline evaluation test sets
```

---

## 2. Ingestion & Verification

The ingestion engine (`ml/datasets/ingest_midv.py`) validates folder hierarchy and computes SHA-256 digests for all files:
```bash
python -m ml.datasets.ingest_midv --dataset midv2020 --data-root "C:\TRUSTGATE_DATA"
```

### Zero-Mock Policy
If `C:\TRUSTGATE_DATA\raw\midv2020` does not exist, the script raises an informative `DatasetNotFoundError` instructing the operator how to provision the data. It never generates synthetic fake documents.

---

## 3. Document-Level Disjoint Splitting

A major cause of data leakage in computer vision is frame cross-contamination, where video frames of the same physical document appear in both training and test sets.

TrustGate AI enforces **Physical Document-Level Disjointness**:
- All frames originating from physical document identity $D_i$ are assigned exclusively to either Train ($70\%$), Validation ($15\%$), or Test ($15\%$).
- The split generator evaluates:
  $$\text{TrainDocs} \cap \text{TestDocs} = \emptyset, \quad \text{TrainDocs} \cap \text{ValDocs} = \emptyset$$
- The resulting manifest is written to `C:\TRUSTGATE_DATA\splits\midv2020_document_disjoint_split.json`.
