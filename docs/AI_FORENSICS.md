# TrustGate AI — Document Forensics & Deepfake Detection Engine
**National Border Security Agency National Border Security Standard**  
**Document**: Technical Reference & Mathematical Specifications  
**Author**: Principal Forensic AI & Computer Vision Specialist  
**Status**: ACTIVE PRODUCTION  

---

## 1. Tri-Modal Physical & Digital Tampering Detection

TrustGate AI executes a tri-modal forensic evaluation on every incoming document without relying on synthetic heuristics:

### A. Error Level Analysis (ELA)
- **Mathematical Principle**: Compression delta analysis based on differential quantization loss across JPEG resaves.
- **Formulation**:
  $$\Delta_{\text{ELA}}(x, y) = |\mathbf{I}_{\text{orig}}(x, y) - \mathbf{I}_{\text{resave@90}}(x, y)| \times \alpha$$
- **Detection Target**: Spliced photo inserts, digitally pasted stamps, or modified text blocks compress with different error gradients than the surrounding substrate.

### B. 2D Spectral Frequency Residual Analysis (FFT)
- **Mathematical Principle**: Discontinuities in high-frequency 2D Fast Fourier Transform spatial spectra.
- **Formulation**:
  $$\mathbf{F}(u, v) = \sum_{x=0}^{M-1} \sum_{y=0}^{N-1} f(x, y) e^{-j 2\pi \left(\frac{ux}{M} + \frac{vy}{N}\right)}$$
  $$\mathcal{M}_{\text{high}} = \frac{1}{|\Omega_{\text{high}}|} \sum_{(u, v) \in \Omega_{\text{high}}} 20 \log_{10}(|\mathbf{F}(u, v)| + \epsilon)$$
- **Detection Target**: Periodic resampling, resolution upscaling, and synthetic edge rendering artifacts.

### C. Local Laplacian Noise Variance Discrepancy
- **Mathematical Principle**: Substrate noise variance consistency across document regions.
- **Formulation**:
  $$\sigma^2_{\text{noise}} = \text{Var}\left( \nabla^2 \mathbf{I} \right) = \text{Var}\left( \frac{\partial^2 \mathbf{I}}{\partial x^2} + \frac{\partial^2 \mathbf{I}}{\partial y^2} \right)$$
- **Detection Target**: Photos pasted from external sources exhibit discordant high-frequency noise variance compared to the printed ID background.

---

## 2. Biometric Anti-Spoofing & Deepfake Detection

TrustGate AI prevents presentation attacks (spoofing) and synthetic deepfake impersonations:

1. **Directional Moiré Harmonic Residuals**:
   - Analyzes row and column pixel differential spectra to isolate periodic screen grid artifacts caused by phone, tablet, or monitor replay attacks.
   - Screen replays exhibit directional harmonic ratios exceeding $5.5\times$ baseline energy.

2. **Facial Micro-Texture & Smoothing Variance**:
   - Differentiates authentic human skin pore structures from diffusion-generated or GAN-synthesized face portraits.
   - Deepfake synthesis typically creates an unnatural texture deficit ($\text{Var}(\nabla^2 \mathbf{Face}) < 2.0$).

3. **Biometric Face-to-Document Cosine Verification**:
   - Compares the facial crop from the current authoritative document against live camera capture using normalized spatial gradient feature descriptors.
   - Output normalized between $0\%$ and $99.4\%$. Matches below $70\%$ trigger manual review or biometric rejection.
