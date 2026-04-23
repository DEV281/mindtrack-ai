"""Pydantic schemas for analysis results."""

from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class EmotionScores(BaseModel):
    """Individual emotion probabilities."""
    neutral: float = 0.0
    happy: float = 0.0
    tense: float = 0.0
    anxious: float = 0.0
    sad: float = 0.0
    fear: float = 0.0
    surprised: float = 0.0


class AnalysisResult(BaseModel):
    """Real-time analysis result sent via WebSocket."""
    stress: float = Field(0.0, ge=0, le=100)
    anxiety: float = Field(0.0, ge=0, le=100)
    stability: float = Field(0.0, ge=0, le=100)
    depression_risk: float = Field(0.0, ge=0, le=100)
    overall_risk: float = Field(0.0, ge=0, le=100)
    emotions: EmotionScores = EmotionScores()
    voice_freq: float = 0.0
    voice_amplitude: float = 0.0
    micro_expression_pct: float = 0.0
    confidence: float = 0.0
    model_rank: int = 1
    alerts: List[str] = []


class AnalysisFrame(BaseModel):
    """Incoming frame data from WebSocket client."""
    video_frame: Optional[str] = None  # base64 encoded
    audio_chunk: Optional[str] = None  # base64 encoded
    timestamp: Optional[float] = None


class ReportResponse(BaseModel):
    """Session report response."""
    id: str
    session_id: str
    user_id: str
    generated_at: str
    summary_text: Optional[str] = None
    peak_stress: Optional[float] = None
    avg_stress: Optional[float] = None
    recommendations: List[str] = []
    readings: List[AnalysisResult] = []


class ReportListResponse(BaseModel):
    """List of report summaries."""
    reports: List[ReportResponse]
    total: int


class DatasetInfo(BaseModel):
    """Dataset information for the browser."""
    name: str
    full_name: str
    description: str
    source_paper: str
    download_url: str
    num_samples: int
    num_classes: int
    size_description: str
    classes: List[str]
    preprocessing_steps: List[str]
    trains_model: str
    is_available: bool = False
    distribution: Dict[str, int] = {}


class BenchmarkResult(BaseModel):
    """Model benchmark comparison result."""
    rank: int
    cnn_architecture: str
    mfcc_architecture: str
    lstm_architecture: str
    cnn_f1: float
    mfcc_f1: float
    lstm_f1: float
    combined_f1: float
    auc_roc: float
    accuracy: float
    precision_score: float
    recall_score: float


class ConsultQuestion(BaseModel):
    """Structured consultation question."""
    index: int
    question: str
    category: str  # "PHQ-9" or "GAD-7"
    options: List[Dict[str, object]]


class ConsultAssessmentResult(BaseModel):
    """Consultation assessment result."""
    phq9_score: int
    phq9_severity: str
    gad7_score: int
    gad7_severity: str
    total_score: int
    distress_level: str
    recommendations: List[str]
    crisis_flag: bool = False
