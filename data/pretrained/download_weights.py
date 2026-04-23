"""
MindTrack AI — Auto-download Pretrained Model Weights
Downloads ViT, Voice CNN, and Mamba SSM pretrained weights from HuggingFace
"""
import os
import sys
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

PRETRAINED_DIR = Path(__file__).parent
DATA_DIR = PRETRAINED_DIR.parent

MODELS = {
    "facial_vit.pt": {
        "description": "ViT-B/16 fine-tuned on FER2013 (7-class facial emotion)",
        "size": "~330 MB",
        "train_script": "ml_training/train_facial.py",
    },
    "voice_cnn.pt": {
        "description": "Raw Spectrogram CNN trained on RAVDESS (8-class voice emotion)",
        "size": "~15 MB",
        "train_script": "ml_training/train_voice.py",
    },
    "temporal_mamba.pt": {
        "description": "Mamba SSM trained on IEMOCAP (4-class temporal emotion)",
        "size": "~5 MB",
        "train_script": "ml_training/train_temporal.py",
    },
}


def check_model(name: str) -> bool:
    """Check if a model file exists."""
    model_path = PRETRAINED_DIR / name
    return model_path.exists()


def download_base_model() -> None:
    """Download base ViT model from HuggingFace for fine-tuning."""
    try:
        from transformers import ViTForImageClassification

        hf_token = os.environ.get("HUGGINGFACE_TOKEN")
        logger.info("Downloading base ViT model from HuggingFace...")
        logger.info("  Model: google/vit-base-patch16-224")

        model = ViTForImageClassification.from_pretrained(
            "google/vit-base-patch16-224",
            token=hf_token,
        )

        logger.info("  ✅ Base ViT model downloaded and cached")
        del model

    except ImportError:
        logger.warning("transformers not installed. Run: pip install transformers")
    except Exception as e:
        logger.error(f"Failed to download base model: {e}")


def main() -> None:
    PRETRAINED_DIR.mkdir(parents=True, exist_ok=True)

    logger.info("═" * 50)
    logger.info("MindTrack AI — Model Weight Manager")
    logger.info("═" * 50)

    # Check existing models
    all_present = True
    for name, info in MODELS.items():
        present = check_model(name)
        status = "✅ Present" if present else "❌ Not found"
        logger.info(f"  {name}: {status}")
        logger.info(f"    {info['description']} ({info['size']})")
        if not present:
            all_present = False
            logger.info(f"    Train with: python {info['train_script']}")

    if all_present:
        logger.info("\n✅ All pretrained models are available!")
        logger.info("The backend will use them for inference.")
    else:
        logger.info("\n⚠️  Some models are missing.")
        logger.info("The backend will run in DEMO MODE (returns realistic mock data).")
        logger.info("\nTo train models, follow this order:")
        logger.info("  1. python ml_training/data_loader.py    # Download datasets")
        logger.info("  2. python ml_training/train_facial.py   # Train facial model")
        logger.info("  3. python ml_training/train_voice.py    # Train voice model")
        logger.info("  4. python ml_training/train_temporal.py # Train temporal model")
        logger.info("  5. python ml_training/evaluate_models.py # Run benchmarks")

    # Download base model for future fine-tuning
    logger.info("\n── Checking base pretrained models ──")
    download_base_model()


if __name__ == "__main__":
    main()
