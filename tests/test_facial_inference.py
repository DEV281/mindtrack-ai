"""Tests for the FaceAnalyzer inference module.

Covers:
- Model loading without crash (no weight file)
- Demo fallback returns valid dict
- Analysis dict structure validation
- Value ranges
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pytest
from app.models.facial_inference import FaceAnalyzer

# Use a nonexistent path so FaceAnalyzer runs in demo mode
NONEXISTENT_PATH = "/tmp/nonexistent_vit_weights.pt"

EXPECTED_KEYS = {
    "stress", "anxiety", "stability", "depression_risk", "overall_risk",
    "emotions", "top_emotion", "top_emotion_pct", "confidence",
    "real_model", "face_detected", "inference_time_ms",
}

EMOTION_KEYS = {"angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"}


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

class TestModelLoading:
    def test_init_without_weights(self) -> None:
        """FaceAnalyzer must initialize without crashing even when weights are missing."""
        analyzer = FaceAnalyzer(model_path=NONEXISTENT_PATH)
        assert analyzer.real_model_loaded is False
        assert analyzer.model is None

    def test_get_model_status_no_weights(self) -> None:
        analyzer = FaceAnalyzer(model_path=NONEXISTENT_PATH)
        status = analyzer.get_model_status()
        assert status["real_model_loaded"] is False
        assert status["weights_file_exists"] is False
        assert status["model_parameters_total"] == 0


# ---------------------------------------------------------------------------
# Demo fallback
# ---------------------------------------------------------------------------

class TestDemoFallback:
    def test_demo_returns_valid_dict(self) -> None:
        analyzer = FaceAnalyzer(model_path=NONEXISTENT_PATH)
        result = analyzer.analyze_frame("dGVzdA==")  # base64 of "test"
        assert isinstance(result, dict)
        assert result["real_model"] is False

    def test_demo_has_all_keys(self) -> None:
        analyzer = FaceAnalyzer(model_path=NONEXISTENT_PATH)
        result = analyzer.analyze_frame("dGVzdA==")
        assert set(result.keys()) == EXPECTED_KEYS

    def test_demo_emotions_have_correct_keys(self) -> None:
        analyzer = FaceAnalyzer(model_path=NONEXISTENT_PATH)
        result = analyzer.analyze_frame("dGVzdA==")
        emotions = result["emotions"]
        assert isinstance(emotions, dict)
        assert set(emotions.keys()) == EMOTION_KEYS


# ---------------------------------------------------------------------------
# Analysis dict structure
# ---------------------------------------------------------------------------

class TestAnalysisDictStructure:
    def test_all_expected_keys_present(self) -> None:
        analyzer = FaceAnalyzer(model_path=NONEXISTENT_PATH)
        result = analyzer.analyze_frame("")
        for key in EXPECTED_KEYS:
            assert key in result, f"Missing key: {key}"

    def test_correct_types(self) -> None:
        analyzer = FaceAnalyzer(model_path=NONEXISTENT_PATH)
        result = analyzer.analyze_frame("")
        assert isinstance(result["stress"], float)
        assert isinstance(result["anxiety"], float)
        assert isinstance(result["stability"], float)
        assert isinstance(result["depression_risk"], float)
        assert isinstance(result["overall_risk"], float)
        assert isinstance(result["emotions"], dict)
        assert isinstance(result["top_emotion"], str)
        assert isinstance(result["top_emotion_pct"], float)
        assert isinstance(result["confidence"], float)
        assert isinstance(result["real_model"], bool)
        assert isinstance(result["face_detected"], bool)
        assert isinstance(result["inference_time_ms"], float)


# ---------------------------------------------------------------------------
# Value ranges
# ---------------------------------------------------------------------------

class TestValueRanges:
    def test_float_values_in_range(self) -> None:
        analyzer = FaceAnalyzer(model_path=NONEXISTENT_PATH)
        # Run multiple times to catch random outliers
        for _ in range(10):
            result = analyzer.analyze_frame("")
            assert 0.0 <= result["stress"] <= 100.0, f"stress={result['stress']}"
            assert 0.0 <= result["anxiety"] <= 100.0, f"anxiety={result['anxiety']}"
            assert 0.0 <= result["stability"] <= 100.0, f"stability={result['stability']}"
            assert 0.0 <= result["depression_risk"] <= 100.0, f"depression_risk={result['depression_risk']}"
            assert 0.0 <= result["overall_risk"] <= 100.0, f"overall_risk={result['overall_risk']}"

    def test_emotions_sum_approximately_100(self) -> None:
        analyzer = FaceAnalyzer(model_path=NONEXISTENT_PATH)
        for _ in range(10):
            result = analyzer.analyze_frame("")
            emotions = result["emotions"]
            total = sum(emotions.values())
            assert abs(total - 100.0) < 1.0, f"Emotions sum={total}, expected ~100"

    def test_confidence_in_range(self) -> None:
        analyzer = FaceAnalyzer(model_path=NONEXISTENT_PATH)
        for _ in range(10):
            result = analyzer.analyze_frame("")
            assert 0.0 <= result["confidence"] <= 1.0, f"confidence={result['confidence']}"

    def test_top_emotion_matches_highest(self) -> None:
        analyzer = FaceAnalyzer(model_path=NONEXISTENT_PATH)
        result = analyzer.analyze_frame("")
        emotions = result["emotions"]
        expected_top = max(emotions, key=lambda k: emotions[k])
        assert result["top_emotion"] == expected_top
