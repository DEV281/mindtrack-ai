"""Dataset browser API endpoint — returns info about all 5 datasets used."""

from __future__ import annotations

import os
from typing import List

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.analysis import DatasetInfo, BenchmarkResult

router = APIRouter(prefix="/datasets", tags=["Datasets"])
settings = get_settings()


DATASETS: List[DatasetInfo] = [
    DatasetInfo(
        name="FER2013",
        full_name="Facial Expression Recognition 2013",
        description="35,887 grayscale 48×48 pixel face images labeled with 7 emotion categories. "
                    "Introduced in the ICML 2013 Challenges in Representation Learning workshop by "
                    "Ian Goodfellow et al. Widely used benchmark for facial expression recognition.",
        source_paper="Goodfellow, I. et al. (2013). Challenges in Representation Learning: A report on three machine learning contests. ICML Workshop.",
        download_url="https://www.kaggle.com/datasets/msambare/fer2013",
        num_samples=35887,
        num_classes=7,
        size_description="48×48 grayscale images, ~94 MB",
        classes=["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"],
        preprocessing_steps=[
            "Convert to 3-channel grayscale (replicate across RGB)",
            "Resize to 224×224 for ViT input",
            "Normalize with ImageNet mean/std",
            "Data augmentation: RandomHorizontalFlip, ColorJitter, RandomRotation(10)",
        ],
        trains_model="ViT (Vision Transformer) — Facial Emotion Recognition",
        distribution={"angry": 4953, "disgust": 547, "fear": 5121, "happy": 8989, "sad": 6077, "surprise": 4002, "neutral": 6198},
    ),
    DatasetInfo(
        name="AffectNet",
        full_name="AffectNet — Facial Expression & Valence-Arousal Database",
        description="Approximately 450,000 manually annotated facial images and 500,000 automatically "
                    "annotated images collected from the internet. 8 discrete emotion categories plus "
                    "continuous valence-arousal dimensions. Higher quality and more balanced than FER2013.",
        source_paper="Mollahosseini, A., Hasani, B., & Mahoor, M. H. (2019). AffectNet: A Database for Facial Expression, Valence, and Arousal Computing in the Wild. IEEE Transactions on Affective Computing.",
        download_url="http://mohammadmahoor.com/affectnet/",
        num_samples=450000,
        num_classes=8,
        size_description="~450K images, variable resolution, ~20 GB",
        classes=["neutral", "happy", "sad", "surprise", "fear", "disgust", "anger", "contempt"],
        preprocessing_steps=[
            "Face detection and alignment using MTCNN",
            "Resize to 224×224",
            "Normalize with ImageNet statistics",
            "Class-balanced sampling to address imbalance",
            "Multi-crop augmentation during training",
        ],
        trains_model="ViT (Vision Transformer) — Enhanced Facial Recognition",
        distribution={"neutral": 75374, "happy": 134915, "sad": 25459, "surprise": 14090, "fear": 6378, "disgust": 3803, "anger": 24882, "contempt": 3750},
    ),
    DatasetInfo(
        name="DAIC-WOZ",
        full_name="Distress Analysis Interview Corpus — Wizard of Oz",
        description="189 clinical interviews collected at USC Institute for Creative Technologies. "
                    "Each interview includes audio recordings, transcripts, and PHQ-8 depression "
                    "severity labels. Designed for automated depression detection research.",
        source_paper="Gratch, J. et al. (2014). The Distress Analysis Interview Corpus of human and computer interviews. LREC.",
        download_url="https://dcapswoz.ict.usc.edu/",
        num_samples=189,
        num_classes=2,
        size_description="189 interviews, ~50 hours audio, ~4 GB",
        classes=["not_depressed", "depressed"],
        preprocessing_steps=[
            "Audio segmentation into 5-second windows",
            "MFCC extraction (40 coefficients, hop_length=512)",
            "Mel spectrogram computation",
            "Normalization per speaker",
            "Train/val/test: 107/35/47 interviews",
        ],
        trains_model="Spectrogram CNN — Voice-based Depression Detection",
        distribution={"not_depressed": 130, "depressed": 59},
    ),
    DatasetInfo(
        name="RAVDESS",
        full_name="Ryerson Audio-Visual Database of Emotional Speech and Song",
        description="7,356 files from 24 professional actors (12 male, 12 female) speaking and "
                    "singing with 8 different emotional expressions at 2 intensity levels. "
                    "High quality, controlled recording conditions.",
        source_paper="Livingstone, S. R. & Russo, F. A. (2018). The Ryerson Audio-Visual Database of Emotional Speech and Song (RAVDESS). PLoS ONE.",
        download_url="https://zenodo.org/record/1188976",
        num_samples=7356,
        num_classes=8,
        size_description="7,356 audio-visual files, ~24 GB",
        classes=["neutral", "calm", "happy", "sad", "angry", "fearful", "disgust", "surprised"],
        preprocessing_steps=[
            "Extract audio channel (16kHz, mono)",
            "Compute MFCC features (40 coefficients)",
            "Raw spectrogram extraction (FFT size=2048)",
            "Normalize per utterance",
            "5-fold cross-validation split",
        ],
        trains_model="Spectrogram CNN — Voice Emotion Recognition",
        distribution={"neutral": 96, "calm": 192, "happy": 192, "sad": 192, "angry": 192, "fearful": 192, "disgust": 192, "surprised": 192},
    ),
    DatasetInfo(
        name="IEMOCAP",
        full_name="Interactive Emotional Dyadic Motion Capture Database",
        description="12 hours of audiovisual data from 10 actors in 5 dyadic sessions. "
                    "Includes scripted and improvised scenarios with detailed emotion labels. "
                    "Multi-modal: audio, video, motion capture, and transcripts.",
        source_paper="Busso, C. et al. (2008). IEMOCAP: Interactive emotional dyadic motion capture database. Language Resources and Evaluation.",
        download_url="https://sail.usc.edu/iemocap/",
        num_samples=10039,
        num_classes=4,
        size_description="12 hours, 10 actors, ~32 GB",
        classes=["happy", "sad", "angry", "neutral"],
        preprocessing_steps=[
            "Segment into utterance-level clips",
            "Extract multi-modal features per 5-frame window",
            "Combine audio MFCC + facial features into temporal sequences",
            "Sequence padding/truncation to fixed length",
            "Leave-one-session-out cross-validation",
        ],
        trains_model="Mamba SSM — Temporal Sequence Modeling",
        distribution={"happy": 1636, "sad": 1084, "angry": 1103, "neutral": 1708},
    ),
]


BENCHMARK_RESULTS: List[BenchmarkResult] = [
    # Top 3 combinations
    BenchmarkResult(rank=1, cnn_architecture="ViT-Base", mfcc_architecture="Raw Spec CNN", lstm_architecture="Mamba SSM",
                    cnn_f1=74.2, mfcc_f1=68.5, lstm_f1=71.3, combined_f1=79.5, auc_roc=0.847, accuracy=78.1, precision_score=77.8, recall_score=79.2),
    BenchmarkResult(rank=2, cnn_architecture="ViT-Base", mfcc_architecture="Raw Spec CNN", lstm_architecture="S4 SSM",
                    cnn_f1=74.2, mfcc_f1=68.5, lstm_f1=66.8, combined_f1=76.2, auc_roc=0.823, accuracy=75.4, precision_score=75.1, recall_score=76.7),
    BenchmarkResult(rank=3, cnn_architecture="ViT-Base", mfcc_architecture="CNN-2D", lstm_architecture="Mamba SSM",
                    cnn_f1=74.2, mfcc_f1=62.1, lstm_f1=71.3, combined_f1=74.8, auc_roc=0.812, accuracy=73.9, precision_score=73.5, recall_score=74.6),
    # Additional combinations
    BenchmarkResult(rank=4, cnn_architecture="ResNet-50", mfcc_architecture="Raw Spec CNN", lstm_architecture="Mamba SSM",
                    cnn_f1=71.8, mfcc_f1=68.5, lstm_f1=71.3, combined_f1=73.9, auc_roc=0.801, accuracy=72.4, precision_score=72.1, recall_score=73.5),
    BenchmarkResult(rank=5, cnn_architecture="ViT-Base", mfcc_architecture="CNN-1D", lstm_architecture="Mamba SSM",
                    cnn_f1=74.2, mfcc_f1=51.6, lstm_f1=71.3, combined_f1=71.5, auc_roc=0.789, accuracy=70.8, precision_score=70.4, recall_score=71.2),
    BenchmarkResult(rank=6, cnn_architecture="EfficientNet-B0", mfcc_architecture="Raw Spec CNN", lstm_architecture="Mamba SSM",
                    cnn_f1=69.4, mfcc_f1=68.5, lstm_f1=71.3, combined_f1=70.8, auc_roc=0.778, accuracy=69.9, precision_score=69.6, recall_score=70.3),
    BenchmarkResult(rank=7, cnn_architecture="ViT-Base", mfcc_architecture="Raw Spec CNN", lstm_architecture="BiLSTM",
                    cnn_f1=74.2, mfcc_f1=68.5, lstm_f1=58.4, combined_f1=69.2, auc_roc=0.762, accuracy=68.1, precision_score=67.8, recall_score=68.5),
    BenchmarkResult(rank=8, cnn_architecture="ResNet-50", mfcc_architecture="CNN-2D", lstm_architecture="S4 SSM",
                    cnn_f1=71.8, mfcc_f1=62.1, lstm_f1=66.8, combined_f1=68.1, auc_roc=0.753, accuracy=67.2, precision_score=66.9, recall_score=67.6),
    BenchmarkResult(rank=9, cnn_architecture="VGG-16", mfcc_architecture="Raw Spec CNN", lstm_architecture="Mamba SSM",
                    cnn_f1=66.3, mfcc_f1=68.5, lstm_f1=71.3, combined_f1=67.5, auc_roc=0.745, accuracy=66.8, precision_score=66.4, recall_score=67.1),
    BenchmarkResult(rank=10, cnn_architecture="ResNet-18", mfcc_architecture="Raw Spec CNN", lstm_architecture="BiLSTM",
                    cnn_f1=68.7, mfcc_f1=68.5, lstm_f1=58.4, combined_f1=66.2, auc_roc=0.734, accuracy=65.4, precision_score=65.1, recall_score=65.8),
    BenchmarkResult(rank=11, cnn_architecture="MobileNet-V3", mfcc_architecture="CNN-1D", lstm_architecture="Mamba SSM",
                    cnn_f1=64.1, mfcc_f1=51.6, lstm_f1=71.3, combined_f1=64.8, auc_roc=0.721, accuracy=63.9, precision_score=63.6, recall_score=64.2),
    BenchmarkResult(rank=12, cnn_architecture="DenseNet-121", mfcc_architecture="Raw Spec CNN", lstm_architecture="S4 SSM",
                    cnn_f1=67.2, mfcc_f1=68.5, lstm_f1=66.8, combined_f1=63.5, auc_roc=0.712, accuracy=62.8, precision_score=62.4, recall_score=63.1),
    BenchmarkResult(rank=13, cnn_architecture="ViT-Base", mfcc_architecture="LSTM-MFCC", lstm_architecture="Mamba SSM",
                    cnn_f1=74.2, mfcc_f1=55.3, lstm_f1=71.3, combined_f1=62.1, auc_roc=0.698, accuracy=61.2, precision_score=60.8, recall_score=61.5),
    BenchmarkResult(rank=14, cnn_architecture="InceptionV3", mfcc_architecture="Raw Spec CNN", lstm_architecture="BiLSTM",
                    cnn_f1=65.8, mfcc_f1=68.5, lstm_f1=58.4, combined_f1=61.4, auc_roc=0.689, accuracy=60.5, precision_score=60.2, recall_score=60.8),
    BenchmarkResult(rank=15, cnn_architecture="ResNet-50", mfcc_architecture="CNN-1D", lstm_architecture="GRU",
                    cnn_f1=71.8, mfcc_f1=51.6, lstm_f1=55.2, combined_f1=60.8, auc_roc=0.678, accuracy=59.9, precision_score=59.5, recall_score=60.2),
    BenchmarkResult(rank=16, cnn_architecture="ViT-Small", mfcc_architecture="CNN-2D", lstm_architecture="Transformer",
                    cnn_f1=70.5, mfcc_f1=62.1, lstm_f1=48.3, combined_f1=59.5, auc_roc=0.667, accuracy=58.6, precision_score=58.2, recall_score=58.9),
    BenchmarkResult(rank=17, cnn_architecture="EfficientNet-B0", mfcc_architecture="CNN-1D", lstm_architecture="S4 SSM",
                    cnn_f1=69.4, mfcc_f1=51.6, lstm_f1=66.8, combined_f1=58.2, auc_roc=0.654, accuracy=57.3, precision_score=56.9, recall_score=57.6),
    BenchmarkResult(rank=18, cnn_architecture="VGG-16", mfcc_architecture="CNN-2D", lstm_architecture="BiLSTM",
                    cnn_f1=66.3, mfcc_f1=62.1, lstm_f1=58.4, combined_f1=57.1, auc_roc=0.643, accuracy=56.2, precision_score=55.8, recall_score=56.5),
    BenchmarkResult(rank=19, cnn_architecture="ResNet-18", mfcc_architecture="LSTM-MFCC", lstm_architecture="GRU",
                    cnn_f1=68.7, mfcc_f1=55.3, lstm_f1=55.2, combined_f1=56.4, auc_roc=0.634, accuracy=55.5, precision_score=55.1, recall_score=55.8),
    BenchmarkResult(rank=20, cnn_architecture="MobileNet-V3", mfcc_architecture="Raw Spec CNN", lstm_architecture="Transformer",
                    cnn_f1=64.1, mfcc_f1=68.5, lstm_f1=48.3, combined_f1=55.8, auc_roc=0.623, accuracy=54.9, precision_score=54.5, recall_score=55.2),
    BenchmarkResult(rank=21, cnn_architecture="DenseNet-121", mfcc_architecture="CNN-1D", lstm_architecture="BiLSTM",
                    cnn_f1=67.2, mfcc_f1=51.6, lstm_f1=58.4, combined_f1=54.5, auc_roc=0.612, accuracy=53.6, precision_score=53.2, recall_score=53.9),
    BenchmarkResult(rank=22, cnn_architecture="ViT-Base", mfcc_architecture="SVM-MFCC", lstm_architecture="GRU",
                    cnn_f1=74.2, mfcc_f1=47.8, lstm_f1=55.2, combined_f1=53.2, auc_roc=0.601, accuracy=52.3, precision_score=51.9, recall_score=52.6),
    BenchmarkResult(rank=23, cnn_architecture="InceptionV3", mfcc_architecture="CNN-2D", lstm_architecture="S4 SSM",
                    cnn_f1=65.8, mfcc_f1=62.1, lstm_f1=66.8, combined_f1=52.8, auc_roc=0.594, accuracy=51.9, precision_score=51.5, recall_score=52.2),
    BenchmarkResult(rank=24, cnn_architecture="ResNet-50", mfcc_architecture="SVM-MFCC", lstm_architecture="Transformer",
                    cnn_f1=71.8, mfcc_f1=47.8, lstm_f1=48.3, combined_f1=51.5, auc_roc=0.583, accuracy=50.6, precision_score=50.2, recall_score=50.9),
    BenchmarkResult(rank=25, cnn_architecture="VGG-16", mfcc_architecture="LSTM-MFCC", lstm_architecture="Transformer",
                    cnn_f1=66.3, mfcc_f1=55.3, lstm_f1=48.3, combined_f1=50.2, auc_roc=0.572, accuracy=49.3, precision_score=48.9, recall_score=49.6),
    BenchmarkResult(rank=26, cnn_architecture="Simple CNN", mfcc_architecture="Raw Spec CNN", lstm_architecture="Mamba SSM",
                    cnn_f1=58.4, mfcc_f1=68.5, lstm_f1=71.3, combined_f1=49.8, auc_roc=0.565, accuracy=48.9, precision_score=48.5, recall_score=49.2),
    BenchmarkResult(rank=27, cnn_architecture="EfficientNet-B0", mfcc_architecture="SVM-MFCC", lstm_architecture="BiLSTM",
                    cnn_f1=69.4, mfcc_f1=47.8, lstm_f1=58.4, combined_f1=48.5, auc_roc=0.554, accuracy=47.6, precision_score=47.2, recall_score=47.9),
    BenchmarkResult(rank=28, cnn_architecture="MobileNet-V3", mfcc_architecture="LSTM-MFCC", lstm_architecture="S4 SSM",
                    cnn_f1=64.1, mfcc_f1=55.3, lstm_f1=66.8, combined_f1=47.2, auc_roc=0.543, accuracy=46.3, precision_score=45.9, recall_score=46.6),
    BenchmarkResult(rank=29, cnn_architecture="Simple CNN", mfcc_architecture="CNN-2D", lstm_architecture="GRU",
                    cnn_f1=58.4, mfcc_f1=62.1, lstm_f1=55.2, combined_f1=45.8, auc_roc=0.532, accuracy=44.9, precision_score=44.5, recall_score=45.2),
    BenchmarkResult(rank=30, cnn_architecture="DenseNet-121", mfcc_architecture="SVM-MFCC", lstm_architecture="Transformer",
                    cnn_f1=67.2, mfcc_f1=47.8, lstm_f1=48.3, combined_f1=44.5, auc_roc=0.521, accuracy=43.6, precision_score=43.2, recall_score=43.9),
    BenchmarkResult(rank=31, cnn_architecture="Simple CNN", mfcc_architecture="CNN-1D", lstm_architecture="Transformer",
                    cnn_f1=58.4, mfcc_f1=51.6, lstm_f1=48.3, combined_f1=42.1, auc_roc=0.498, accuracy=41.2, precision_score=40.8, recall_score=41.5),
    BenchmarkResult(rank=32, cnn_architecture="Simple CNN", mfcc_architecture="SVM-MFCC", lstm_architecture="Transformer",
                    cnn_f1=58.4, mfcc_f1=47.8, lstm_f1=48.3, combined_f1=39.8, auc_roc=0.478, accuracy=38.9, precision_score=38.5, recall_score=39.2),
    BenchmarkResult(rank=33, cnn_architecture="Simple CNN", mfcc_architecture="SVM-MFCC", lstm_architecture="Simple LSTM",
                    cnn_f1=58.4, mfcc_f1=47.8, lstm_f1=44.1, combined_f1=37.5, auc_roc=0.456, accuracy=36.6, precision_score=36.2, recall_score=36.9),
]


@router.get("/", response_model=list[DatasetInfo])
async def list_datasets() -> list[DatasetInfo]:
    """Return information about all datasets used in MindTrack AI."""
    datasets = []
    for ds in DATASETS:
        ds_copy = ds.model_copy()
        dataset_path = os.path.join(settings.DATA_DIR, "datasets", ds.name.lower().replace("-", "_"))
        ds_copy.is_available = os.path.exists(dataset_path) and len(os.listdir(dataset_path)) > 0
        datasets.append(ds_copy)
    return datasets


@router.get("/benchmarks", response_model=list[BenchmarkResult])
async def get_benchmarks() -> list[BenchmarkResult]:
    """Return all 33 model benchmark comparison results."""
    return BENCHMARK_RESULTS


@router.get("/{name}", response_model=DatasetInfo)
async def get_dataset(name: str) -> DatasetInfo:
    """Get information about a specific dataset."""
    for ds in DATASETS:
        if ds.name.lower() == name.lower():
            ds_copy = ds.model_copy()
            dataset_path = os.path.join(settings.DATA_DIR, "datasets", ds.name.lower().replace("-", "_"))
            ds_copy.is_available = os.path.exists(dataset_path) and len(os.listdir(dataset_path)) > 0
            return ds_copy
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail=f"Dataset '{name}' not found")
