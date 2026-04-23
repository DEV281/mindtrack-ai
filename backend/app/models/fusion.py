"""Multi-modal score fusion engine."""

from __future__ import annotations

from typing import Dict, List, Optional


class FusionEngine:
    """Fuse facial, voice, and temporal analysis scores.

    Default weights: facial=0.35, voice=0.30, temporal=0.35
    Risk thresholds: LOW < 40, MODERATE 40-70, HIGH > 70
    """

    # Configurable weights per model rank — exactly 3 combinations
    WEIGHT_PRESETS = {
        1: {"facial": 0.35, "voice": 0.30, "temporal": 0.35},  # Gold Standard
        2: {"facial": 0.35, "voice": 0.30, "temporal": 0.35},  # High Precision
        3: {"facial": 0.35, "voice": 0.30, "temporal": 0.35},  # Efficient Inference
    }

    RANK_INFO = {
        1: {"name": "Gold Standard", "cnn": "ViT", "mfcc": "Raw Spectrogram CNN", "lstm": "Mamba SSM", "f1": 79.5},
        2: {"name": "High Precision", "cnn": "ViT", "mfcc": "Raw Spectrogram CNN", "lstm": "S4 SSM", "f1": 79.1},
        3: {"name": "Efficient Inference", "cnn": "ConvNeXt", "mfcc": "Raw Spectrogram CNN", "lstm": "Mamba SSM", "f1": 78.9},
    }

    RISK_THRESHOLDS = {
        "LOW": (0, 40),
        "MODERATE": (40, 70),
        "HIGH": (70, 100),
    }

    def __init__(self, model_rank: int = 1) -> None:
        self.model_rank = model_rank
        self.weights = self.WEIGHT_PRESETS.get(model_rank, self.WEIGHT_PRESETS[1])

    def fuse(
        self,
        facial_score: float,
        voice_score: float,
        temporal_score: float,
    ) -> Dict:
        """Compute fused stress and risk scores.

        Args:
            facial_score: Facial stress score (0-100)
            voice_score: Voice stress score (0-100)
            temporal_score: Temporal stress score (0-100)

        Returns:
            Dict with combined_score, risk_level, component_contributions.
        """
        w = self.weights
        combined = (
            facial_score * w["facial"]
            + voice_score * w["voice"]
            + temporal_score * w["temporal"]
        )

        combined = max(0.0, min(100.0, combined))

        risk_level = self._classify_risk(combined)

        return {
            "combined_score": round(combined, 2),
            "risk_level": risk_level,
            "facial_contribution": round(facial_score * w["facial"], 2),
            "voice_contribution": round(voice_score * w["voice"], 2),
            "temporal_contribution": round(temporal_score * w["temporal"], 2),
            "weights": w,
            "model_rank": self.model_rank,
        }

    def _classify_risk(self, score: float) -> str:
        """Classify risk level from combined score."""
        if score < 40:
            return "LOW"
        elif score < 70:
            return "MODERATE"
        else:
            return "HIGH"

    def get_alerts(self, result: Dict, emotions: Optional[Dict] = None) -> List[str]:
        """Generate alerts based on fused analysis results."""
        alerts: List[str] = []
        score = result.get("combined_score", 0)
        risk = result.get("risk_level", "LOW")

        if risk == "HIGH":
            alerts.append("⚠️ High overall risk detected — immediate attention recommended")
        if score > 80:
            alerts.append("🔴 Critical stress level — consider crisis intervention protocols")
        if score > 60:
            alerts.append("Elevated stress indicators — monitor closely")

        if emotions:
            fear = emotions.get("fear", 0)
            sad = emotions.get("sad", 0)
            angry = emotions.get("angry", 0)

            if fear > 40:
                alerts.append("Significant fear response detected in facial expression")
            if sad > 50:
                alerts.append("Pronounced sadness detected — depression risk indicator")
            if angry > 45:
                alerts.append("Elevated anger expression — may indicate frustration or agitation")

        return alerts

    def compute_session_summary(self, readings: List[Dict]) -> Dict:
        """Compute summary statistics for an entire session."""
        if not readings:
            return {
                "avg_stress": 0.0,
                "peak_stress": 0.0,
                "avg_anxiety": 0.0,
                "avg_stability": 0.0,
                "dominant_emotion": "neutral",
                "risk_level": "LOW",
                "total_alerts": 0,
            }

        stresses = [r.get("stress", 0) for r in readings]
        anxieties = [r.get("anxiety", 0) for r in readings]
        stabilities = [r.get("stability", 50) for r in readings]

        # Count emotion frequencies
        emotion_counts: Dict[str, int] = {}
        total_alerts = 0
        for r in readings:
            emotions = r.get("emotions", {})
            if emotions:
                dominant = max(emotions, key=emotions.get)
                emotion_counts[dominant] = emotion_counts.get(dominant, 0) + 1
            total_alerts += len(r.get("alerts", []))

        most_common_emotion = max(emotion_counts, key=emotion_counts.get) if emotion_counts else "neutral"

        avg_stress = sum(stresses) / len(stresses)

        return {
            "avg_stress": round(avg_stress, 2),
            "peak_stress": round(max(stresses), 2),
            "avg_anxiety": round(sum(anxieties) / len(anxieties), 2),
            "avg_stability": round(sum(stabilities) / len(stabilities), 2),
            "dominant_emotion": most_common_emotion,
            "risk_level": self._classify_risk(avg_stress),
            "total_alerts": total_alerts,
        }
