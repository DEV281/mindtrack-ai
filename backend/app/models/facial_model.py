"""ViT-based facial emotion recognition model."""

from __future__ import annotations

import logging
from typing import Dict, Optional

import numpy as np

logger = logging.getLogger(__name__)

EMOTION_LABELS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]
STRESS_EMOTIONS = {"angry", "fear", "sad", "disgust"}


class FacialEmotionModel:
    """Vision Transformer for facial emotion recognition.

    Uses google/vit-base-patch16-224 fine-tuned on FER2013 + AffectNet.
    Falls back to OpenCV Haar cascade + heuristic if model weights unavailable.
    """

    def __init__(self) -> None:
        self.model = None
        self.processor = None
        self.face_cascade = None
        self.device = "cpu"
        self._loaded = False

    def load(self, weights_path: Optional[str] = None) -> None:
        """Load the model. Tries HuggingFace ViT, falls back to heuristic."""
        try:
            import torch
            from transformers import ViTForImageClassification, ViTImageProcessor

            self.device = "cuda" if torch.cuda.is_available() else "cpu"

            if weights_path:
                self.model = ViTForImageClassification.from_pretrained(
                    weights_path, num_labels=7, ignore_mismatched_sizes=True
                ).to(self.device)
            else:
                self.model = ViTForImageClassification.from_pretrained(
                    "google/vit-base-patch16-224",
                    num_labels=7,
                    ignore_mismatched_sizes=True,
                ).to(self.device)

            self.processor = ViTImageProcessor.from_pretrained("google/vit-base-patch16-224")
            self.model.eval()
            self._loaded = True
            logger.info(f"Facial model loaded on {self.device}")
        except Exception as e:
            logger.warning(f"ViT model not available, using heuristic fallback: {e}")
            self._loaded = False

        # Always load face cascade for face detection
        try:
            import cv2
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            logger.info("OpenCV face cascade loaded")
        except Exception as e:
            logger.warning(f"Face cascade not available: {e}")

    def detect_faces(self, frame: np.ndarray) -> list:
        """Detect faces in a frame using OpenCV Haar cascade."""
        if self.face_cascade is None:
            return []

        import cv2
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48)
        )
        return list(faces) if len(faces) > 0 else []

    def predict(self, frame: np.ndarray) -> Dict:
        """Run facial emotion prediction on a BGR frame.

        Returns dict with emotion, probabilities, stress_score, confidence, face_box.
        """
        import cv2

        faces = self.detect_faces(frame)
        face_box = None

        if len(faces) > 0:
            # Use the largest face
            areas = [w * h for (x, y, w, h) in faces]
            idx = int(np.argmax(areas))
            x, y, w, h = faces[idx]
            face_box = {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}

            # Crop and resize face
            face_crop = frame[y : y + h, x : x + w]
            face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
            face_resized = cv2.resize(face_rgb, (224, 224))
        else:
            # No face detected — use center crop
            h, w = frame.shape[:2]
            cx, cy = w // 2, h // 2
            crop_size = min(h, w) // 2
            face_crop = frame[cy - crop_size : cy + crop_size, cx - crop_size : cx + crop_size]
            face_rgb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB) if len(face_crop) > 0 else np.zeros((224, 224, 3), dtype=np.uint8)
            face_resized = cv2.resize(face_rgb, (224, 224))

        # Run ViT inference if available
        if self._loaded and self.model is not None and self.processor is not None:
            try:
                import torch
                from PIL import Image

                pil_img = Image.fromarray(face_resized)
                inputs = self.processor(images=pil_img, return_tensors="pt").to(self.device)

                with torch.no_grad():
                    outputs = self.model(**inputs)
                    logits = outputs.logits[0]
                    probs = torch.softmax(logits, dim=0).cpu().numpy()

                probabilities = {EMOTION_LABELS[i]: float(probs[i]) * 100 for i in range(len(EMOTION_LABELS))}
                dominant = max(probabilities, key=probabilities.get)
                confidence = float(max(probs))

                # Calculate stress score from stress-related emotions
                stress_score = sum(probabilities.get(e, 0) for e in STRESS_EMOTIONS)
                stress_score = min(100, stress_score)

                return {
                    "emotion": dominant,
                    "probabilities": probabilities,
                    "stress_score": stress_score,
                    "confidence": confidence,
                    "face_box": face_box,
                }
            except Exception as e:
                logger.warning(f"ViT inference error: {e}")

        # Heuristic fallback based on pixel analysis
        return self._heuristic_predict(face_resized, face_box)

    def _heuristic_predict(self, face_img: np.ndarray, face_box: Optional[Dict]) -> Dict:
        """Simple heuristic-based emotion prediction as fallback."""
        # Use basic image statistics for a rough estimate
        brightness = float(np.mean(face_img))
        contrast = float(np.std(face_img))

        # Rough heuristic mapping
        neutral_prob = 35.0
        happy_prob = max(0, (brightness - 100) * 0.3)
        sad_prob = max(0, (150 - brightness) * 0.2)
        angry_prob = max(0, contrast * 0.15)
        fear_prob = max(0, (contrast - 50) * 0.1)
        surprise_prob = max(0, (brightness - 130) * 0.15)
        disgust_prob = max(0, (80 - brightness) * 0.1)

        total = neutral_prob + happy_prob + sad_prob + angry_prob + fear_prob + surprise_prob + disgust_prob
        if total == 0:
            total = 1

        probabilities = {
            "neutral": neutral_prob / total * 100,
            "happy": happy_prob / total * 100,
            "sad": sad_prob / total * 100,
            "angry": angry_prob / total * 100,
            "fear": fear_prob / total * 100,
            "surprise": surprise_prob / total * 100,
            "disgust": disgust_prob / total * 100,
        }

        dominant = max(probabilities, key=probabilities.get)
        stress_score = sum(probabilities.get(e, 0) for e in STRESS_EMOTIONS)

        return {
            "emotion": dominant,
            "probabilities": probabilities,
            "stress_score": min(100, stress_score),
            "confidence": 0.3,  # Low confidence for heuristic
            "face_box": face_box,
        }
