# TRUSTGATE AI BILLION — MODEL TRAINING SPECIFICATION
**Engine**: PyTorch 2.x / TensorRT  
**Architecture**: TrustGate-FusionNet (Streaming Batch Generator)  
**Memory Constraint**: Generator-based $O(B \times 16)$ buffer limit

---

## 1. Non-Contiguous Streaming Batch Training

Traditional training loads large dataset tensors into RAM, causing out-of-memory (OOM) failures on edge border terminals. TrustGate AI implements non-contiguous streaming batch generators:

1. **Streaming Iterator**: Yields mini-batches of size $B=32$ on-the-fly directly from disk.
2. **Deterministic Augmentation**: Applies random rotation ($\pm 5^\circ$), perspective tilt, and color jitter without expanding disk footprint.
3. **Loss Function**: Multi-task cross-entropy and cosine triplet loss:
   $$\mathcal{L} = \mathcal{L}_{ce}(\hat{y}_{type}, y_{type}) + \lambda_1 \mathcal{L}_{tamper}(\hat{y}_{tamper}, y_{tamper}) + \lambda_2 \mathcal{L}_{triplet}(a, p, n)$$

---

## 2. Training Execution

To execute model training using local GPU or CPU:
```bash
python midv_llm_engine/train.py --epochs 20 --batch-size 32 --lr 1e-4 --data-root "C:\TRUSTGATE_DATA"
```

---

## 3. Checkpointing & Model Registration

Upon training completion, weights are exported and registered with cryptographic artifact hashes in `C:\TRUSTGATE_DATA\models\model_registry.json`:
```python
from ml.registry.model_registry import ModelRegistry

registry = ModelRegistry()
registry.register_model(
    model_name="TrustGate-FusionNet",
    architecture="ResNet-18-MultiTask",
    version="1.2.0",
    task="fusion",
    checkpoint_path=Path("C:/TRUSTGATE_DATA/models/fusion_v120.pt"),
    dataset_name="MIDV-2020",
    dataset_hash="a89f...b2",
    split_hash="41c0...e9",
    metrics={"val_acc": 0.992, "eer": 0.014, "auc_roc": 0.998}
)
```
