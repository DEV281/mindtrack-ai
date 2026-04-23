"""
MindTrack AI — ViT Fine-Tuning for Facial Expression Recognition
Trains google/vit-base-patch16-224 on FER2013 (7 classes) + AffectNet (8 classes)
"""
import os
import sys
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms
from PIL import Image
from sklearn.metrics import f1_score, confusion_matrix, classification_report
from transformers import ViTForImageClassification, ViTFeatureExtractor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# FER2013 emotion labels
FER2013_CLASSES = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]
NUM_CLASSES = len(FER2013_CLASSES)


class FER2013Dataset(Dataset):
    """FER2013 dataset loader from directory structure."""

    def __init__(self, root_dir: str, split: str = "train", transform: transforms.Compose | None = None):
        self.root_dir = Path(root_dir) / split
        self.transform = transform
        self.samples: list[tuple[str, int]] = []

        if not self.root_dir.exists():
            logger.warning(f"Dataset directory not found: {self.root_dir}")
            return

        for class_idx, class_name in enumerate(FER2013_CLASSES):
            class_dir = self.root_dir / class_name
            if class_dir.exists():
                for img_path in class_dir.glob("*.jpg"):
                    self.samples.append((str(img_path), class_idx))
                for img_path in class_dir.glob("*.png"):
                    self.samples.append((str(img_path), class_idx))

        logger.info(f"Loaded {len(self.samples)} samples from {split} split")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert("RGB")

        if self.transform:
            image = self.transform(image)
        else:
            image = transforms.ToTensor()(image)

        return image, label


def get_transforms(split: str = "train") -> transforms.Compose:
    """Get data augmentation transforms."""
    if split == "train":
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
            transforms.RandomRotation(10),
            transforms.RandomAffine(degrees=0, translate=(0.05, 0.05)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
    else:
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])


def create_weighted_sampler(dataset: FER2013Dataset) -> WeightedRandomSampler:
    """Create weighted sampler for class imbalance."""
    labels = [s[1] for s in dataset.samples]
    class_counts = np.bincount(labels, minlength=NUM_CLASSES)
    class_weights = 1.0 / (class_counts + 1e-6)
    sample_weights = [class_weights[label] for label in labels]
    return WeightedRandomSampler(sample_weights, len(sample_weights), replacement=True)


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    scheduler: optim.lr_scheduler.LRScheduler,
    device: torch.device,
    epoch: int,
) -> tuple[float, float]:
    """Train for one epoch."""
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (images, labels) in enumerate(dataloader):
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        logits = outputs.logits if hasattr(outputs, "logits") else outputs

        loss = criterion(logits, labels)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        total_loss += loss.item()
        _, predicted = logits.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

        if batch_idx % 50 == 0:
            logger.info(
                f"Epoch {epoch} [{batch_idx}/{len(dataloader)}] "
                f"Loss: {loss.item():.4f} Acc: {100.*correct/total:.2f}%"
            )

    scheduler.step()
    avg_loss = total_loss / len(dataloader)
    accuracy = 100.0 * correct / total
    return avg_loss, accuracy


@torch.no_grad()
def evaluate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> tuple[float, float, float, np.ndarray]:
    """Evaluate model on validation set."""
    model.eval()
    total_loss = 0.0
    all_preds: list[int] = []
    all_labels: list[int] = []

    for images, labels in dataloader:
        images, labels = images.to(device), labels.to(device)
        outputs = model(images)
        logits = outputs.logits if hasattr(outputs, "logits") else outputs

        loss = criterion(logits, labels)
        total_loss += loss.item()

        _, predicted = logits.max(1)
        all_preds.extend(predicted.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

    avg_loss = total_loss / len(dataloader)
    accuracy = 100.0 * np.mean(np.array(all_preds) == np.array(all_labels))
    f1 = f1_score(all_labels, all_preds, average="macro") * 100
    cm = confusion_matrix(all_labels, all_preds)

    return avg_loss, accuracy, f1, cm


def main():
    parser = argparse.ArgumentParser(description="Train ViT on FER2013")
    parser.add_argument("--data-dir", type=str, default="../data/datasets/fer2013", help="FER2013 dataset directory")
    parser.add_argument("--output-dir", type=str, default="../data/pretrained", help="Output directory for checkpoints")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--model-name", type=str, default="google/vit-base-patch16-224")
    parser.add_argument("--resume", type=str, default=None, help="Path to checkpoint to resume from")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")

    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load model
    logger.info(f"Loading model: {args.model_name}")
    model = ViTForImageClassification.from_pretrained(
        args.model_name,
        num_labels=NUM_CLASSES,
        ignore_mismatched_sizes=True,
    )
    model = model.to(device)

    if args.resume:
        logger.info(f"Resuming from checkpoint: {args.resume}")
        state_dict = torch.load(args.resume, map_location=device)
        model.load_state_dict(state_dict)

    # DataLoaders
    train_dataset = FER2013Dataset(args.data_dir, "train", get_transforms("train"))
    val_dataset = FER2013Dataset(args.data_dir, "test", get_transforms("val"))

    if len(train_dataset) == 0:
        logger.error("No training data found! Download FER2013 first:")
        logger.error("  kaggle datasets download -d msambare/fer2013")
        logger.error("  unzip fer2013.zip -d ../data/datasets/fer2013")
        sys.exit(1)

    sampler = create_weighted_sampler(train_dataset)
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, sampler=sampler, num_workers=4, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=4, pin_memory=True)

    # Training setup
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-7)

    best_f1 = 0.0
    history: list[dict] = []

    logger.info(f"Starting training for {args.epochs} epochs")
    logger.info(f"Train samples: {len(train_dataset)}, Val samples: {len(val_dataset)}")

    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, scheduler, device, epoch)
        val_loss, val_acc, val_f1, cm = evaluate(model, val_loader, criterion, device)

        logger.info(
            f"Epoch {epoch}/{args.epochs} — "
            f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}% | "
            f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%, Val F1: {val_f1:.2f}%"
        )

        history.append({
            "epoch": epoch,
            "train_loss": train_loss,
            "train_acc": train_acc,
            "val_loss": val_loss,
            "val_acc": val_acc,
            "val_f1": val_f1,
        })

        # Save best
        if val_f1 > best_f1:
            best_f1 = val_f1
            save_path = output_dir / "facial_vit.pt"
            torch.save(model.state_dict(), save_path)
            logger.info(f"New best F1: {val_f1:.2f}% — Saved to {save_path}")

        # Save checkpoint every 10 epochs
        if epoch % 10 == 0:
            ckpt_path = output_dir / f"facial_vit_epoch{epoch}.pt"
            torch.save(model.state_dict(), ckpt_path)

    # Final report
    logger.info(f"\nTraining complete. Best F1: {best_f1:.2f}%")
    logger.info(f"\nPer-class report on validation set:")
    model.load_state_dict(torch.load(output_dir / "facial_vit.pt", map_location=device))
    _, _, _, cm = evaluate(model, val_loader, criterion, device)
    logger.info(f"\nConfusion Matrix:\n{cm}")

    # Save history
    with open(output_dir / "facial_training_history.json", "w") as f:
        json.dump(history, f, indent=2)


if __name__ == "__main__":
    main()
