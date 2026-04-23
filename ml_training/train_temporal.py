"""
MindTrack AI — Mamba SSM Temporal Model Training
Trains Mamba/S4 structured state space model on IEMOCAP temporal sequences
"""
import os
import sys
import json
import logging
import argparse
import math
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from sklearn.metrics import f1_score

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

IEMOCAP_CLASSES = ["happy", "sad", "angry", "neutral"]
NUM_CLASSES = len(IEMOCAP_CLASSES)
FEATURE_DIM = 128  # Combined facial + voice feature dimension


class SelectiveScanSSM(nn.Module):
    """Simplified Mamba-style Selective Scan State Space Model."""

    def __init__(self, d_model: int = 64, state_dim: int = 16, dt_rank: int = 8, d_inner: int = 32):
        super().__init__()
        self.d_model = d_model
        self.state_dim = state_dim
        self.dt_rank = dt_rank
        self.d_inner = d_inner

        # Input projection
        self.in_proj = nn.Linear(d_model, d_inner * 2)

        # SSM parameters
        self.A_log = nn.Parameter(torch.randn(d_inner, state_dim))
        self.D = nn.Parameter(torch.ones(d_inner))

        # Selective parameters (data-dependent)
        self.x_proj = nn.Linear(d_inner, dt_rank + state_dim * 2, bias=False)
        self.dt_proj = nn.Linear(dt_rank, d_inner, bias=True)

        # Output projection
        self.out_proj = nn.Linear(d_inner, d_model)

        # Normalization
        self.norm = nn.LayerNorm(d_inner)

        self._init_weights()

    def _init_weights(self):
        # Initialize A with HiPPO matrix approximation
        A = torch.arange(1, self.state_dim + 1, dtype=torch.float32).unsqueeze(0).repeat(self.d_inner, 1)
        self.A_log.data = torch.log(A)
        nn.init.uniform_(self.dt_proj.bias, -4.0, -2.0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, d_model)
        Returns:
            (batch, seq_len, d_model)
        """
        batch, seq_len, _ = x.shape

        # Project input
        xz = self.in_proj(x)  # (batch, seq_len, 2*d_inner)
        x_in, z = xz.chunk(2, dim=-1)  # each (batch, seq_len, d_inner)

        # Compute selective scan parameters
        x_dbl = self.x_proj(x_in)  # (batch, seq_len, dt_rank + 2*state_dim)
        dt, B, C = x_dbl.split([self.dt_rank, self.state_dim, self.state_dim], dim=-1)

        dt = torch.softplus(self.dt_proj(dt))  # (batch, seq_len, d_inner)

        # Discretize A
        A = -torch.exp(self.A_log)  # (d_inner, state_dim)

        # Linear recurrence (selective scan)
        y = self._selective_scan(x_in, dt, A, B, C)

        # Gate and project
        y = self.norm(y)
        y = y * torch.silu(z)
        y = self.out_proj(y)

        return y

    def _selective_scan(
        self,
        u: torch.Tensor,
        dt: torch.Tensor,
        A: torch.Tensor,
        B: torch.Tensor,
        C: torch.Tensor,
    ) -> torch.Tensor:
        """Simple selective scan implementation."""
        batch, seq_len, d_inner = u.shape
        state_dim = A.shape[1]

        # Initialize state
        h = torch.zeros(batch, d_inner, state_dim, device=u.device, dtype=u.dtype)
        outputs = []

        for t in range(seq_len):
            # Discretize for this timestep
            dt_t = dt[:, t, :].unsqueeze(-1)  # (batch, d_inner, 1)
            A_bar = torch.exp(A.unsqueeze(0) * dt_t)  # (batch, d_inner, state_dim)
            B_t = B[:, t, :].unsqueeze(1).expand(-1, d_inner, -1)  # (batch, d_inner, state_dim)
            B_bar = dt_t * B_t

            # State update: h = A_bar * h + B_bar * u
            u_t = u[:, t, :].unsqueeze(-1)  # (batch, d_inner, 1)
            h = A_bar * h + B_bar * u_t

            # Output: y = C * h + D * u
            C_t = C[:, t, :].unsqueeze(1).expand(-1, d_inner, -1)  # (batch, d_inner, state_dim)
            y_t = (C_t * h).sum(dim=-1) + self.D * u[:, t, :]  # (batch, d_inner)
            outputs.append(y_t)

        return torch.stack(outputs, dim=1)  # (batch, seq_len, d_inner)


class MambaTemporalModel(nn.Module):
    """Full Mamba-based temporal stress analysis model."""

    def __init__(
        self,
        input_dim: int = FEATURE_DIM,
        d_model: int = 64,
        n_layers: int = 4,
        state_dim: int = 16,
        d_inner: int = 32,
        num_classes: int = NUM_CLASSES,
    ):
        super().__init__()
        self.input_proj = nn.Linear(input_dim, d_model)
        self.pos_embed = nn.Parameter(torch.randn(1, 100, d_model) * 0.02)

        self.layers = nn.ModuleList([
            nn.ModuleDict({
                "ssm": SelectiveScanSSM(d_model, state_dim, d_inner=d_inner),
                "norm": nn.LayerNorm(d_model),
                "ffn": nn.Sequential(
                    nn.Linear(d_model, d_model * 4),
                    nn.GELU(),
                    nn.Dropout(0.1),
                    nn.Linear(d_model * 4, d_model),
                    nn.Dropout(0.1),
                ),
                "ffn_norm": nn.LayerNorm(d_model),
            })
            for _ in range(n_layers)
        ])

        self.head = nn.Sequential(
            nn.LayerNorm(d_model),
            nn.Linear(d_model, 128),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, seq_len, input_dim)
        Returns:
            (batch, num_classes)
        """
        batch, seq_len, _ = x.shape
        x = self.input_proj(x)
        x = x + self.pos_embed[:, :seq_len, :]

        for layer in self.layers:
            # SSM block with residual
            residual = x
            x = layer["norm"](x)
            x = layer["ssm"](x) + residual

            # FFN block with residual
            residual = x
            x = layer["ffn_norm"](x)
            x = layer["ffn"](x) + residual

        # Pool over sequence
        x = x.mean(dim=1)  # (batch, d_model)
        return self.head(x)


class TemporalDataset(Dataset):
    """Dataset for temporal sequences."""

    def __init__(self, sequences: np.ndarray, labels: np.ndarray):
        self.sequences = torch.FloatTensor(sequences)
        self.labels = torch.LongTensor(labels)

    def __len__(self) -> int:
        return len(self.labels)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        return self.sequences[idx], self.labels[idx]


def generate_synthetic_data(n_samples: int = 2000, seq_len: int = 5) -> tuple[np.ndarray, np.ndarray]:
    """Generate synthetic temporal data for training when IEMOCAP is unavailable."""
    logger.info(f"Generating {n_samples} synthetic temporal sequences")
    sequences = []
    labels = []

    for _ in range(n_samples):
        label = np.random.randint(0, NUM_CLASSES)
        # Create class-specific temporal patterns
        base = np.random.randn(seq_len, FEATURE_DIM) * 0.5

        if label == 0:  # happy - stable, positive features
            base[:, :32] += 1.2
            base[:, 64:96] += 0.8
        elif label == 1:  # sad - declining pattern
            for t in range(seq_len):
                base[t, :32] -= 0.3 * t
                base[t, 96:] += 0.2 * t
        elif label == 2:  # angry - spiky, high variance
            base[:, 32:64] += np.random.randn(seq_len, 32) * 1.5
            base[:, :32] += 0.8
        else:  # neutral - moderate baseline
            base += np.random.randn(seq_len, FEATURE_DIM) * 0.2

        sequences.append(base)
        labels.append(label)

    return np.array(sequences, dtype=np.float32), np.array(labels, dtype=np.int64)


def train_one_epoch(model, dataloader, criterion, optimizer, device, epoch):
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (seqs, labels) in enumerate(dataloader):
        seqs, labels = seqs.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(seqs)
        loss = criterion(outputs, labels)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        total_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    return total_loss / len(dataloader), 100.0 * correct / total


@torch.no_grad()
def evaluate(model, dataloader, criterion, device):
    model.eval()
    total_loss = 0.0
    all_preds, all_labels = [], []

    for seqs, labels in dataloader:
        seqs, labels = seqs.to(device), labels.to(device)
        outputs = model(seqs)
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
    parser = argparse.ArgumentParser(description="Train Mamba SSM Temporal Model")
    parser.add_argument("--data-dir", type=str, default="../data/datasets/iemocap")
    parser.add_argument("--output-dir", type=str, default="../data/pretrained")
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=5e-4)
    parser.add_argument("--seq-len", type=int, default=5)
    parser.add_argument("--d-model", type=int, default=64)
    parser.add_argument("--n-layers", type=int, default=4)
    parser.add_argument("--state-dim", type=int, default=16)
    parser.add_argument("--synthetic", action="store_true", help="Use synthetic data if real data unavailable")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load or generate data
    iemocap_dir = Path(args.data_dir)
    if iemocap_dir.exists() and not args.synthetic:
        logger.info("Loading IEMOCAP data...")
        # Load preprocessed sequences (expected format: .npy files)
        try:
            sequences = np.load(iemocap_dir / "sequences.npy")
            labels = np.load(iemocap_dir / "labels.npy")
        except FileNotFoundError:
            logger.warning("Preprocessed IEMOCAP data not found, using synthetic data")
            sequences, labels = generate_synthetic_data(2000, args.seq_len)
    else:
        logger.info("IEMOCAP data not found — using synthetic data for training")
        sequences, labels = generate_synthetic_data(2000, args.seq_len)

    # Split
    n_train = int(0.7 * len(labels))
    n_val = int(0.15 * len(labels))
    indices = np.random.permutation(len(labels))
    train_idx = indices[:n_train]
    val_idx = indices[n_train:n_train + n_val]

    train_dataset = TemporalDataset(sequences[train_idx], labels[train_idx])
    val_dataset = TemporalDataset(sequences[val_idx], labels[val_idx])

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=2)

    # Model
    model = MambaTemporalModel(
        input_dim=FEATURE_DIM,
        d_model=args.d_model,
        n_layers=args.n_layers,
        state_dim=args.state_dim,
        num_classes=NUM_CLASSES,
    ).to(device)

    param_count = sum(p.numel() for p in model.parameters() if p.requires_grad)
    logger.info(f"Model parameters: {param_count:,}")

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)

    best_f1 = 0.0
    history: list[dict] = []

    for epoch in range(1, args.epochs + 1):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device, epoch)
        val_loss, val_acc, val_f1 = evaluate(model, val_loader, criterion, device)
        scheduler.step()

        logger.info(f"Epoch {epoch}/{args.epochs} — Train: {train_loss:.4f}/{train_acc:.1f}% | Val: {val_loss:.4f}/{val_acc:.1f}%/F1={val_f1:.1f}%")
        history.append({"epoch": epoch, "train_loss": train_loss, "train_acc": train_acc, "val_loss": val_loss, "val_acc": val_acc, "val_f1": val_f1})

        if val_f1 > best_f1:
            best_f1 = val_f1
            torch.save(model.state_dict(), output_dir / "temporal_mamba.pt")
            logger.info(f"New best F1: {val_f1:.2f}%")

    logger.info(f"\nTraining complete. Best F1: {best_f1:.2f}%")
    with open(output_dir / "temporal_training_history.json", "w") as f:
        json.dump(history, f, indent=2)


if __name__ == "__main__":
    main()
