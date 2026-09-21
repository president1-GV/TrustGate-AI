# TrustGate AI — Multi-Modal Bayesian Trust Fusion Engine
**Smart India Hackathon (SIH 26188)**  
**Document**: Trust Fusion Mathematics & Decision Logic  
**Status**: ACTIVE PRODUCTION  

---

## 1. Mathematical Foundation

The TrustGate Trust Fusion Engine synthesizes independent evidence streams into an aggregate holistic risk score $\mathcal{R} \in [0, 100]$ and actionable operational decision $\mathcal{D} \in \{\text{ALLOW}, \text{MANUAL\_REVIEW}, \text{REJECT}\}$.

### Multi-Modal Weighted Evidence Aggregation

$$\mathcal{R}_{\text{base}} = \sum_{k=1}^{K} w_k \cdot r_k$$

Where the weights $w_k$ and evidence components $r_k$ are calibrated as follows:

| Component $k$ | Evidence Description | Weight $w_k$ | Anomaly Trigger ($r_k \to 100$) |
| :--- | :--- | :--- | :--- |
| **$r_1$ Optical Quality** | Laplacian Sharpness, Glare, Contrast | $0.10$ | Blurry / glare > 40% area |
| **$r_2$ Document Geometry** | Perspective, Aspect Ratio, Boundaries | $0.15$ | Warped edge / non-standard aspect |
| **$r_3$ PaddleOCR Confidence** | Character & Field Extraction Likelihood | $0.20$ | Confidence < 0.60 |
| **$r_4$ MRZ Check Digits** | ICAO 9303 Modulo 10 Check Digits | $0.20$ | Any check digit mismatch |
| **$r_5$ Tamper Forensics** | ELA, 2D FFT, Noise Variance Discrepancy| $0.15$ | Spliced photo / text replacement |
| **$r_6$ Biometric & Liveness**| Facial Cosine Match & Replay Moiré | $0.10$ | Replay attack or deepfake smoothing |
| **$r_7$ Database Watchlist** | Authorized PostgreSQL Sanctions Registry| $0.10$ | Active Interpol / Sanctions hit |

---

## 2. Deterministic Override Hierarchy

While Bayesian probabilistic weighting operates continuously, high-severity security triggers enforce immediate deterministic overrides:

1. **Watchlist / Sanctions Hit**:
   - Condition: Active match in PostgreSQL `watchlists` (Interpol Red Notice, Stolen Document).
   - Action: Immediate $\mathcal{D} = \text{REJECT}$, $\mathcal{R} = 98.0$.

2. **ICAO 9303 Check Digit Failure**:
   - Condition: Recalculated 7-3-1 modulo 10 check digit does not match printed MRZ digit.
   - Action: Immediate $\mathcal{D} = \text{REJECT}$, $\mathcal{R} = 88.0$.

3. **High-Confidence Physical Tampering**:
   - Condition: ELA delta $> 35$ or local noise variance ratio $> 0.55$.
   - Action: Immediate $\mathcal{D} = \text{REJECT}$, $\mathcal{R} = 85.0$.

4. **Presentation / Deepfake Attack**:
   - Condition: Screen replay moiré ratio $> 5.5\times$ or abnormal smoothing.
   - Action: Immediate $\mathcal{D} = \text{REJECT}$, $\mathcal{R} = 82.0$.

5. **Optical Degradation Precedence**:
   - Condition: Document capture blur / glare score $< 60.0$ without adversarial tampering.
   - Action: $\mathcal{D} = \text{MANUAL\_REVIEW}$, $\mathcal{R} = 52.0$ (Routing to officer inspection).

6. **All Checks Verified**:
   - Condition: Authentic credentials, check digits validated, pristine forensics, no DB hit.
   - Action: $\mathcal{D} = \text{ALLOW}$, $\mathcal{R} \le 15.0$.
