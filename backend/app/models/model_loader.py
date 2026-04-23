"""Model loader — lazy loading of all pretrained ML models with CPU fallback."""

from __future__ import annotations

import logging
import os
from typing import Tuple, Optional

from app.core.config import get_settings
from app.models.facial_model import FacialEmotionModel
from app.models.voice_model import VoiceStressModel
from app.models.temporal_model import TemporalAnalysisModel

logger = logging.getLogger(__name__)
settings = get_settings()

# Singleton model instances
_facial: Optional[FacialEmotionModel] = None
_voice: Optional[VoiceStressModel] = None
_temporal: Optional[TemporalAnalysisModel] = None


def load_all_models() -> Tuple[FacialEmotionModel, VoiceStressModel, TemporalAnalysisModel]:
    """Load all ML models. Models are loaded lazily and cached globally.

    Returns (facial_model, voice_model, temporal_model).
    Each model gracefully handles missing weights by falling back to heuristics.
    """
    global _facial, _voice, _temporal

    pretrained_dir = settings.PRETRAINED_DIR

    # Facial model
    if _facial is None:
        _facial = FacialEmotionModel()
        facial_weights = os.path.join(pretrained_dir, "facial_vit.pt")
        _facial.load(weights_path=facial_weights if os.path.exists(facial_weights) else None)

    # Voice model
    if _voice is None:
        _voice = VoiceStressModel()
        voice_weights = os.path.join(pretrained_dir, "voice_cnn.pt")
        _voice.load(weights_path=voice_weights if os.path.exists(voice_weights) else None)

    # Temporal model
    if _temporal is None:
        _temporal = TemporalAnalysisModel()
        temporal_weights = os.path.join(pretrained_dir, "temporal_mamba.pt")
        _temporal.load(weights_path=temporal_weights if os.path.exists(temporal_weights) else None)

    return _facial, _voice, _temporal


def get_facial_model() -> Optional[FacialEmotionModel]:
    """Get the facial model instance."""
    global _facial
    if _facial is None:
        try:
            load_all_models()
        except Exception:
            pass
    return _facial


def get_voice_model() -> Optional[VoiceStressModel]:
    """Get the voice model instance."""
    global _voice
    if _voice is None:
        try:
            load_all_models()
        except Exception:
            pass
    return _voice


def get_temporal_model() -> Optional[TemporalAnalysisModel]:
    """Get the temporal model instance."""
    global _temporal
    if _temporal is None:
        try:
            load_all_models()
        except Exception:
            pass
    return _temporal


def models_available() -> dict:
    """Check which models are loaded and available."""
    return {
        "facial": _facial is not None and _facial._loaded if hasattr(_facial, '_loaded') else False,
        "voice": _voice is not None and _voice._loaded if hasattr(_voice, '_loaded') else False,
        "temporal": _temporal is not None and _temporal._loaded if hasattr(_temporal, '_loaded') else False,
    }
