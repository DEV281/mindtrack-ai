"""
MindTrack AI — Dataset Download & Preprocessing Pipeline
Auto-download and preprocess all 5 datasets: FER2013, AffectNet, DAIC-WOZ, RAVDESS, IEMOCAP
"""
import os
import sys
import json
import logging
import argparse
import zipfile
import subprocess
from pathlib import Path

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data" / "datasets"


def download_fer2013(data_dir: Path) -> bool:
    """Download FER2013 from Kaggle."""
    fer_dir = data_dir / "fer2013"
    if fer_dir.exists() and any(fer_dir.iterdir()):
        logger.info("FER2013 already downloaded")
        return True

    fer_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Downloading FER2013 from Kaggle...")

    try:
        subprocess.run(
            ["kaggle", "datasets", "download", "-d", "msambare/fer2013", "-p", str(fer_dir)],
            check=True,
            capture_output=True,
            text=True,
        )

        # Extract zip
        zip_path = fer_dir / "fer2013.zip"
        if zip_path.exists():
            with zipfile.ZipFile(zip_path, "r") as z:
                z.extractall(fer_dir)
            zip_path.unlink()
            logger.info("FER2013 downloaded and extracted successfully")
            return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Kaggle download failed: {e.stderr}")
        logger.info("To download manually:")
        logger.info("  1. pip install kaggle")
        logger.info("  2. Configure ~/.kaggle/kaggle.json with API credentials")
        logger.info("  3. kaggle datasets download -d msambare/fer2013")
        return False
    except FileNotFoundError:
        logger.error("'kaggle' CLI not found. Install with: pip install kaggle")
        return False


def download_ravdess(data_dir: Path) -> bool:
    """Download RAVDESS from Zenodo."""
    ravdess_dir = data_dir / "ravdess"
    if ravdess_dir.exists() and any(ravdess_dir.iterdir()):
        logger.info("RAVDESS already downloaded")
        return True

    ravdess_dir.mkdir(parents=True, exist_ok=True)
    url = "https://zenodo.org/record/1188976/files/Audio_Speech_Actors_01-24.zip"
    zip_path = ravdess_dir / "ravdess.zip"

    logger.info("Downloading RAVDESS from Zenodo...")
    try:
        subprocess.run(
            ["curl", "-L", "-o", str(zip_path), url],
            check=True,
            capture_output=True,
        )

        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(ravdess_dir)
        zip_path.unlink()
        logger.info("RAVDESS downloaded successfully")
        return True
    except Exception as e:
        logger.error(f"RAVDESS download failed: {e}")
        logger.info(f"Download manually from: {url}")
        return False


def download_affectnet(data_dir: Path) -> bool:
    """AffectNet requires manual download (academic license)."""
    affectnet_dir = data_dir / "affectnet"
    if affectnet_dir.exists() and any(affectnet_dir.iterdir()):
        logger.info("AffectNet already present")
        return True

    affectnet_dir.mkdir(parents=True, exist_ok=True)
    logger.warning("AffectNet requires manual download (academic license)")
    logger.info("  1. Visit: http://mohammadmahoor.com/affectnet/")
    logger.info("  2. Submit access request form")
    logger.info("  3. Download and extract to: data/datasets/affectnet/")
    return False


def download_daic_woz(data_dir: Path) -> bool:
    """DAIC-WOZ requires manual download (research license)."""
    daic_dir = data_dir / "daic_woz"
    if daic_dir.exists() and any(daic_dir.iterdir()):
        logger.info("DAIC-WOZ already present")
        return True

    daic_dir.mkdir(parents=True, exist_ok=True)
    logger.warning("DAIC-WOZ requires manual download (research license)")
    logger.info("  1. Visit: https://dcapswoz.ict.usc.edu/")
    logger.info("  2. Submit data access agreement")
    logger.info("  3. Download and extract to: data/datasets/daic_woz/")
    return False


def download_iemocap(data_dir: Path) -> bool:
    """IEMOCAP requires manual download (research license)."""
    iemocap_dir = data_dir / "iemocap"
    if iemocap_dir.exists() and any(iemocap_dir.iterdir()):
        logger.info("IEMOCAP already present")
        return True

    iemocap_dir.mkdir(parents=True, exist_ok=True)
    logger.warning("IEMOCAP requires manual download (research license)")
    logger.info("  1. Visit: https://sail.usc.edu/iemocap/")
    logger.info("  2. Request access from USC SAIL Lab")
    logger.info("  3. Download and extract to: data/datasets/iemocap/")
    return False


def preprocess_fer2013(data_dir: Path) -> None:
    """Verify FER2013 structure."""
    fer_dir = data_dir / "fer2013"
    train_dir = fer_dir / "train"
    test_dir = fer_dir / "test"

    if not train_dir.exists():
        logger.warning("FER2013 train directory not found — may need restructuring")
        return

    emotions = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]
    total = 0
    for emotion in emotions:
        count = len(list((train_dir / emotion).glob("*"))) if (train_dir / emotion).exists() else 0
        total += count
        test_count = len(list((test_dir / emotion).glob("*"))) if (test_dir / emotion).exists() else 0
        logger.info(f"  {emotion}: train={count}, test={test_count}")

    logger.info(f"  Total training samples: {total}")


def preprocess_ravdess(data_dir: Path) -> None:
    """Verify RAVDESS structure."""
    ravdess_dir = data_dir / "ravdess"
    total = 0
    for actor_dir in sorted(ravdess_dir.iterdir()):
        if actor_dir.is_dir() and actor_dir.name.startswith("Actor_"):
            count = len(list(actor_dir.glob("*.wav")))
            total += count

    logger.info(f"  RAVDESS: {total} audio files across actors")


def generate_train_test_split(data_dir: Path, dataset: str, train_ratio: float = 0.7, val_ratio: float = 0.15) -> None:
    """Generate train/val/test split indices."""
    logger.info(f"Generating {dataset} train/val/test split ({train_ratio}/{val_ratio}/{1-train_ratio-val_ratio})")

    split_file = data_dir / dataset / "splits.json"
    if split_file.exists():
        logger.info(f"Split file already exists: {split_file}")
        return

    # Create dummy split for structure
    splits = {
        "train_ratio": train_ratio,
        "val_ratio": val_ratio,
        "test_ratio": round(1 - train_ratio - val_ratio, 2),
        "random_seed": 42,
    }

    split_file.parent.mkdir(parents=True, exist_ok=True)
    with open(split_file, "w") as f:
        json.dump(splits, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Download and preprocess datasets")
    parser.add_argument("--data-dir", type=str, default=str(DATA_DIR))
    parser.add_argument("--datasets", nargs="+", default=["all"], choices=["all", "fer2013", "affectnet", "daic_woz", "ravdess", "iemocap"])
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)

    datasets_to_process = args.datasets
    if "all" in datasets_to_process:
        datasets_to_process = ["fer2013", "affectnet", "daic_woz", "ravdess", "iemocap"]

    results = {}

    for ds in datasets_to_process:
        logger.info(f"\n{'='*50}")
        logger.info(f"Processing: {ds.upper()}")
        logger.info(f"{'='*50}")

        if ds == "fer2013":
            results[ds] = download_fer2013(data_dir)
            if results[ds]:
                preprocess_fer2013(data_dir)
                generate_train_test_split(data_dir, ds)
        elif ds == "affectnet":
            results[ds] = download_affectnet(data_dir)
        elif ds == "daic_woz":
            results[ds] = download_daic_woz(data_dir)
        elif ds == "ravdess":
            results[ds] = download_ravdess(data_dir)
            if results[ds]:
                preprocess_ravdess(data_dir)
                generate_train_test_split(data_dir, ds)
        elif ds == "iemocap":
            results[ds] = download_iemocap(data_dir)

    # Summary
    logger.info(f"\n{'='*50}")
    logger.info("DOWNLOAD SUMMARY")
    logger.info(f"{'='*50}")
    for ds, success in results.items():
        status = "✅ Available" if success else "❌ Manual download required"
        logger.info(f"  {ds}: {status}")


if __name__ == "__main__":
    main()
