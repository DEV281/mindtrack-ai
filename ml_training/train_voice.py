"""
MindTrack AI — Voice Stress Detection CNN Training
Trains Raw Spectrogram CNN + MFCC extraction on RAVDESS + DAIC-WOZ datasets
"""
import os
import sys
import json
import logging
import argparse
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import librosa
from sklearn.metrics import f1_score, confusion_matrix, classification_report
from sklearn.model_selection import train_test_split

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

RAVDESS_EMOTIONS = ["neutral", "calm", "happy", "sad", "angry", "fearful", "disgust", "surprised"]
NUM_CLASSES = len(RAVDESS_EMOTIONS)


class RawSpectrogramCNN(nn.Module):
    """Raw Spectrogram CNN for voice stress detection."""

    def __init__(self, num_classes: int = 8):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),

            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((4, 4)),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256 * 4 * 4, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(512, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.classifier(x)
        return x


class VoiceDataset(Dataset):
    """Dataset for audio files with mel spectrogram + MFCC extraction."""

    def __init__(self, file_paths: list[str], labels: list[int], sr: int = 16000, n_mfcc: int = 40, max_len: int = 128):
        self.file_paths = file_paths
        self.labels = labels
        self.sr = sr
        self.n_mfcc = n_mfcc
        self.max_len = max_len

    def __len__(self) -> int:
        return len(self.file_paths)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        audio_path = self.file_paths[idx]
        label = self.labels[idx]

        try:
            y, sr = librosa.load(audio_path, sr=self.sr, mono=True)
        except Exception:
            # Return zeros on error
            return torch.zeros(1, self.n_mfcc, self.max_len), label

        # Extract mel spectrogram
        mel_spec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=self.n_mfcc, hop_length=512)
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

        # Pad or truncate to fixed length
        if mel_spec_db.shape[1] < self.max_len:
            pad_width = self.max_len - mel_spec_db.shape[1]
            mel_spec_db = np.pad(mel_spec_db, ((0, 0), (0, pad_width)), mode="constant")
        else:
            mel_spec_db = mel_spec_db[:, :self.max_len]

        # Normalize
        mel_spec_db = (mel_spec_db - mel_spec_db.mean()) / (mel_spec_db.std() + 1e-6)

        # Convert to tensor (1, n_mfcc, max_len)
        tensor = torch.FloatTensor(mel_spec_db).unsqueeze(0)
        return tensor, label


def load_ravdess(data_dir: str) -> tuple[list[str], list[int]]:
    """Load RAVDESS dataset file paths and labels."""
    file_paths: list[str] = []
    labels: list[int] = []
    ravdess_dir = Path(data_dir)

    if not ravdess_dir.exists():
        logger.warning(f"RAVDESS directory not found: {ravdess_dir}")
        return file_paths, labels

    for actor_dir in sorted(ravdess_dir.iterdir()):
        if not actor_dir.is_dir():
            continue
        for audio_file in actor_dir.glob("*.wav"):
            # RAVDESS filename format: 03-01-05-01-01-02-12.wav
            # 3rd number (05) = emotion: 01=neutral, 02=calm, ..., 08=surprised
            parts = audio_file.stem.split("-")
            if len(parts) >= 3:
                emotion_code = int(parts[2]) - 1  # 0-indexed
                if 0 <= emotion_code < NUM_CLASSES:
                    file_paths.append(str(audio_file))
                    labels.append(emotion_code)

    logger.info(f"Loaded {len(file_paths)} RAVDESS audio files")
    return file_paths, labels


def train_one_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    device: torch.device,
    epoch: int,
) -> tuple[float, float]:
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (specs, labels) in enumerate(dataloader):
        specs, labels = specs.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(specs)
        loss = criterion(outputs, labels)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        total_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

        if batch_idx % 20 == 0:
            logger.info(f"Epoch {epoch} [{batch_idx}/{len(dataloader)}] Loss: {loss.item():.4f}")

    return total_loss / len(dataloader), 100.0 * correct / total


@torch.no_grad()
def evaluate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> tuple[float, float, float]:
    model.eval()
    total_loss = 0.0
    all_preds: list[int] = []
    all_labels: list[int] = []

    for specs, labels in dataloader:
        specs, labels = specs.to(device), labels.to(device)
        outputs = model(specs)
        loss = criterion(outputs, labels)
        total_loss += loss.item()

        _, predicted = outputs.max(1)
        all_preds.extend(predicted.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

    avg_loss = total_loss / len(dataloader)
    accuracy = 100.0 * np.mean(np.array(all_preds) == np.array(all_labels))
    f1 = f1_score(all_labels, all_preds, average="macro") * 100

    return avg_loss, accuracy, f1


def main():
    parser = argparse.ArgumentParser(description="Train Voice Stress CNN")
    parser.add_argument("--data-dir", type=str, default="../data/datasets/ravdess")
    parser.add_argument("--output-dir", type=str, default="../data/pretrained")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--n-mfcc", type=int, default=40)
    parser.add_argument("--max-len", type=int, default=128)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load data
    file_paths, labels = load_ravdess(args.data_dir)
    if len(file_paths) == 0:
        logger.error("No audio data found! Download RAVDESS first:")
        logger.error("  wget https://zenodo.org/record/1188976/files/Audio_Speech_Actors_01-24.zip")
        logger.error("  unzip Audio_Speech_Actors_01-24.zip -d ../data/datasets/ravdess")
        sys.exit(1)

    # Split data
    train_paths, val_paths, train_labels, val_labels = train_test_split(
        file_paths, labels, test_size=0.15, random_state=42, stratify=labels
    )

    train_dataset = VoiceDataset(train_paths, train_labels, n_mfcc=args.n_mfcc, max_len=args.max_len)
    val_dataset = VoiceDataset(val_paths, val_labels, n_mfcc=args.n_mfcc, max_len=args.max_len)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=4, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=4, pin_memory=True)

    # Model
    model = RawSpectrogramCNN(num_classes=NUM_CLASSES).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)

    best_f1 = 0.0
    history: list[dict] = []

    logger.info(f"Training for {args.epochs} epochs")
    logger.info(f"Train: {len(train_dataset)}, Val: {len(val_dataset)}")

    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device, epoch)
        val_loss, val_acc, val_f1 = evaluate(model, val_loader, criterion, device)
        scheduler.step()

        logger.info(
            f"Epoch {epoch}/{args.epochs} — "
            f"Train: {train_loss:.4f}/{train_acc:.1f}% | "
            f"Val: {val_loss:.4f}/{val_acc:.1f}%/F1={val_f1:.1f}%"
        )

        history.append({
            "epoch": epoch,
            "train_loss": train_loss,
            "train_acc": train_acc,
            "val_loss": val_loss,
            "val_acc": val_acc,
            "val_f1": val_f1,
        })

        if val_f1 > best_f1:
            best_f1 = val_f1
            torch.save(model.state_dict(), output_dir / "voice_cnn.pt")
            logger.info(f"New best F1: {val_f1:.2f}% — Saved")

    logger.info(f"\nTraining complete. Best F1: {best_f1:.2f}%")

    with open(output_dir / "voice_training_history.json", "w") as f:
        json.dump(history, f, indent=2)


if __name__ == "__main__":
    main()
