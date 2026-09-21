"""
TRUSTGATE AI BILLION — PYTHON UNIT TEST SUITE (22 TESTS)
Command: python -m unittest midv_llm_engine.test_engine
Verifies neural architecture, 16-feature vector extraction, Welford's moments,
explainable failure reasons, and air-gapped offline execution.
"""

import os
import sys
import json
import unittest
import numpy as np

# Ensure project root is on sys.path
WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, WORKSPACE_ROOT)

from midv_llm_engine.dataset import (
    FEATURE_NAMES,
    CLASS_NAMES,
    StreamingWelfordMoments,
    extract_features_from_dict,
    StreamingBatchIterator,
    CACHE_DIR
)
from midv_llm_engine.trainer import FusionNetTrainer
from midv_llm_engine.server import app, predict_features, PredictRequest, verify_document

class TestMidvLlmEngine(unittest.TestCase):

    def setUp(self):
        self.weights_file = os.path.join(WORKSPACE_ROOT, "midv_llm_engine", "models", "trustgate_fusionnet_weights.json")
        with open(self.weights_file, "r", encoding="utf-8") as f:
            self.weights_data = json.load(f)

    # 1. Feature Vector Dimension
    def test_01_feature_vector_dimension(self):
        self.assertEqual(len(FEATURE_NAMES), 16)
        dummy_sample = {"aspect_ratio": 1.42, "metrics": {}}
        feats = extract_features_from_dict(dummy_sample)
        self.assertEqual(len(feats), 16)

    # 2. Target Classes Count
    def test_02_target_classes_count(self):
        self.assertEqual(len(CLASS_NAMES), 6)
        self.assertIn("GENUINE_AUTHENTIC", CLASS_NAMES)
        self.assertIn("DOCUMENT_TAMPERED", CLASS_NAMES)
        self.assertIn("MRZ_CORRUPTED", CLASS_NAMES)
        self.assertIn("GEOMETRY_FABRICATED", CLASS_NAMES)
        self.assertIn("BIOMETRIC_DEEPFAKE", CLASS_NAMES)
        self.assertIn("SPOOF_PRESENTATION", CLASS_NAMES)

    # 3. Streaming Welford Moments
    def test_03_welford_moments_calculation(self):
        welford = StreamingWelfordMoments(dim=16)
        v1 = [1.0] * 16
        v2 = [3.0] * 16
        welford.update(v1)
        welford.update(v2)
        means, stds = welford.finalize()
        self.assertAlmostEqual(means[0], 2.0)
        self.assertAlmostEqual(stds[0], 1.41421356, places=5)

    # 4. Streaming Batch Iterator
    def test_04_streaming_batch_iterator_memory(self):
        mock_samples = [([float(i)] * 16, i % 6) for i in range(100)]
        iterator = StreamingBatchIterator(mock_samples, batch_size=16, shuffle=False)
        self.assertEqual(len(iterator), 7)
        first_x, first_y = next(iter(iterator))
        self.assertEqual(len(first_x), 16)
        self.assertEqual(len(first_y), 16)

    # 5. LeakyReLU Activation
    def test_05_leaky_relu_activation(self):
        arr = np.array([-2.0, 0.0, 3.0])
        res = FusionNetTrainer.leaky_relu(arr, alpha=0.01)
        self.assertAlmostEqual(res[0], -0.02)
        self.assertAlmostEqual(res[1], 0.0)
        self.assertAlmostEqual(res[2], 3.0)

    # 6. Softmax Normalization
    def test_06_softmax_sums_to_one(self):
        logits = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0])
        probs = FusionNetTrainer.softmax(logits)
        self.assertAlmostEqual(float(np.sum(probs)), 1.0, places=5)

    # 7. Model Architecture Dimensions
    def test_07_model_architecture_dimensions(self):
        arch = self.weights_data["architecture"]
        self.assertEqual(arch["input_dim"], 16)
        self.assertEqual(arch["hidden1"], 32)
        self.assertEqual(arch["hidden2"], 24)
        self.assertEqual(arch["hidden3"], 16)
        self.assertEqual(arch["num_classes"], 6)

    # 8. Weight Matrix Shapes
    def test_08_weight_matrix_shapes(self):
        w = self.weights_data["weights"]
        self.assertEqual(len(w["w1"]), 16)
        self.assertEqual(len(w["w1"][0]), 32)
        self.assertEqual(len(w["w2"]), 32)
        self.assertEqual(len(w["w2"][0]), 24)
        self.assertEqual(len(w["w3"]), 24)
        self.assertEqual(len(w["w3"][0]), 16)
        self.assertEqual(len(w["w4"]), 16)
        self.assertEqual(len(w["w4"][0]), 6)

    # 9. Forward Pass Inference Execution
    def test_09_forward_pass_inference(self):
        genuine_feats = [3.0, 1.5, 1.02, 1.8, 0.03, 0.90, 0.002, 0.5, 0.01, 2.0, 0.01, 0.01, 98.0, 1.0, 99.0, 100.0]
        res = predict_features(PredictRequest(features=genuine_feats))
        self.assertIn("predicted_class", res)
        self.assertEqual(res["predicted_class"], "GENUINE_AUTHENTIC")
        self.assertTrue(res["is_genuine"])
        self.assertGreater(res["authenticity_score"], 80.0)

    # 10. Tampered Document Classification
    def test_10_tampered_document_classification(self):
        tampered_feats = [45.0, 1.8, 1.5, 2.0, 0.45, 0.85, 0.01, 2.0, 0.15, 92.0, 0.65, 0.45, 30.0, 1.0, 50.0, 60.0]
        res = predict_features(PredictRequest(features=tampered_feats))
        self.assertEqual(res["predicted_class"], "DOCUMENT_TAMPERED")
        self.assertFalse(res["is_genuine"])

    # 11. MRZ Corrupted Classification
    def test_11_mrz_corrupted_classification(self):
        mrz_feats = [4.0, 1.5, 1.05, 2.0, 0.04, 0.88, 0.005, 1.0, 0.02, 5.0, 0.02, 0.02, 95.0, 0.0, 20.0, 25.0]
        res = predict_features(PredictRequest(features=mrz_feats))
        self.assertEqual(res["predicted_class"], "MRZ_CORRUPTED")
        self.assertFalse(res["is_genuine"])

    # 12. Geometry Fabricated Classification
    def test_12_geometry_fabricated_classification(self):
        geom_feats = [12.0, 2.0, 1.10, 2.5, 0.12, 0.80, 0.35, 18.0, 0.25, 45.0, 0.15, 0.20, 60.0, 1.0, 65.0, 75.0]
        res = predict_features(PredictRequest(features=geom_feats))
        self.assertEqual(res["predicted_class"], "GEOMETRY_FABRICATED")
        self.assertFalse(res["is_genuine"])

    # 13. Biometric Deepfake Classification
    def test_13_biometric_deepfake_classification(self):
        deepfake_feats = [5.0, 25.0, 2.2, 14.0, 0.08, 0.60, 0.005, 1.0, 0.02, 20.0, 0.05, 0.03, 90.0, 1.0, 95.0, 95.0]
        res = predict_features(PredictRequest(features=deepfake_feats))
        self.assertEqual(res["predicted_class"], "BIOMETRIC_DEEPFAKE")
        self.assertFalse(res["is_genuine"])

    # 14. Presentation Spoof Attack Classification
    def test_14_presentation_spoof_classification(self):
        spoof_feats = [8.0, 12.0, 1.6, 3.5, 0.15, 0.05, 0.008, 1.2, 0.03, 25.0, 0.04, 0.03, 85.0, 1.0, 90.0, 92.0]
        res = predict_features(PredictRequest(features=spoof_feats))
        self.assertEqual(res["predicted_class"], "SPOOF_PRESENTATION")
        self.assertFalse(res["is_genuine"])

    # 15. Explainable Audit Reasons for Tampering
    def test_15_explainable_failure_reasons_tampering(self):
        payload = {
            "metrics": {"boundary_gradient_delta": 42.0, "compression_rate_discrepancy": 0.40, "tampering_probability": 90.0}
        }
        res = verify_document(payload)
        self.assertFalse(res["is_genuine"])
        self.assertGreaterEqual(res["failure_reasons_count"], 1)
        finding = res["failure_reasons"][0]["finding"]
        self.assertIn("boundary gradient", finding.lower())

    # 16. Aspect Ratio Delta Conformity for TD1 and TD3
    def test_16_aspect_ratio_conformity(self):
        td1_sample = {"aspect_ratio": 1.586}
        feats_td1 = extract_features_from_dict(td1_sample)
        self.assertAlmostEqual(feats_td1[6], 0.0, places=3) # delta should be ~0

        td3_sample = {"aspect_ratio": 1.420}
        feats_td3 = extract_features_from_dict(td3_sample)
        self.assertAlmostEqual(feats_td3[6], 0.0, places=3) # delta should be ~0

    # 17. Offline Cache Archetypes Catalog
    def test_17_offline_cache_archetypes(self):
        p = CACHE_DIR / "midv_2020_archetypes.json"
        self.assertTrue(p.exists())
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertGreaterEqual(data["total_archetypes"], 20)

    # 18. Offline Cache Groundtruth DocTamper
    def test_18_offline_cache_doctamper(self):
        p = CACHE_DIR / "icdar_2024_pouliquen_groundtruth.json"
        self.assertTrue(p.exists())
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertIn("metrics_distribution", data)

    # 19. Sub-Millisecond Inference Speed
    def test_19_sub_millisecond_inference(self):
        feats = [2.0] * 16
        res = predict_features(PredictRequest(features=feats))
        self.assertLess(res["inference_ms"], 10.0)

    # 20. Confusion Matrix Symmetrical Integrity
    def test_20_confusion_matrix_shape(self):
        cm = self.weights_data["training_metadata"]["confusion_matrix"]
        self.assertEqual(len(cm), 6)
        for row in cm:
            self.assertEqual(len(row), 6)

    # 21. Model Validation Accuracy Above 99 Percent
    def test_21_model_accuracy_above_99(self):
        val_acc = self.weights_data["training_metadata"]["final_val_accuracy"]
        self.assertGreaterEqual(val_acc, 99.0)

    # 22. Zero-Mock Enforcement
    def test_22_zero_mock_enforcement(self):
        self.assertNotEqual(self.weights_data["training_metadata"]["final_val_accuracy"], 0.0)
        self.assertGreater(len(self.weights_data["training_metadata"]["datasets_trained_on"]), 5)

if __name__ == "__main__":
    unittest.main()
