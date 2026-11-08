# MindTrack AI v4 — Training Results

This directory contains evaluation artifacts produced by the ML training pipeline.

## Files

| File | Description |
|------|-------------|
| `confusion_matrix.png` | 7×7 confusion matrix heatmap for the ViT facial emotion model on the held-out FER2013 test set. |
| `classification_report.json` | Per-class precision, recall, F1, and support for all 7 emotion classes. |
| `roc_auc_scores.json` | One-vs-rest ROC AUC for each emotion class. |
| `training_curves.png` | Training loss and validation macro F1 over all epochs. |
| `metrics_summary.json` | Complete metrics summary: best validation F1, test macro F1, test accuracy, per-class F1, training time, model parameters, and more. |
| `splits/fer2013_splits.json` | Reproducible train/val/test split indices (seed 42). Loaded on subsequent runs to ensure identical splits. |

## How These Files Are Generated

Run the training script:

```bash
cd ml_training
python train_facial_vit.py
```

Or use the Colab notebook: `ml_training/colab_train.ipynb`

All results are saved automatically at the end of training. The `metrics_summary.json` file is the proof that real training occurred — it contains timestamps, epoch counts, and measured metrics.

## Model Weights

The trained model checkpoint is saved to `data/pretrained/vit_fer2013_best.pt` (not in this directory). When this file exists, the application automatically uses the real ViT model for facial emotion recognition instead of demo mode.

## What Is Real vs. Not Yet Trained

### ✅ Real (produces actual trained weights)
- **Facial Emotion Model** — ViT-Base fine-tuned on FER2013 (7 emotion classes). All results in this directory are from real training.

### 🔬 Architecturally Defined but Not Yet Trained
- **Voice Stress Model** — Raw Spectrogram CNN. Requires DAIC-WOZ dataset (restricted access via AVEC challenge).
- **Temporal Sequence Model** — Mamba SSM. Requires IEMOCAP dataset (academic license from USC).

These models have their architectures defined in the codebase (`backend/app/models/`) but cannot be trained until the respective datasets are obtained. The application runs in demo mode for voice and temporal modalities until real weights are available.

## Reproducing Results

To verify reproducibility:

```bash
cd ml_training
python evaluate_saved_model.py --checkpoint ../data/pretrained/vit_fer2013_best.pt
```

This loads the saved checkpoint and reruns full evaluation on the same held-out test set. Results should be identical to those produced during training (same seed, same split).
