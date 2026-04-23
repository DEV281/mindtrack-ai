"""Raw Spectrogram CNN for voice stress and emotion analysis."""

from __future__ import annotations

import io
import logging
from typing import Dict, Optional

import numpy as np

logger = logging.getLogger(__name__)

VOICE_EMOTION_LABELS = ["neutral", "calm", "happy", "sad", "angry", "fearful", "disgust", "surprised"]


class VoiceStressModel:
    """Spectrogram CNN + MFCC extraction for voice-based stress detection.

    Architecture: Conv2d stack → BatchNorm → ReLU → MaxPool → GlobalAvgPool → FC
    Trained on DAIC-WOZ (depression) + RAVDESS (emotion).
    """

    def __init__(self) -> None:
        self.model = None
        self.device = "cpu"
        self._loaded = False

    def load(self, weights_path: Optional[str] = None) -> None:
        """Load the voice CNN model."""
        try:
            import torch
            import torch.nn as nn

            self.device = "cuda" if torch.cuda.is_available() else "cpu"

            class SpectrogramCNN(nn.Module):
                """Raw spectrogram CNN for voice analysis."""

                def __init__(self, num_classes: int = 8):
                    super().__init__()
                    self.features = nn.Sequential(
                        nn.Conv2d(1, 32, kernel_size=3, padding=1),
                        nn.BatchNorm2d(32),
                        nn.ReLU(inplace=True),
                        nn.MaxPool2d(2),
                        nn.Conv2d(32, 64, kernel_size=3, padding=1),
                        nn.BatchNorm2d(64),
                        nn.ReLU(inplace=True),
                        nn.MaxPool2d(2),
                        nn.Conv2d(64, 128, kernel_size=3, padding=1),
                        nn.BatchNorm2d(128),
                        nn.ReLU(inplace=True),
                        nn.MaxPool2d(2),
                        nn.Conv2d(128, 256, kernel_size=3, padding=1),
                        nn.BatchNorm2d(256),
                        nn.ReLU(inplace=True),
                        nn.AdaptiveAvgPool2d((1, 1)),
                    )
                    self.classifier = nn.Sequential(
                        nn.Flatten(),
                        nn.Linear(256, 128),
                        nn.ReLU(inplace=True),
                        nn.Dropout(0.3),
                        nn.Linear(128, num_classes),
                    )

                def forward(self, x):
                    x = self.features(x)
                    x = self.classifier(x)
                    return x

            self.model = SpectrogramCNN(num_classes=8).to(self.device)

            if weights_path:
                state_dict = torch.load(weights_path, map_location=self.device,  weights_only=True)
                self.model.load_state_dict(state_dict)
                logger.info(f"Voice model weights loaded from {weights_path}")

            self.model.eval()
            self._loaded = True
            logger.info(f"Voice model loaded on {self.device}")
        except Exception as e:
            logger.warning(f"Voice model not available: {e}")
            self._loaded = False

    def extract_mfcc(self, audio_data: np.ndarray, sr: int = 16000) -> Optional[np.ndarray]:
        """Extract MFCC features from audio data."""
        try:
            import librosa
            mfcc = librosa.feature.mfcc(y=audio_data, sr=sr, n_mfcc=40, hop_length=512)
            return mfcc
        except Exception as e:
            logger.warning(f"MFCC extraction error: {e}")
            return None

    def extract_spectrogram(self, audio_data: np.ndarray, sr: int = 16000) -> Optional[np.ndarray]:
        """Extract mel spectrogram from audio data."""
        try:
            import librosa
            mel_spec = librosa.feature.melspectrogram(
                y=audio_data, sr=sr, n_mels=128, fmax=8000, hop_length=512
            )
            mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
            return mel_spec_db
        except Exception as e:
            logger.warning(f"Spectrogram extraction error: {e}")
            return None

    def predict(self, audio_bytes: bytes) -> Dict:
        """Predict voice stress from raw audio bytes.

        Returns dict with stress_score, voice_emotion, frequency, amplitude, mfcc_features.
        """
        # Convert bytes to numpy array
        try:
            import librosa
            audio_data, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
        except Exception:
            # Try raw PCM interpretation
            try:
                audio_data = np.frombuffer(audio_bytes, dtype=np.float32)
                sr = 16000
                if len(audio_data) == 0:
                    return self._default_result()
            except Exception:
                return self._default_result()

        if len(audio_data) < 1024:
            return self._default_result()

        # Extract features
        mfcc = self.extract_mfcc(audio_data, sr)
        spectrogram = self.extract_spectrogram(audio_data, sr)

        # Compute basic audio features
        frequency = self._estimate_pitch(audio_data, sr)
        amplitude = float(np.sqrt(np.mean(audio_data ** 2)))

        # Run CNN inference if model available
        if self._loaded and self.model is not None and spectrogram is not None:
            try:
                import torch

                # Prepare spectrogram input
                spec_tensor = torch.from_numpy(spectrogram).float().unsqueeze(0).unsqueeze(0)
                # Resize to fixed size
                spec_tensor = torch.nn.functional.interpolate(spec_tensor, size=(128, 128), mode="bilinear", align_corners=False)
                spec_tensor = spec_tensor.to(self.device)

                with torch.no_grad():
                    output = self.model(spec_tensor)
                    probs = torch.softmax(output, dim=1)[0].cpu().numpy()

                emotion_idx = int(np.argmax(probs))
                voice_emotion = VOICE_EMOTION_LABELS[emotion_idx]
                confidence = float(probs[emotion_idx])

                # Stress-related emotions
                stress_indices = [3, 4, 5, 6]  # sad, angry, fearful, disgust
                stress_score = float(sum(probs[i] for i in stress_indices)) * 100

                return {
                    "stress_score": min(100, stress_score),
                    "voice_emotion": voice_emotion,
                    "frequency": frequency,
                    "amplitude": amplitude,
                    "confidence": confidence,
                    "mfcc_features": mfcc.tolist() if mfcc is not None else [],
                }
            except Exception as e:
                logger.warning(f"Voice CNN inference error: {e}")

        # Heuristic fallback
        return self._heuristic_predict(audio_data, sr, frequency, amplitude, mfcc)

    def _estimate_pitch(self, audio_data: np.ndarray, sr: int) -> float:
        """Estimate fundamental frequency using autocorrelation."""
        try:
            import librosa
            pitches, magnitudes = librosa.piptrack(y=audio_data, sr=sr)
            pitch_values = pitches[magnitudes > np.median(magnitudes)]
            pitch_values = pitch_values[pitch_values > 50]
            if len(pitch_values) > 0:
                return float(np.median(pitch_values))
        except Exception:
            pass
        return 180.0  # Default

    def _heuristic_predict(self, audio_data: np.ndarray, sr: int, frequency: float, amplitude: float, mfcc: Optional[np.ndarray]) -> Dict:
        """Heuristic voice stress prediction."""
        # Higher pitch and amplitude generally correlate with stress
        pitch_stress = max(0, min(50, (frequency - 150) * 0.5))
        amp_stress = max(0, min(50, amplitude * 100))
        stress_score = min(100, pitch_stress + amp_stress)

        # Rough emotion from pitch
        if frequency > 250:
            voice_emotion = "angry" if amplitude > 0.3 else "surprised"
        elif frequency < 120:
            voice_emotion = "sad"
        else:
            voice_emotion = "neutral" if amplitude < 0.2 else "calm"

        return {
            "stress_score": stress_score,
            "voice_emotion": voice_emotion,
            "frequency": frequency,
            "amplitude": amplitude,
            "confidence": 0.3,
            "mfcc_features": mfcc.tolist() if mfcc is not None else [],
        }

    def _default_result(self) -> Dict:
        """Default result when audio is too short or invalid."""
        return {
            "stress_score": 0.0,
            "voice_emotion": "neutral",
            "frequency": 0.0,
            "amplitude": 0.0,
            "confidence": 0.0,
            "mfcc_features": [],
        }
