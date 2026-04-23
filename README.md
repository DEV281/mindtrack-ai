# MindTrack AI v4 — Mental Health Stress Detection Platform

<div align="center">

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███╗   ███╗██╗███╗   ██╗██████╗ ████████╗██████╗  █████╗  ║
║   ████╗ ████║██║████╗  ██║██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗ ║
║   ██╔████╔██║██║██╔██╗ ██║██║  ██║   ██║   ██████╔╝███████║ ║
║   ██║╚██╔╝██║██║██║╚██╗██║██║  ██║   ██║   ██╔══██╗██╔══██║ ║
║   ██║ ╚═╝ ██║██║██║ ╚████║██████╔╝   ██║   ██║  ██║██║  ██║ ║
║   ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ║
║                        AI v4.0                               ║
║         Production-Grade Stress Detection Platform           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

**Real-time multi-modal stress analysis using facial expression,
voice patterns, and temporal sequence modeling.**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green.svg)]()
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)]()
[![PyTorch](https://img.shields.io/badge/PyTorch-2.3-red.svg)]()
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)]()

</div>

---

## 🌐 Live Demo

| | URL |
|----------|-----|
| **Frontend** | [https://mindtrack-ai.vercel.app](https://mindtrack-ai.vercel.app) |
| **Backend API** | [https://mindtrack-backend.railway.app](https://mindtrack-backend.railway.app) |
| **Demo Login** | `demo@mindtrack.ai` / `Demo@1234` |

## Tech Stack

```
React 18 + TypeScript + FastAPI + PostgreSQL +
Redis + Groq LLaMA 3.3 70B + Docker
```

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/mindtrack-ai
cd mindtrack-ai
cp backend/.env.example backend/.env
# Fill in your API keys in backend/.env
docker-compose up --build
# Open http://localhost:80
```

> **Free Deployment?** See [DEPLOY.md](./DEPLOY.md) for a full guide to deploy on Vercel + Railway + Supabase — all free tier.

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                         NGINX (port 80)                       │
│                    Reverse Proxy + Rate Limiting               │
├───────────────┬───────────────────────────────┬───────────────┤
│               │                               │               │
│  ┌────────────▼─────────┐  ┌──────────────────▼────────────┐ │
│  │   React Frontend     │  │      FastAPI Backend          │ │
│  │   (Vite + TS)        │  │      (Uvicorn ASGI)           │ │
│  │   Port 3000          │  │      Port 8000                │ │
│  │                      │  │                               │ │
│  │  • Auth Pages        │  │  • REST API + WebSocket       │ │
│  │  • Live Session      │  │  • JWT/OTP/OAuth Auth         │ │
│  │  • Dashboard         │  │  • ML Inference Pipeline      │ │
│  │  • Reports           │  │  • Session Management         │ │
│  │  • Benchmarks        │  │                               │ │
│  │  • Dataset Browser   │  │  ML Models:                   │ │
│  └──────────────────────┘  │  ├─ ViT (Facial)              │ │
│                            │  ├─ CNN (Voice/MFCC)           │ │
│                            │  ├─ Mamba SSM (Temporal)       │ │
│                            │  └─ Fusion Engine              │ │
│                            └───────────┬───────────────────┘ │
│                                        │                      │
│              ┌─────────────────────────┼──────────────┐      │
│              │                         │              │      │
│     ┌────────▼────────┐    ┌───────────▼──────────┐   │      │
│     │   PostgreSQL    │    │       Redis          │   │      │
│     │   Port 5432     │    │    Port 6379         │   │      │
│     │                 │    │                      │   │      │
│     │  • Users        │    │  • OTP Codes (TTL)   │   │      │
│     │  • Sessions     │    │  • Session Cache     │   │      │
│     │  • Readings     │    │  • Refresh Tokens    │   │      │
│     │  • Reports      │    │                      │   │      │
│     └─────────────────┘    └──────────────────────┘   │      │
│              └─────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Python** 3.11+
- **Node.js** 20+
- **Docker** & **Docker Compose** (for containerized deployment)
- **CUDA** (optional, for GPU-accelerated inference)

## Quick Start (Docker)

```bash
# 1. Clone and configure
git clone <repo-url> mindtrack-ai && cd mindtrack-ai
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# 2. Build and start everything
docker-compose up --build

# 3. Access the application
open http://localhost:80
```

## Manual Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start PostgreSQL and Redis (or use Docker for just these)
docker-compose up postgres redis -d

# Run database migrations
alembic upgrade head

# Start the backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# → http://localhost:3000
```

## Demo Login

| Field    | Value            |
|----------|------------------|
| Email    | demo@mindtrack.ai |
| Password | Demo@1234        |
| OTP      | Shown on screen / printed to server console |
| Role     | Researcher / Admin (full access) |

## Dataset Downloads

The platform uses 5 research datasets. Some require academic licenses:

| Dataset  | Auto-Download | Size   | Source |
|----------|:------------:|--------|--------|
| FER2013  | ✅ Kaggle API | 96 MB  | `kaggle datasets download -d msambare/fer2013` |
| AffectNet | ❌ Manual    | 120 GB | [mohammadmahoor.com/affectnet](http://mohammadmahoor.com/affectnet/) |
| DAIC-WOZ | ❌ Manual     | 35 GB  | [dcapswoz.ict.usc.edu](https://dcapswoz.ict.usc.edu/) |
| RAVDESS  | ✅ Auto       | 24 GB  | [zenodo.org/record/1188976](https://zenodo.org/record/1188976) |
| IEMOCAP  | ❌ Manual     | 32 GB  | [sail.usc.edu/iemocap](https://sail.usc.edu/iemocap/) |

```bash
# Download available datasets
python ml_training/data_loader.py --datasets all
```

## ML Model Training

Train models in this order:

```bash
cd ml_training

# 1. Download datasets
python data_loader.py

# 2. Train facial emotion model (ViT)
python train_facial.py --epochs 50 --batch-size 32

# 3. Train voice stress model (CNN)
python train_voice.py --epochs 80 --batch-size 32

# 4. Train temporal model (Mamba SSM)
python train_temporal.py --epochs 60 --batch-size 64

# 5. Run benchmarks
python evaluate_models.py
```

**Note:** If models are not trained, the backend runs in **demo mode** and returns realistic mock analysis data.

## Model Performance

### Top 5 Model Combinations

| Rank | CNN (Facial) | MFCC (Voice) | Temporal | Combined F1 | AUC |
|:----:|-------------|-------------|----------|:-----------:|:---:|
| 1 | ViT-B/16 | Raw Spec CNN | Mamba SSM | **79.5%** | 0.842 |
| 2 | ViT-B/16 | Spec CNN-2D | Mamba SSM | 76.2% | 0.821 |
| 3 | ViT-B/16 | MFCC CNN-1D | S4 SSM | 72.8% | 0.798 |
| 4 | ResNet-50 | Raw Spec CNN | Mamba SSM | 70.1% | 0.781 |
| 5 | ResNet-50 | Spec CNN-2D | LSTM-2L | 68.4% | 0.763 |

### Key Findings

- **Best**: ViT + Raw Spec CNN + Mamba SSM → **79.5% Combined F1**
- **Raw Spec CNN vs MFCC CNN-1D**: +16.9 F1 improvement
- **Mamba SSM vs Transformer**: +31.2 F1 improvement
- **Standalone Transformer on IEMOCAP**: 48.3% — never use without pretraining

## API Documentation

Interactive API docs available at `http://localhost:8000/docs` when the backend is running.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/verify-otp` | Verify OTP code |
| POST | `/auth/refresh` | Refresh JWT token |
| GET | `/auth/google` | Google OAuth2 redirect |
| GET | `/users/me` | Get current user profile |
| POST | `/sessions/start` | Start analysis session |
| POST | `/sessions/{id}/stop` | Stop session |
| WS | `/ws/session/{id}` | Real-time analysis WebSocket |
| POST | `/consultation/start` | Start AI consultation |
| WS | `/ws/consultation/{id}` | Live AI streaming chat |
| POST | `/consultation/{id}/end` | End consultation session |
| GET | `/consultation/{id}/history` | Get full chat history |
| GET | `/reports/` | List all reports |
| GET | `/reports/{id}` | Get report detail |
| POST | `/reports/generate` | Generate AI report |
| GET | `/datasets/` | List dataset info |
| GET | `/health` | Health check |

## Environment Variables

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | ✅ | — | Redis connection string |
| `SECRET_KEY` | ✅ | — | JWT signing key (256-bit) |
| `ANTHROPIC_API_KEY` | ✅ | — | Anthropic Claude API key (live chatbot) |
| `SMTP_HOST` | ❌ | smtp.gmail.com | Email SMTP host |
| `SMTP_USER` | ❌ | — | SMTP username |
| `SMTP_PASSWORD` | ❌ | — | SMTP app password |
| `GOOGLE_CLIENT_ID` | ❌ | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | — | Google OAuth secret |
| `HUGGINGFACE_TOKEN` | ❌ | — | HuggingFace API token |
| `FRONTEND_URL` | ❌ | http://localhost:3000 | Frontend origin for CORS |

### Getting your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account
3. Navigate to **API Keys**
4. Create a new key
5. Add to your `.env` file as `ANTHROPIC_API_KEY=sk-ant-...`

The live AI chatbot generates every response in real-time using Claude. Without this key, the chatbot will return fallback messages.

## Troubleshooting

### Camera Permissions
- Chrome requires HTTPS for camera access (except localhost)
- If denied, the app shows a placeholder and uses demo data

### CUDA Out of Memory
- Models fall back to CPU automatically when CUDA is unavailable
- Reduce batch size in training scripts if GPU OOM occurs

### Dataset Paths
- All datasets expected in `data/datasets/<name>/`
- Run `python data_loader.py` to check status and create directories

### WebSocket Connection
- Uses exponential backoff reconnection (up to 10 attempts)
- Check CORS and proxy settings if connections fail

## Project Structure

```
mindtrack-ai/
├── backend/              # FastAPI backend (Python)
│   ├── app/
│   │   ├── api/          # Route handlers (auth, sessions, analysis, reports, users, datasets)
│   │   ├── core/         # Config, database, redis, security, websocket
│   │   ├── db/           # SQLAlchemy ORM models
│   │   ├── models/       # ML models (facial, voice, temporal, fusion)
│   │   └── schemas/      # Pydantic request/response schemas
│   ├── main.py           # FastAPI app entry point
│   └── requirements.txt
├── frontend/             # React + TypeScript (Vite)
│   └── src/
│       ├── api/          # Axios client with JWT interceptors
│       ├── hooks/        # Custom hooks (camera, mic, websocket, session)
│       ├── pages/        # All page components
│       ├── store/        # Zustand state management
│       └── styles/       # Tailwind CSS + design system
├── ml_training/          # Training scripts
├── data/                 # Datasets + pretrained weights
├── docker-compose.yml    # Full-stack Docker setup
├── nginx/                # Reverse proxy config
└── README.md
```

## Citations

- **FER2013**: Goodfellow, I. J. et al. "Challenges in representation learning: A report on three machine learning contests." ICML 2013.
- **AffectNet**: Mollahosseini, A. et al. "AffectNet: A Database for Facial Expression, Valence, and Arousal Computing in the Wild." IEEE TAC, 2019.
- **DAIC-WOZ**: Gratch, J. et al. "The Distress Analysis Interview Corpus of Human and Computer Interviews." LREC, 2014.
- **RAVDESS**: Livingstone, S. R. & Russo, F. A. "The Ryerson Audio-Visual Database of Emotional Speech and Song." PLoS ONE, 2018.
- **IEMOCAP**: Busso, C. et al. "IEMOCAP: Interactive Emotional Dyadic Motion Capture Database." Language Resources & Evaluation, 2008.
- **ViT**: Dosovitskiy, A. et al. "An Image is Worth 16x16 Words." ICLR, 2021.
- **Mamba**: Gu, A. & Dao, T. "Mamba: Linear-Time Sequence Modeling with Selective State Spaces." arXiv, 2023.
- **S4**: Gu, A. et al. "Efficiently Modeling Long Sequences with Structured State Spaces." ICLR, 2022.

---

<div align="center">
  <strong>MindTrack AI v4.0</strong> — Built with ❤️ for mental health research
</div>
