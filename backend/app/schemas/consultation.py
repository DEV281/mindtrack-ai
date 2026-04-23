"""Pydantic schemas for the consultation system."""

from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ConsultationStartRequest(BaseModel):
    """Request to start a new consultation."""
    mode: str = Field(default="live", pattern="^(live|assessment|free)$")
    model_rank: int = Field(default=1, ge=1, le=3)


class ConsultationStartResponse(BaseModel):
    """Response after starting a consultation."""
    consultation_id: str
    websocket_url: str
    mode: str
    model_rank: int
    started_at: str


class ConsultationMessageResponse(BaseModel):
    """Single message in a consultation."""
    id: str
    sender: str
    message_text: str
    timestamp: str
    stress_at_message: Optional[float] = None
    anxiety_at_message: Optional[float] = None
    emotions_json: Optional[Dict[str, float]] = None
    is_assessment_question: bool = False
    assessment_q_index: Optional[int] = None
    assessment_answer: Optional[int] = None
    voice_transcript: Optional[str] = None
    input_method: str = "text"


class AssessmentResultResponse(BaseModel):
    """PHQ-9 + GAD-7 result."""
    id: str
    consultation_id: str
    phq9_score: int
    gad7_score: int
    phq9_level: str
    gad7_level: str
    q9_positive: bool
    q17_positive: bool
    completed_at: str
    recommendations: List[str] = []


class ConsultationEndResponse(BaseModel):
    """Response after ending a consultation."""
    consultation_id: str
    duration_seconds: int
    summary: str
    phq9_score: Optional[int] = None
    gad7_score: Optional[int] = None
    final_risk_score: Optional[float] = None
    recommendations: List[str] = []


class ConsultationSummaryResponse(BaseModel):
    """Summary info for a consultation in list views."""
    id: str
    user_id: str
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: Optional[int] = None
    model_rank: int
    mode: str
    status: str
    final_risk_score: Optional[float] = None
    message_count: int = 0
    assessment_completed: bool = False
    phq9_score: Optional[int] = None
    gad7_score: Optional[int] = None


class ConsultationListResponse(BaseModel):
    """Paginated list of consultations."""
    consultations: List[ConsultationSummaryResponse]
    total: int
    page: int
    page_size: int


class ConsultationHistoryResponse(BaseModel):
    """Full conversation history for a consultation."""
    consultation_id: str
    mode: str
    status: str
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: Optional[int] = None
    model_rank: int
    final_risk_score: Optional[float] = None
    messages: List[ConsultationMessageResponse]
    assessment_result: Optional[AssessmentResultResponse] = None


class ConsultationWSMessage(BaseModel):
    """Message sent over WebSocket during consultation."""
    type: str  # "message", "assessment_answer", "switch_mode", "switch_model"
    text: Optional[str] = None
    frame: Optional[str] = None  # base64 video frame
    audio: Optional[str] = None  # base64 audio chunk
    answer: Optional[int] = None  # 0-3 for assessment answers
    question_index: Optional[int] = None
    mode: Optional[str] = None  # for switch_mode
    model_rank: Optional[int] = None  # for switch_model
    voice_transcript: Optional[str] = None  # raw voice transcript
    input_method: str = "text"  # 'text' or 'voice'
