"""Mamba SSM (Selective State Space Model) for temporal pattern analysis."""

from __future__ import annotations

import logging
import math
from typing import Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


class MambaSSMBlock:
    """Mamba Selective State Space Model implementation in PyTorch.

    Parameters:
        d_model: input dimension  
        state_dim: SSM state dimension (N)
        d_inner: inner expansion dimension
        dt_rank: rank for dt projection (auto = ceil(d_model/16))
    """

    def __init__(self, d_model: int = 64, state_dim: int = 16, d_inner: int = 32, dt_rank: str = "auto"):
        self.d_model = d_model
        self.state_dim = state_dim
        self.d_inner = d_inner
        self.dt_rank = math.ceil(d_model / 16) if dt_rank == "auto" else int(dt_rank)
        self.model = None
        self.device = "cpu"
        self._loaded = False

    def build(self) -> None:
        """Build the Mamba SSM PyTorch model."""
        try:
            import torch
            import torch.nn as nn

            self.device = "cuda" if torch.cuda.is_available() else "cpu"

            class SelectiveSSM(nn.Module):
                """Selective State Space Model core."""

                def __init__(self, d_model, state_dim, d_inner, dt_rank):
                    super().__init__()
                    self.d_model = d_model
                    self.state_dim = state_dim
                    self.d_inner = d_inner
                    self.dt_rank = dt_rank

                    # Input projection
                    self.in_proj = nn.Linear(d_model, d_inner * 2, bias=False)

                    # SSM parameters
                    self.A_log = nn.Parameter(torch.randn(d_inner, state_dim))
                    self.D = nn.Parameter(torch.ones(d_inner))

                    # Selective projections (data-dependent)
                    self.x_proj = nn.Linear(d_inner, dt_rank + state_dim * 2, bias=False)
                    self.dt_proj = nn.Linear(dt_rank, d_inner, bias=True)

                    # Output projection
                    self.out_proj = nn.Linear(d_inner, d_model, bias=False)

                    # Layer norm
                    self.norm = nn.LayerNorm(d_model)

                def forward(self, x):
                    """Forward pass: x shape (batch, seq_len, d_model)."""
                    batch, seq_len, _ = x.shape
                    residual = x
                    x = self.norm(x)

                    # Project input
                    xz = self.in_proj(x)
                    x_branch, z = xz.chunk(2, dim=-1)

                    # Compute SSM parameters (data-dependent / selective)
                    x_dbl = self.x_proj(x_branch)
                    dt, B, C = torch.split(x_dbl, [self.dt_rank, self.state_dim, self.state_dim], dim=-1)
                    dt = torch.softplus(self.dt_proj(dt))

                    # Discretize: A_bar = exp(A * dt)
                    A = -torch.exp(self.A_log.float())
                    # Selective scan (simplified linear recurrence)
                    y = self._selective_scan(x_branch, dt, A, B, C)

                    # Residual with D
                    y = y + self.D * x_branch

                    # Gate with z
                    y = y * torch.selu(z)

                    # Output projection
                    y = self.out_proj(y)
                    return y + residual

                def _selective_scan(self, x, dt, A, B, C):
                    """Simplified selective scan with linear recurrence."""
                    batch, seq_len, d_inner = x.shape
                    state_dim = self.state_dim

                    # Initialize hidden state
                    h = torch.zeros(batch, d_inner, state_dim, device=x.device, dtype=x.dtype)
                    outputs = []

                    for t in range(seq_len):
                        # State update: h = A_bar * h + B_bar * x
                        dt_t = dt[:, t, :].unsqueeze(-1)  # (batch, d_inner, 1)
                        A_bar = torch.exp(A.unsqueeze(0) * dt_t)  # (batch, d_inner, state_dim)
                        B_t = B[:, t, :].unsqueeze(1).expand(-1, d_inner, -1)  # (batch, d_inner, state_dim)
                        x_t = x[:, t, :].unsqueeze(-1)  # (batch, d_inner, 1)

                        h = A_bar * h + B_t * x_t
                        # Output: y = C * h
                        C_t = C[:, t, :].unsqueeze(1).expand(-1, d_inner, -1)  # (batch, d_inner, state_dim)
                        y_t = (C_t * h).sum(dim=-1)  # (batch, d_inner)
                        outputs.append(y_t)

                    return torch.stack(outputs, dim=1)

            class TemporalMambaModel(nn.Module):
                """Full temporal analysis model with Mamba SSM backbone."""

                def __init__(self, input_dim=7, d_model=64, state_dim=16, d_inner=32, dt_rank=4, num_layers=2):
                    super().__init__()
                    self.input_proj = nn.Linear(input_dim, d_model)
                    self.mamba_layers = nn.ModuleList([
                        SelectiveSSM(d_model, state_dim, d_inner, dt_rank)
                        for _ in range(num_layers)
                    ])
                    self.output_head = nn.Sequential(
                        nn.LayerNorm(d_model),
                        nn.Linear(d_model, 32),
                        nn.ReLU(),
                        nn.Linear(32, 3),  # stress, trend_up, trend_down
                    )

                def forward(self, x):
                    x = self.input_proj(x)
                    for layer in self.mamba_layers:
                        x = layer(x)
                    # Use last time step
                    x = x[:, -1, :]
                    return self.output_head(x)

            self.model = TemporalMambaModel(
                input_dim=7,
                d_model=self.d_model,
                state_dim=self.state_dim,
                d_inner=self.d_inner,
                dt_rank=self.dt_rank,
            ).to(self.device)
            self.model.eval()
            self._loaded = True
            logger.info(f"Temporal Mamba SSM model built on {self.device}")

        except Exception as e:
            logger.warning(f"Mamba SSM model not available: {e}")
            self._loaded = False


class TemporalAnalysisModel:
    """Temporal analysis using Mamba SSM for sequence patterns.

    Input: sequence of last 5 analysis frames (stress, anxiety, stability, etc.)
    Output: temporal stress score, pattern classification, trend direction.
    """

    def __init__(self) -> None:
        self.mamba = MambaSSMBlock(d_model=64, state_dim=16, d_inner=32, dt_rank="auto")
        self._loaded = False

    def load(self, weights_path: Optional[str] = None) -> None:
        """Load the temporal model."""
        self.mamba.build()

        if weights_path and self.mamba.model is not None:
            try:
                import torch
                state_dict = torch.load(weights_path, map_location=self.mamba.device, weights_only=True)
                self.mamba.model.load_state_dict(state_dict)
                logger.info(f"Temporal model weights loaded from {weights_path}")
            except Exception as e:
                logger.warning(f"Could not load temporal weights: {e}")

        self._loaded = self.mamba._loaded

    def predict(self, history: List[Dict]) -> Dict:
        """Predict temporal patterns from analysis history.

        Args:
            history: List of recent analysis results (at least 5 frames).

        Returns:
            Dict with temporal_stress, pattern, trend.
        """
        if len(history) < 2:
            return {"temporal_stress": 0.0, "pattern": "insufficient_data", "trend": "stable"}

        # Extract feature sequences
        features = []
        for frame in history[-5:]:
            feat = [
                frame.get("stress", 0) / 100.0,
                frame.get("anxiety", 0) / 100.0,
                frame.get("stability", 50) / 100.0,
                frame.get("depression_risk", 0) / 100.0,
                frame.get("overall_risk", 0) / 100.0,
                frame.get("voice_freq", 180) / 500.0,
                frame.get("confidence", 0.5),
            ]
            features.append(feat)

        # Pad to 5 frames if needed
        while len(features) < 5:
            features.insert(0, features[0])

        feature_array = np.array(features, dtype=np.float32)

        # Run Mamba inference if available
        if self._loaded and self.mamba.model is not None:
            try:
                import torch
                x = torch.from_numpy(feature_array).unsqueeze(0).to(self.mamba.device)
                with torch.no_grad():
                    output = self.mamba.model(x)[0].cpu().numpy()

                temporal_stress = float(np.clip(output[0] * 100, 0, 100))
                trend_score = float(output[1] - output[2])

                if trend_score > 0.2:
                    trend = "increasing"
                elif trend_score < -0.2:
                    trend = "decreasing"
                else:
                    trend = "stable"

                pattern = self._classify_pattern(feature_array)

                return {
                    "temporal_stress": temporal_stress,
                    "pattern": pattern,
                    "trend": trend,
                }
            except Exception as e:
                logger.warning(f"Temporal inference error: {e}")

        # Heuristic fallback
        return self._heuristic_predict(feature_array)

    def _classify_pattern(self, features: np.ndarray) -> str:
        """Classify the temporal pattern from feature sequence."""
        stresses = features[:, 0]  # First column is stress
        if len(stresses) < 2:
            return "stable"

        diff = np.diff(stresses)
        mean_diff = float(np.mean(diff))
        std_diff = float(np.std(diff))

        if abs(mean_diff) < 0.05 and std_diff < 0.1:
            return "stable"
        elif mean_diff > 0.1:
            return "escalating"
        elif mean_diff < -0.1:
            return "recovering"
        elif std_diff > 0.15:
            return "volatile"
        else:
            return "fluctuating"

    def _heuristic_predict(self, features: np.ndarray) -> Dict:
        """Heuristic temporal analysis fallback."""
        stresses = features[:, 0]
        mean_stress = float(np.mean(stresses)) * 100
        diff = np.diff(stresses)
        mean_diff = float(np.mean(diff)) if len(diff) > 0 else 0

        if mean_diff > 0.05:
            trend = "increasing"
        elif mean_diff < -0.05:
            trend = "decreasing"
        else:
            trend = "stable"

        pattern = self._classify_pattern(features)

        return {
            "temporal_stress": mean_stress,
            "pattern": pattern,
            "trend": trend,
        }
