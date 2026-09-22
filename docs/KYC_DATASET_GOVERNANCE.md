# KYC DATASET GOVERNANCE SPECIFICATION — TRUSTGATE AI
**SIH Problem Statement 26188: AI-Based Fake Identity & Document Screening System**
**Effective Date**: September 22, 2026
**Governance Classification**: RESTRICTED INTERNAL TRAINING & BENCHMARK ASSET

---

## 1. Authoritative Governance Principles

> [!CRITICAL]
> **TRAINING DATASETS ARE NOT AUTHORITATIVE IDENTITY DATABASES.**
> 
> Training datasets teach neural network models and OCR processors the visual geometry, text typography, and layout features of Indian identity documents. 
> A training dataset **MUST NEVER** answer the question:
> *"Is this person's identity authentic?"*
> 
> Answering that question requires **authorized real-time cryptographic verification** against an authoritative authority (e.g. UIDAI, NSDL, ECI, Passport Seva, or an authorized PostgreSQL verification ledger). Training or reference samples must never be used as a source of truth for identity authentication.

---

## 2. Dataset Records

### Dataset 1: Uploaded Indian KYC Multi-Class Archive (Primary Training & Benchmark Asset)
- **dataset_id**: `KYC-IND-3000-UPLOADED`
- **dataset_name**: Indian KYC Document Extraction & Classification Dataset (3,000 Specimens)
- **source**: Local Archive (`dataset for SIH26188 (addhar,pan,visa,passport,voter-id).zip`)
- **URL**: Local developer path `C:\Users\VarunHarvard 1\OneDrive\Desktop\dataset for SIH26188 (addhar,pan,visa,passport,voter-id).zip`
- **license**: Research / Evaluation under SIH 26188 Academic Sandbox
- **creator**: SIH26188 Benchmark Contributor / Jwalit
- **version**: 1.0.0
- **download_date**: 2026-09-08 / 2026-09-22
- **image_count**: 3,000 unique JPEG/PNG images
- **class_count**: 5 document classes (600 images per class)
- **document_types**:
  1. `AADHAAR` (600 images): UIDAI layout, 12-digit UID pattern, Government emblem, bilingual headers.
  2. `PAN` (600 images): Income Tax Department layout, 10-character alphanumeric PAN, father's name, DOB.
  3. `PASSPORT` (600 images): Republic of India travel document, ICAO Doc 9303 TD3 2-line MRZ.
  4. `VISA` (600 images): Republic of India entry visa, 8-digit visa number, passport reference, expiry.
  5. `VOTER_ID` (600 images): Election Commission of India (ECI) EPIC card, alphanumeric EPIC ID.
- **privacy_status**: Synthetic / De-identified benchmark images. Contains zero real personally identifiable information (PII). All names and numbers generated via Faker `en_IN`.
- **commercial_use**: Prohibited without explicit government licensing. Restricted to authorized border and document screening research.
- **redistribution**: Prohibited. Excluded from public Git repository via `.gitignore`.
- **training_use**: **APPROVED** for OCR recognition, document classification, and layout segmentation.
- **evaluation_use**: **APPROVED** for disjoint benchmark testing (450 validation + 450 test images).
- **production_use**: **STRICTLY PROHIBITED** as a verification oracle or identity database.
- **notes**: Partitioned into strictly disjoint splits (2,100 Train [70%], 450 Validation [15%], 450 Test [15%]). Cryptographically cataloged with 3,000 unique SHA-256 hashes in `ai/datasets/hashes/kyc_uploaded_sha256.json`.

---

### Dataset 2: Hugging Face Conversational VLM Dataset
- **dataset_id**: `KYC-HF-VLM-3000`
- **dataset_name**: Jwalit/kyc-document-extraction-vlm
- **source**: Hugging Face Hub (`Jwalit/kyc-document-extraction-vlm`)
- **URL**: [https://huggingface.co/datasets/Jwalit/kyc-document-extraction-vlm](https://huggingface.co/datasets/Jwalit/kyc-document-extraction-vlm)
- **license**: Apache 2.0 / Open Data Access for Research
- **creator**: Jwalit
- **version**: `f22400e` (2024–2026)
- **download_date**: 2026-09-22
- **image_count**: 3,000 examples (2,704 train, 296 test)
- **class_count**: 5 classes
- **document_types**: Aadhaar, PAN, Passport, Visa, Voter ID
- **privacy_status**: Synthetically synthesized using PIL and `faker.en_IN`. No biometric or live citizen data.
- **commercial_use**: Permitted under terms of underlying Apache 2.0 research license for non-surveillance applications.
- **redistribution**: Permitted with attribution under Apache 2.0.
- **training_use**: **APPROVED** for VLM conversational reasoning and JSON field extraction ground truth.
- **evaluation_use**: **APPROVED** for field extraction CER/WER benchmarking.
- **production_use**: **STRICTLY PROHIBITED** as live identity data.
- **notes**: Raw parquet files and conversational conversation schemas stored in `ai/datasets/kyc_huggingface/`.

---

## 3. Disjoint Partitioning & Leakage Prevention Protocol

To guarantee zero data contamination and prevent near-duplicate leakage:

$$\text{Train} \cap \text{Validation} = \emptyset, \quad \text{Train} \cap \text{Test} = \emptyset, \quad \text{Validation} \cap \text{Test} = \emptyset$$

1. **Deterministic Hashing**: Every image file has its SHA-256 hash verified. Zero collisions exist across the 3,000 images.
2. **Class Stratification**: Split preserves exact 70% / 15% / 15% ratios within each category:
   - **Train**: 420 Aadhaar, 420 PAN, 420 Passport, 420 Visa, 420 Voter ID (**2,100 total**)
   - **Validation**: 90 Aadhaar, 90 PAN, 90 Passport, 90 Visa, 90 Voter ID (**450 total**)
   - **Test**: 90 Aadhaar, 90 PAN, 90 Passport, 90 Visa, 90 Voter ID (**450 total**)
3. **Physical Partitioning**: Split manifests are serialized in `ai/datasets/manifests/kyc_disjoint_split_manifest.json` and mirrored in segregated directories (`train/`, `validation/`, `test/`).
4. **Air-Gap Separation**: The screening UI and database ingestion modules never read from `ai/datasets/kyc_uploaded/`.
