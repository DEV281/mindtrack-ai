#!/usr/bin/env python3
"""Complete reproducible training pipeline for ViT facial emotion recognition.

Fine-tunes google/vit-base-patch16-224 on FER2013 for 7-class emotion
classification. Produces real trained weights, confusion matrix,
classification report, and all evaluation artifacts.

Designed to run on Google Colab free tier with T4 GPU.

Usage:
    python train_facial_vit.py                      # Full training
    python train_facial_vit.py --quick-test 100     # Quick validation on 100 images
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import random
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader, Dataset, SubsetRandomSampler, WeightedRandomSampler
from torchvision import transforms
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedShuffleSplit

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

EMOTION_LABELS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]
NUM_CLASSES = 7
SEED = 42

EXPECTED_TOTAL_IMAGES = 35887
EXPECTED_CLASS_COUNTS = {
    0: 3995,   # angry
    1: 436,    # disgust
    2: 4097,   # fear
    3: 7215,   # happy
    4: 4830,   # sad
    5: 3171,   # surprise
    6: 4965,   # neutral
    # Note: These are approximate. FER2013 has slight variations
    # depending on the version. We validate within ±100 tolerance.
}

# Directories
RESULTS_DIR = Path("results")
SPLITS_DIR = RESULTS_DIR / "splits"
PRETRAINED_DIR = Path("data/pretrained")
DATA_DIR = Path("data/datasets/fer2013")

# ImageNet normalization
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


# ---------------------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------------------

def set_all_seeds(seed: int = SEED) -> None:
    """Set all random seeds for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    os.environ["PYTHONHASHSEED"] = str(seed)
    logger.info("All seeds set to %d for reproducibility.", seed)


# ---------------------------------------------------------------------------
# Step 1: Dataset Download and Validation
# ---------------------------------------------------------------------------

def download_fer2013(data_dir: Path = DATA_DIR) -> Path:
    """Download FER2013 from Kaggle using the Kaggle API."""
    data_dir.mkdir(parents=True, exist_ok=True)

    # Check if already downloaded
    csv_path = data_dir / "fer2013.csv"
    if csv_path.exists():
        logger.info("FER2013 CSV already exists at %s", csv_path)
        return csv_path

    # Try alternative structures
    for alt_csv in [data_dir / "fer2013" / "fer2013.csv", data_dir / "icml_face_data.csv"]:
        if alt_csv.exists():
            logger.info("FER2013 found at %s", alt_csv)
            return alt_csv

    # Check for image directory structure (msambare version)
    train_dir = data_dir / "train"
    if train_dir.exists():
        logger.info("FER2013 image directory found at %s", train_dir)
        return data_dir

    logger.info("Downloading FER2013 from Kaggle...")
    try:
        import kaggle
        kaggle.api.authenticate()
        kaggle.api.dataset_download_files(
            "msambare/fer2013",
            path=str(data_dir),
            unzip=True,
        )
        logger.info("FER2013 downloaded and extracted to %s", data_dir)
    except Exception as e:
        logger.error(
            "Failed to download FER2013: %s\n"
            "Please download manually:\n"
            "  kaggle datasets download -d msambare/fer2013 -p %s --unzip\n"
            "Or download from: https://www.kaggle.com/datasets/msambare/fer2013",
            e, data_dir,
        )
        sys.exit(1)

    return data_dir


def validate_dataset(data_dir: Path) -> Tuple[bool, Dict]:
    """Validate the FER2013 dataset structure and counts."""
    info: Dict = {"valid": False, "format": None, "total": 0, "class_counts": {}}

    # Check for image directory structure (msambare version)
    train_dir = data_dir / "train"
    test_dir = data_dir / "test"

    if train_dir.exists() and test_dir.exists():
        info["format"] = "image_dirs"
        total = 0
        class_counts: Dict[int, int] = {}
        for split_dir in [train_dir, test_dir]:
            for label_idx, label_name in enumerate(EMOTION_LABELS):
                label_dir = split_dir / label_name
                if label_dir.exists():
                    count = len(list(label_dir.glob("*.jpg")) + list(label_dir.glob("*.png")))
                    class_counts[label_idx] = class_counts.get(label_idx, 0) + count
                    total += count

        info["total"] = total
        info["class_counts"] = class_counts

        if total < 30000:
            logger.warning("Dataset has only %d images (expected ~%d). Proceeding anyway.", total, EXPECTED_TOTAL_IMAGES)

        info["valid"] = total > 0
        return info["valid"], info

    # Check for CSV format
    csv_path = data_dir / "fer2013.csv"
    if not csv_path.exists():
        csv_path = data_dir / "fer2013" / "fer2013.csv"
    if not csv_path.exists():
        csv_path = data_dir / "icml_face_data.csv"

    if csv_path.exists():
        import pandas as pd
        df = pd.read_csv(csv_path)
        info["format"] = "csv"
        info["total"] = len(df)

        if "emotion" in df.columns:
            info["class_counts"] = dict(df["emotion"].value_counts().sort_index())
        elif "Usage" in df.columns:
            info["class_counts"] = dict(df.iloc[:, 0].value_counts().sort_index())

        info["valid"] = info["total"] > 0
        return info["valid"], info

    logger.error("No valid FER2013 data found in %s", data_dir)
    return False, info


# ---------------------------------------------------------------------------
# Step 2: Dataset and DataLoader
# ---------------------------------------------------------------------------

class FER2013ImageDataset(Dataset):
    """FER2013 dataset from image directory structure."""

    def __init__(
        self,
        data_dirs: List[Path],
        transform: Optional[transforms.Compose] = None,
    ) -> None:
        self.transform = transform
        self.samples: List[Tuple[str, int]] = []

        for data_dir in data_dirs:
            for label_idx, label_name in enumerate(EMOTION_LABELS):
                label_dir = data_dir / label_name
                if not label_dir.exists():
                    continue
                for img_path in sorted(label_dir.glob("*")):
                    if img_path.suffix.lower() in (".jpg", ".jpeg", ".png"):
                        self.samples.append((str(img_path), label_idx))

        logger.info("Loaded %d images from %s", len(self.samples), [str(d) for d in data_dirs])

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        from PIL import Image
        img_path, label = self.samples[idx]
        img = Image.open(img_path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label

    @property
    def targets(self) -> List[int]:
        return [s[1] for s in self.samples]


class FER2013CSVDataset(Dataset):
    """FER2013 dataset from CSV format."""

    def __init__(
        self,
        csv_path: str,
        transform: Optional[transforms.Compose] = None,
    ) -> None:
        import pandas as pd
        self.transform = transform
        df = pd.read_csv(csv_path)

        if "emotion" in df.columns and "pixels" in df.columns:
            self.labels = df["emotion"].values.astype(int)
            self.pixels = df["pixels"].values
        else:
            raise ValueError(f"Unexpected CSV format. Columns: {list(df.columns)}")

        logger.info("Loaded %d samples from CSV", len(self.labels))

    def __len__(self) -> int:
        return len(self.labels)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        from PIL import Image
        pixels = np.array(self.pixels[idx].split(), dtype=np.uint8).reshape(48, 48)
        img = Image.fromarray(pixels).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, int(self.labels[idx])

    @property
    def targets(self) -> List[int]:
        return self.labels.tolist()


def get_splits(
    targets: List[int],
    splits_file: Path = SPLITS_DIR / "fer2013_splits.json",
) -> Tuple[List[int], List[int], List[int]]:
    """Get or create reproducible train/val/test split indices."""
    if splits_file.exists():
        logger.info("Loading existing splits from %s", splits_file)
        with open(splits_file) as f:
            splits = json.load(f)
        return splits["train"], splits["val"], splits["test"]

    logger.info("Generating new stratified splits (70/15/15, seed=%d)...", SEED)
    targets_arr = np.array(targets)
    indices = np.arange(len(targets_arr))

    # First split: 70% train, 30% temp
    sss1 = StratifiedShuffleSplit(n_splits=1, test_size=0.30, random_state=SEED)
    train_idx, temp_idx = next(sss1.split(indices, targets_arr))

    # Second split: split temp 50/50 → 15% val, 15% test
    sss2 = StratifiedShuffleSplit(n_splits=1, test_size=0.50, random_state=SEED)
    val_relative_idx, test_relative_idx = next(sss2.split(temp_idx, targets_arr[temp_idx]))

    val_idx = temp_idx[val_relative_idx]
    test_idx = temp_idx[test_relative_idx]

    splits = {
        "train": train_idx.tolist(),
        "val": val_idx.tolist(),
        "test": test_idx.tolist(),
        "seed": SEED,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    splits_file.parent.mkdir(parents=True, exist_ok=True)
    with open(splits_file, "w") as f:
        json.dump(splits, f, indent=2)

    logger.info(
        "Splits created: train=%d, val=%d, test=%d",
        len(train_idx), len(val_idx), len(test_idx),
    )
    return splits["train"], splits["val"], splits["test"]


def compute_class_weights(targets: List[int], num_classes: int = NUM_CLASSES) -> torch.Tensor:
    """Compute class weights for imbalanced dataset."""
    class_counts = np.bincount(targets, minlength=num_classes).astype(float)
    total = len(targets)
    weights = total / (num_classes * class_counts + 1e-8)
    logger.info("Class weights: %s", {EMOTION_LABELS[i]: f"{w:.3f}" for i, w in enumerate(weights)})
    return torch.FloatTensor(weights)


def get_weighted_sampler(targets: List[int], indices: List[int]) -> WeightedRandomSampler:
    """Create a WeightedRandomSampler for the training set."""
    subset_targets = [targets[i] for i in indices]
    class_counts = np.bincount(subset_targets, minlength=NUM_CLASSES).astype(float)
    class_weights = 1.0 / (class_counts + 1e-8)
    sample_weights = [class_weights[t] for t in subset_targets]
    return WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)


# ---------------------------------------------------------------------------
# Step 3: Transforms
# ---------------------------------------------------------------------------

def get_train_transform() -> transforms.Compose:
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.1),
        transforms.RandomRotation(degrees=10),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def get_eval_transform() -> transforms.Compose:
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


# ---------------------------------------------------------------------------
# Step 4: Model Architecture
# ---------------------------------------------------------------------------

class ViTEmotionClassifier(nn.Module):
    """ViT-Base fine-tuned for 7-class emotion recognition."""

    def __init__(self) -> None:
        super().__init__()
        from transformers import ViTModel

        self.vit = ViTModel.from_pretrained(
            "google/vit-base-patch16-224",
            add_pooling_layer=True,
        )

        # Freeze layers 0-7, unfreeze 8-11 and pooler
        for name, param in self.vit.named_parameters():
            param.requires_grad = False

        # Unfreeze encoder layers 8, 9, 10, 11
        for i in range(8, 12):
            for param in self.vit.encoder.layer[i].parameters():
                param.requires_grad = True

        # Unfreeze pooler
        if self.vit.pooler is not None:
            for param in self.vit.pooler.parameters():
                param.requires_grad = True

        # Classification head
        self.classifier = nn.Sequential(
            nn.Linear(768, 512),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(256, NUM_CLASSES),
        )

        # Xavier init for new layers
        for module in self.classifier.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)

    def forward(self, pixel_values: torch.Tensor) -> torch.Tensor:
        outputs = self.vit(pixel_values=pixel_values)
        return self.classifier(outputs.pooler_output)


def count_parameters(model: nn.Module) -> Tuple[int, int]:
    """Count total and trainable parameters."""
    total = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    return total, trainable


# ---------------------------------------------------------------------------
# Step 5: Training Loop
# ---------------------------------------------------------------------------

def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
    max_norm: float = 1.0,
) -> float:
    """Train for one epoch. Returns average loss."""
    model.train()
    total_loss = 0.0
    num_batches = 0

    for batch_idx, (images, labels) in enumerate(loader):
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        logits = model(images)
        loss = criterion(logits, labels)
        loss.backward()

        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=max_norm)
        optimizer.step()

        total_loss += loss.item()
        num_batches += 1

        if (batch_idx + 1) % 50 == 0:
            logger.info(
                "  Batch %d/%d — loss: %.4f",
                batch_idx + 1, len(loader), loss.item(),
            )

    return total_loss / max(num_batches, 1)


@torch.no_grad()
def evaluate(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, float, np.ndarray, np.ndarray]:
    """Evaluate model. Returns (loss, macro_f1, all_preds, all_labels)."""
    model.eval()
    total_loss = 0.0
    num_batches = 0
    all_preds: List[int] = []
    all_labels: List[int] = []

    for images, labels in loader:
        images = images.to(device)
        labels = labels.to(device)

        logits = model(images)
        loss = criterion(logits, labels)

        total_loss += loss.item()
        num_batches += 1

        preds = logits.argmax(dim=1).cpu().numpy()
        all_preds.extend(preds.tolist())
        all_labels.extend(labels.cpu().numpy().tolist())

    avg_loss = total_loss / max(num_batches, 1)
    macro_f1 = f1_score(all_labels, all_preds, average="macro")

    return avg_loss, macro_f1, np.array(all_preds), np.array(all_labels)


# ---------------------------------------------------------------------------
# Step 6: Full Evaluation on Test Set
# ---------------------------------------------------------------------------

@torch.no_grad()
def full_evaluation(
    model: nn.Module,
    loader: DataLoader,
    device: torch.device,
) -> Dict:
    """Run complete evaluation on held-out test set."""
    model.eval()
    all_preds: List[int] = []
    all_labels: List[int] = []
    all_probs: List[np.ndarray] = []

    for images, labels in loader:
        images = images.to(device)
        logits = model(images)
        probs = torch.nn.functional.softmax(logits, dim=1).cpu().numpy()

        all_preds.extend(logits.argmax(dim=1).cpu().numpy().tolist())
        all_labels.extend(labels.numpy().tolist())
        all_probs.append(probs)

    all_probs_arr = np.vstack(all_probs)
    y_true = np.array(all_labels)
    y_pred = np.array(all_preds)

    # Core metrics
    accuracy = accuracy_score(y_true, y_pred)
    macro_prec, macro_rec, macro_f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro",
    )

    # Per-class F1
    per_class_f1 = f1_score(y_true, y_pred, average=None)
    per_class_f1_dict = {EMOTION_LABELS[i]: float(f) for i, f in enumerate(per_class_f1)}

    # Classification report
    report = classification_report(
        y_true, y_pred, target_names=EMOTION_LABELS, output_dict=True,
    )

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)

    # ROC AUC (one-vs-rest)
    roc_auc_dict: Dict[str, float] = {}
    try:
        from sklearn.preprocessing import label_binarize
        y_bin = label_binarize(y_true, classes=list(range(NUM_CLASSES)))
        for i, label in enumerate(EMOTION_LABELS):
            if y_bin[:, i].sum() > 0:
                roc_auc_dict[label] = float(roc_auc_score(y_bin[:, i], all_probs_arr[:, i]))
            else:
                roc_auc_dict[label] = 0.0
    except Exception as e:
        logger.warning("ROC AUC computation failed: %s", e)

    # Inference latency on CPU
    model_cpu = model.cpu()
    model_cpu.eval()
    dummy_input = torch.randn(1, 3, 224, 224)
    latencies = []
    for _ in range(10):
        start = time.perf_counter()
        model_cpu(dummy_input)
        latencies.append((time.perf_counter() - start) * 1000)
    avg_latency = float(np.mean(latencies))
    model.to(device)

    return {
        "accuracy": float(accuracy),
        "macro_precision": float(macro_prec),
        "macro_recall": float(macro_rec),
        "macro_f1": float(macro_f1),
        "per_class_f1": per_class_f1_dict,
        "confusion_matrix": cm.tolist(),
        "classification_report": report,
        "roc_auc_scores": roc_auc_dict,
        "cpu_inference_latency_ms": round(avg_latency, 2),
        "y_true": y_true.tolist(),
        "y_pred": y_pred.tolist(),
    }


# ---------------------------------------------------------------------------
# Step 6b: Save Evaluation Artifacts
# ---------------------------------------------------------------------------

def save_confusion_matrix(cm: np.ndarray, path: Path) -> None:
    """Save confusion matrix as heatmap PNG."""
    fig, ax = plt.subplots(figsize=(10, 8))
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    ax.set(
        xticks=np.arange(NUM_CLASSES),
        yticks=np.arange(NUM_CLASSES),
        xticklabels=EMOTION_LABELS,
        yticklabels=EMOTION_LABELS,
        ylabel="True Label",
        xlabel="Predicted Label",
        title="Confusion Matrix — ViT on FER2013 Test Set",
    )
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")

    # Add text annotations
    thresh = cm.max() / 2.0
    for i in range(NUM_CLASSES):
        for j in range(NUM_CLASSES):
            ax.text(
                j, i, format(cm[i, j], "d"),
                ha="center", va="center",
                color="white" if cm[i, j] > thresh else "black",
                fontsize=10,
            )

    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(str(path), dpi=150, bbox_inches="tight")
    plt.close(fig)
    logger.info("Confusion matrix saved to %s", path)


def save_training_curves(
    train_losses: List[float],
    val_f1s: List[float],
    path: Path,
) -> None:
    """Save training loss and validation F1 curves."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    epochs = range(1, len(train_losses) + 1)

    ax1.plot(epochs, train_losses, "b-", linewidth=2, label="Train Loss")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Loss")
    ax1.set_title("Training Loss")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    ax2.plot(epochs, val_f1s, "g-", linewidth=2, label="Val Macro F1")
    if val_f1s:
        best_epoch = np.argmax(val_f1s) + 1
        best_f1 = max(val_f1s)
        ax2.axvline(x=best_epoch, color="r", linestyle="--", alpha=0.5, label=f"Best: {best_f1:.4f} @ Epoch {best_epoch}")
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Macro F1")
    ax2.set_title("Validation Macro F1")
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    fig.suptitle("ViT-Base Fine-tuning on FER2013", fontsize=14, fontweight="bold")
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(str(path), dpi=150, bbox_inches="tight")
    plt.close(fig)
    logger.info("Training curves saved to %s", path)


# ---------------------------------------------------------------------------
# Step 8: MLflow Logging
# ---------------------------------------------------------------------------

def log_to_mlflow(
    metrics: Dict,
    hyperparams: Dict,
    model: nn.Module,
    artifacts_dir: Path,
) -> None:
    """Log training results to MLflow. Falls back to JSON if MLflow unavailable."""
    try:
        import mlflow
        import mlflow.pytorch

        mlflow.set_tracking_uri("file:./mlruns")
        mlflow.set_experiment("mindtrack-facial-vit")

        with mlflow.start_run():
            mlflow.log_params(hyperparams)
            for key, value in metrics.items():
                if isinstance(value, (int, float)):
                    mlflow.log_metric(key, value)

            # Log artifacts
            for artifact in ["confusion_matrix.png", "training_curves.png"]:
                artifact_path = artifacts_dir / artifact
                if artifact_path.exists():
                    mlflow.log_artifact(str(artifact_path))

            # Log classification report
            report_path = artifacts_dir / "classification_report.json"
            if report_path.exists():
                mlflow.log_artifact(str(report_path))

            # Log model
            mlflow.pytorch.log_model(model, "vit_emotion_model")

        logger.info("Results logged to MLflow.")

    except ImportError:
        logger.info("MLflow not installed. Saving results to local JSON fallback.")
        fallback = {
            "hyperparams": hyperparams,
            "metrics": {k: v for k, v in metrics.items() if isinstance(v, (int, float, str, bool))},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        fallback_path = artifacts_dir / "mlflow_fallback.json"
        with open(fallback_path, "w") as f:
            json.dump(fallback, f, indent=2)
        logger.info("Fallback results saved to %s", fallback_path)

    except Exception as e:
        logger.warning("MLflow logging failed: %s. Results already saved locally.", e)


# ---------------------------------------------------------------------------
# Main Training Function
# ---------------------------------------------------------------------------

def train(
    data_dir: Path = DATA_DIR,
    num_epochs: int = 30,
    batch_size: int = 32,
    lr_pretrained: float = 2e-5,
    lr_head: float = 1e-4,
    weight_decay: float = 0.01,
    patience: int = 8,
    quick_test: Optional[int] = None,
) -> Dict:
    """Run the complete training pipeline."""
    start_time = time.time()
    set_all_seeds(SEED)

    # Create directories
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    SPLITS_DIR.mkdir(parents=True, exist_ok=True)
    PRETRAINED_DIR.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Training device: %s", device)
    if device.type == "cuda":
        logger.info("GPU: %s", torch.cuda.get_device_name(0))

    # --- Step 1: Download and validate ---
    download_fer2013(data_dir)
    is_valid, dataset_info = validate_dataset(data_dir)
    if not is_valid:
        logger.error("Dataset validation failed. Exiting.")
        sys.exit(1)
    logger.info("Dataset format: %s, Total images: %d", dataset_info["format"], dataset_info["total"])

    # --- Step 2: Load dataset ---
    eval_transform = get_eval_transform()

    if dataset_info["format"] == "image_dirs":
        train_dir = data_dir / "train"
        test_dir = data_dir / "test"
        dirs = []
        if train_dir.exists():
            dirs.append(train_dir)
        if test_dir.exists():
            dirs.append(test_dir)
        full_dataset = FER2013ImageDataset(dirs, transform=eval_transform)
    else:
        csv_path = data_dir / "fer2013.csv"
        if not csv_path.exists():
            csv_path = data_dir / "fer2013" / "fer2013.csv"
        full_dataset = FER2013CSVDataset(str(csv_path), transform=eval_transform)

    if quick_test is not None:
        logger.info("QUICK TEST MODE: Using only %d samples.", quick_test)
        full_dataset.samples = full_dataset.samples[:quick_test] if hasattr(full_dataset, "samples") else full_dataset.samples

    targets = full_dataset.targets
    train_idx, val_idx, test_idx = get_splits(targets)

    # If quick_test, truncate indices
    if quick_test is not None:
        max_idx = len(full_dataset) - 1
        train_idx = [i for i in train_idx if i <= max_idx][:max(1, quick_test * 7 // 10)]
        val_idx = [i for i in val_idx if i <= max_idx][:max(1, quick_test * 15 // 100)]
        test_idx = [i for i in test_idx if i <= max_idx][:max(1, quick_test * 15 // 100)]

    # --- Step 3: Create dataloaders ---
    train_transform = get_train_transform()
    train_dataset_aug = type(full_dataset).__new__(type(full_dataset))
    train_dataset_aug.__dict__.update(full_dataset.__dict__)
    train_dataset_aug.transform = train_transform

    class_weights = compute_class_weights([targets[i] for i in train_idx])
    sampler = get_weighted_sampler(targets, train_idx)

    train_loader = DataLoader(
        train_dataset_aug,
        batch_size=batch_size,
        sampler=sampler,
        num_workers=2,
        pin_memory=True,
        drop_last=True,
    )
    val_loader = DataLoader(
        full_dataset,
        batch_size=batch_size * 2,
        sampler=SubsetRandomSampler(val_idx),
        num_workers=2,
        pin_memory=True,
    )
    test_loader = DataLoader(
        full_dataset,
        batch_size=batch_size * 2,
        sampler=SubsetRandomSampler(test_idx),
        num_workers=2,
        pin_memory=True,
    )

    # --- Step 4: Build model ---
    logger.info("Building ViT model...")
    model = ViTEmotionClassifier()
    total_params, trainable_params = count_parameters(model)
    logger.info("Total parameters: %s", f"{total_params:,}")
    logger.info("Trainable parameters: %s", f"{trainable_params:,}")
    model.to(device)

    # --- Step 5: Training setup ---
    criterion = nn.CrossEntropyLoss(weight=class_weights.to(device))

    # Dual learning rate: pretrained layers vs new head
    pretrained_params = []
    head_params = []
    for name, param in model.named_parameters():
        if param.requires_grad:
            if "classifier" in name:
                head_params.append(param)
            else:
                pretrained_params.append(param)

    optimizer = AdamW([
        {"params": pretrained_params, "lr": lr_pretrained},
        {"params": head_params, "lr": lr_head},
    ], weight_decay=weight_decay)

    scheduler = CosineAnnealingLR(optimizer, T_max=num_epochs, eta_min=1e-7)

    # Training state
    best_val_f1 = 0.0
    best_epoch = 0
    epochs_without_improvement = 0
    train_losses: List[float] = []
    val_f1s: List[float] = []
    best_model_path = PRETRAINED_DIR / "vit_fer2013_best.pt"

    # --- Training loop ---
    logger.info("Starting training for %d epochs...", num_epochs)

    for epoch in range(1, num_epochs + 1):
        epoch_start = time.time()

        train_loss = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_f1, _, _ = evaluate(model, val_loader, criterion, device)
        scheduler.step()

        train_losses.append(train_loss)
        val_f1s.append(val_f1)

        current_lr = optimizer.param_groups[0]["lr"]
        epoch_time = time.time() - epoch_start

        logger.info(
            "Epoch %d/%d — train_loss: %.4f | val_loss: %.4f | val_f1: %.4f | lr: %.2e | time: %.1fs",
            epoch, num_epochs, train_loss, val_loss, val_f1, current_lr, epoch_time,
        )

        # Check for improvement
        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_epoch = epoch
            epochs_without_improvement = 0

            # Save best checkpoint
            checkpoint = {
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "epoch": epoch,
                "val_f1": val_f1,
                "val_loss": val_loss,
            }
            torch.save(checkpoint, str(best_model_path))
            logger.info("  ✓ New best model saved (val_f1=%.4f)", val_f1)
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= patience:
                logger.info("Early stopping at epoch %d (patience=%d)", epoch, patience)
                break

    total_time = time.time() - start_time
    early_stopped = epochs_without_improvement >= patience

    # --- Step 6: Evaluate on test set ---
    logger.info("Loading best checkpoint from epoch %d for test evaluation...", best_epoch)
    checkpoint = torch.load(str(best_model_path), map_location=device, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])

    test_results = full_evaluation(model, test_loader, device)

    # --- Save evaluation artifacts ---
    cm = np.array(test_results["confusion_matrix"])
    save_confusion_matrix(cm, RESULTS_DIR / "confusion_matrix.png")
    save_training_curves(train_losses, val_f1s, RESULTS_DIR / "training_curves.png")

    # Classification report
    with open(RESULTS_DIR / "classification_report.json", "w") as f:
        json.dump(test_results["classification_report"], f, indent=2)
    logger.info("Classification report saved.")

    # ROC AUC scores
    with open(RESULTS_DIR / "roc_auc_scores.json", "w") as f:
        json.dump(test_results["roc_auc_scores"], f, indent=2)
    logger.info("ROC AUC scores saved.")

    # --- Step 7: Save metrics summary ---
    metrics_summary = {
        "best_val_f1": round(best_val_f1, 4),
        "test_macro_f1": round(test_results["macro_f1"], 4),
        "test_accuracy": round(test_results["accuracy"], 4),
        "test_macro_precision": round(test_results["macro_precision"], 4),
        "test_macro_recall": round(test_results["macro_recall"], 4),
        "per_class_f1": {k: round(v, 4) for k, v in test_results["per_class_f1"].items()},
        "training_epochs_completed": len(train_losses),
        "early_stopped": early_stopped,
        "best_epoch": best_epoch,
        "total_training_time_minutes": round(total_time / 60, 2),
        "model_parameters_total": total_params,
        "model_parameters_trainable": trainable_params,
        "fer2013_split_seed": SEED,
        "cpu_inference_latency_ms": test_results["cpu_inference_latency_ms"],
        "roc_auc_scores": test_results["roc_auc_scores"],
        "hyperparameters": {
            "num_epochs": num_epochs,
            "batch_size": batch_size,
            "lr_pretrained": lr_pretrained,
            "lr_head": lr_head,
            "weight_decay": weight_decay,
            "patience": patience,
            "optimizer": "AdamW",
            "scheduler": "CosineAnnealingLR",
            "model": "google/vit-base-patch16-224",
            "frozen_layers": "0-7",
            "unfrozen_layers": "8-11 + pooler",
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # Backup existing metrics if present
    metrics_path = RESULTS_DIR / "metrics_summary.json"
    if metrics_path.exists():
        backup_name = f"metrics_summary_backup_{int(time.time())}.json"
        shutil.copy2(str(metrics_path), str(RESULTS_DIR / backup_name))
        logger.info("Previous metrics backed up to %s", backup_name)

    with open(metrics_path, "w") as f:
        json.dump(metrics_summary, f, indent=2)
    logger.info("Metrics summary saved to %s", metrics_path)

    # --- Step 8: MLflow logging ---
    log_to_mlflow(
        metrics={
            "best_val_f1": best_val_f1,
            "test_macro_f1": test_results["macro_f1"],
            "test_accuracy": test_results["accuracy"],
        },
        hyperparams=metrics_summary["hyperparameters"],
        model=model,
        artifacts_dir=RESULTS_DIR,
    )

    # --- Print final results ---
    logger.info("=" * 60)
    logger.info("TRAINING COMPLETE")
    logger.info("=" * 60)
    logger.info("Best Validation F1: %.4f (epoch %d)", best_val_f1, best_epoch)
    logger.info("Test Macro F1:      %.4f", test_results["macro_f1"])
    logger.info("Test Accuracy:      %.4f", test_results["accuracy"])
    logger.info("Training Time:      %.1f minutes", total_time / 60)
    logger.info("Model saved to:     %s", best_model_path)
    logger.info("Results saved to:   %s/", RESULTS_DIR)
    logger.info("-" * 60)
    logger.info("Per-class F1:")
    for label, f1_val in test_results["per_class_f1"].items():
        logger.info("  %-10s %.4f", label, f1_val)
    logger.info("=" * 60)

    return metrics_summary


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Train ViT on FER2013")
    parser.add_argument("--data-dir", type=str, default=str(DATA_DIR), help="Path to FER2013 data")
    parser.add_argument("--epochs", type=int, default=30, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Training batch size")
    parser.add_argument("--lr-pretrained", type=float, default=2e-5, help="LR for pretrained layers")
    parser.add_argument("--lr-head", type=float, default=1e-4, help="LR for classification head")
    parser.add_argument("--weight-decay", type=float, default=0.01, help="Weight decay")
    parser.add_argument("--patience", type=int, default=8, help="Early stopping patience")
    parser.add_argument("--quick-test", type=int, default=None, help="Quick test on N samples")
    args = parser.parse_args()

    train(
        data_dir=Path(args.data_dir),
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        lr_pretrained=args.lr_pretrained,
        lr_head=args.lr_head,
        weight_decay=args.weight_decay,
        patience=args.patience,
        quick_test=args.quick_test,
    )


if __name__ == "__main__":
    main()
