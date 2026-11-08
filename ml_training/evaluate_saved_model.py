#!/usr/bin/env python3
"""Standalone evaluation script for a saved ViT checkpoint.

Loads a trained checkpoint and reruns full evaluation on the held-out
test set. Must produce identical results to the training evaluation.

Usage:
    python evaluate_saved_model.py
    python evaluate_saved_model.py --model-path data/pretrained/vit_fer2013_best.pt
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader, SubsetRandomSampler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Import training utilities
from train_facial_vit import (
    EMOTION_LABELS,
    NUM_CLASSES,
    RESULTS_DIR,
    SEED,
    SPLITS_DIR,
    DATA_DIR,
    ViTEmotionClassifier,
    FER2013ImageDataset,
    FER2013CSVDataset,
    count_parameters,
    full_evaluation,
    get_eval_transform,
    get_splits,
    save_confusion_matrix,
    set_all_seeds,
    validate_dataset,
)


def evaluate_checkpoint(
    model_path: str = "data/pretrained/vit_fer2013_best.pt",
    data_dir: Path = DATA_DIR,
    batch_size: int = 64,
    output_dir: Path = RESULTS_DIR / "evaluation",
) -> None:
    """Load a saved checkpoint and run full evaluation on test set."""
    set_all_seeds(SEED)

    output_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("Evaluation device: %s", device)

    # Validate dataset
    is_valid, dataset_info = validate_dataset(data_dir)
    if not is_valid:
        logger.error("Dataset not found or invalid at %s", data_dir)
        sys.exit(1)

    # Load dataset
    eval_transform = get_eval_transform()

    if dataset_info["format"] == "image_dirs":
        train_dir = data_dir / "train"
        test_dir = data_dir / "test"
        dirs = []
        if train_dir.exists():
            dirs.append(train_dir)
        if test_dir.exists():
            dirs.append(test_dir)
        dataset = FER2013ImageDataset(dirs, transform=eval_transform)
    else:
        csv_path = data_dir / "fer2013.csv"
        if not csv_path.exists():
            csv_path = data_dir / "fer2013" / "fer2013.csv"
        dataset = FER2013CSVDataset(str(csv_path), transform=eval_transform)

    # Load splits
    targets = dataset.targets
    _, _, test_idx = get_splits(targets)

    test_loader = DataLoader(
        dataset,
        batch_size=batch_size,
        sampler=SubsetRandomSampler(test_idx),
        num_workers=2,
        pin_memory=True,
    )

    # Build and load model
    logger.info("Loading model from %s...", model_path)
    if not Path(model_path).exists():
        logger.error("Model file not found: %s", model_path)
        sys.exit(1)

    model = ViTEmotionClassifier()
    checkpoint = torch.load(model_path, map_location=device, weights_only=False)

    if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
        model.load_state_dict(checkpoint["model_state_dict"])
        logger.info(
            "Loaded checkpoint from epoch %d (val_f1=%.4f)",
            checkpoint.get("epoch", -1),
            checkpoint.get("val_f1", -1),
        )
    else:
        model.load_state_dict(checkpoint)

    model.to(device)

    total_params, trainable_params = count_parameters(model)
    logger.info("Model parameters: %s total, %s trainable", f"{total_params:,}", f"{trainable_params:,}")

    # Run full evaluation
    logger.info("Running evaluation on %d test samples...", len(test_idx))
    results = full_evaluation(model, test_loader, device)

    # Save results
    save_confusion_matrix(
        np.array(results["confusion_matrix"]),
        output_dir / "confusion_matrix.png",
    )

    with open(output_dir / "classification_report.json", "w") as f:
        json.dump(results["classification_report"], f, indent=2)

    with open(output_dir / "roc_auc_scores.json", "w") as f:
        json.dump(results["roc_auc_scores"], f, indent=2)

    eval_summary = {
        "model_path": str(model_path),
        "test_accuracy": round(results["accuracy"], 4),
        "test_macro_f1": round(results["macro_f1"], 4),
        "test_macro_precision": round(results["macro_precision"], 4),
        "test_macro_recall": round(results["macro_recall"], 4),
        "per_class_f1": {k: round(v, 4) for k, v in results["per_class_f1"].items()},
        "roc_auc_scores": results["roc_auc_scores"],
        "cpu_inference_latency_ms": results["cpu_inference_latency_ms"],
        "test_samples": len(test_idx),
        "seed": SEED,
    }

    with open(output_dir / "eval_summary.json", "w") as f:
        json.dump(eval_summary, f, indent=2)

    # Compare with training results if available
    training_metrics_path = RESULTS_DIR / "metrics_summary.json"
    if training_metrics_path.exists():
        with open(training_metrics_path) as f:
            training_metrics = json.load(f)
        train_f1 = training_metrics.get("test_macro_f1", -1)
        eval_f1 = results["macro_f1"]
        diff = abs(train_f1 - eval_f1)
        logger.info("Training test F1: %.4f | Evaluation F1: %.4f | Diff: %.6f", train_f1, eval_f1, diff)
        if diff < 0.001:
            logger.info("✓ Results are reproducible (diff < 0.001)")
        else:
            logger.warning("⚠ Results differ by %.6f — check for non-determinism", diff)

    # Print results
    logger.info("=" * 60)
    logger.info("EVALUATION COMPLETE")
    logger.info("=" * 60)
    logger.info("Test Macro F1:  %.4f", results["macro_f1"])
    logger.info("Test Accuracy:  %.4f", results["accuracy"])
    logger.info("CPU Latency:    %.2f ms", results["cpu_inference_latency_ms"])
    logger.info("-" * 60)
    logger.info("Per-class F1:")
    for label, f1_val in results["per_class_f1"].items():
        logger.info("  %-10s %.4f", label, f1_val)
    logger.info("=" * 60)
    logger.info("Results saved to %s/", output_dir)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate saved ViT checkpoint")
    parser.add_argument("--model-path", type=str, default="data/pretrained/vit_fer2013_best.pt")
    parser.add_argument("--data-dir", type=str, default=str(DATA_DIR))
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--output-dir", type=str, default=str(RESULTS_DIR / "evaluation"))
    args = parser.parse_args()

    evaluate_checkpoint(
        model_path=args.model_path,
        data_dir=Path(args.data_dir),
        batch_size=args.batch_size,
        output_dir=Path(args.output_dir),
    )


if __name__ == "__main__":
    main()
