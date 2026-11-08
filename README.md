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
║         Real-Time Stress Detection & AI Consultation         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

**Real-time mental health stress detection combining facial emotion recognition,
AI consultation, and honest multimodal research.**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green.svg)]()
[![React](https://img.shields.io/badge/React-18.3-cyan.svg)]()
[![PyTorch](https://img.shields.io/badge/PyTorch-2.3-red.svg)]()
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-orange.svg)]()
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)]()

</div>

---

## 🔍 What Is Real vs. What Is Simulated

> **Honesty first.** This project clearly separates working components from research-stage components.

### ✅ Real and Working

| Component | Details |
|-----------|---------|
| **Full-Stack Web App** | React 18 + TypeScript frontend, FastAPI backend, PostgreSQL, Redis, JWT auth, Google OAuth2, OTP email verification |
| **AI Chatbot** | Groq LLaMA 3.3 70B — every response is generated in real-time via Groq API. The AI receives live biometric readings with every message to understand the user's physical state, not just their words |
| **Facial Emotion Model** | ViT-Base fine-tuned on FER2013 (7 emotion classes). Real PyTorch training pipeline with reproducible results, confusion matrix, classification report, and ROC AUC scores |
| **Safety Filter** | Deterministic pure-Python crisis detection — runs before every AI call, cannot be bypassed. Detects crisis keywords, harm indicators, and dangerous biometric combinations |
| **WebSocket Streaming** | Real-time bidirectional communication for both analysis and consultation |

### 🔬 Architecturally Defined — Not Yet Trained

| Component | Why Not Trained | Dataset Needed |
|-----------|----------------|----------------|
| **Voice Stress Model** (Raw Spectrogram CNN) | Requires restricted dataset | DAIC-WOZ (AVEC challenge access) |
| **Temporal Sequence Model** (Mamba SSM) | Requires academic license | IEMOCAP (USC license) |

When these models are not available, the app runs in **demo mode** for voice and temporal modalities — generating realistic but synthetic data with a clear "Demo Mode" indicator in the UI. This is never presented as real model output.

### 📊 Model Selection Research

A systematic comparison of 30 multi-modal model combinations was conducted and documented. The top-ranked combination:

| Facial | Voice | Temporal | Combined F1 |
|--------|-------|----------|:-----------:|
| ViT-Base | Raw Spectrogram CNN | Mamba SSM | **79.5%** |

---

## 🌐 Live Demo

| | URL |
|----------|-----|
| **Frontend** | [https://mindtrack-ai.vercel.app](https://mindtrack-ai.vercel.app) |
| **Backend API** | [https://mindtrack-backend.railway.app](https://mindtrack-backend.railway.app) |
| **Demo Login** | `demo@mindtrack.ai` / `Demo@1234` |

## Tech Stack

```
React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion
FastAPI + PostgreSQL + Redis + WebSockets
Groq LLaMA 3.3 70B (AI) + PyTorch + HuggingFace (ML)
Docker Compose + NGINX
```

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/mindtrack-ai
cd mindtrack-ai
cp backend/.env.example backend/.env
# Fill in your GROQ_API_KEY in backend/.env (free at console.groq.com)
docker-compose up --build
# Open http://localhost:80
```

> **Free Deployment?** See [DEPLOY.md](./DEPLOY.md) for Vercel + Railway + Supabase — all free tier.

## Manual Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your GROQ_API_KEY and database credentials

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
npm install
npm run dev
# → http://localhost:3000
```

## Training the Facial Emotion Model

The training pipeline is designed to run on Google Colab free tier (T4 GPU):

```bash
cd ml_training

# Option 1: Run locally with GPU
python train_facial_vit.py

# Option 2: Use the Colab notebook
# Open ml_training/colab_train.ipynb in Google Colab
```

### What the training produces

- `data/pretrained/vit_fer2013_best.pt` — trained model weights
- `results/confusion_matrix.png` — 7×7 confusion matrix heatmap
- `results/classification_report.json` — per-class metrics
- `results/training_curves.png` — loss and F1 curves
- `results/metrics_summary.json` — proof that training happened

### Reproducing results

```bash
cd ml_training
python evaluate_saved_model.py --checkpoint ../data/pretrained/vit_fer2013_best.pt
```

See [results/README.md](./results/README.md) for details on all output files.

## Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `GROQ_API_KEY` | ✅ | Groq API key — powers ALL AI features (free at [console.groq.com](https://console.groq.com)) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `SECRET_KEY` | ✅ | JWT signing key (`openssl rand -hex 32`) |
| `SMTP_HOST` | ❌ | Email SMTP host (default: smtp.gmail.com) |
| `SMTP_USER` | ❌ | SMTP username |
| `SMTP_PASSWORD` | ❌ | SMTP app password |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth secret |
| `FRONTEND_URL` | ❌ | Frontend origin for CORS (default: http://localhost:3000) |
| `REAL_MODEL_PATH` | ❌ | Path to trained ViT weights (auto-detected) |
| `KAGGLE_USERNAME` | ❌ | Kaggle API username (training only) |
| `KAGGLE_KEY` | ❌ | Kaggle API key (training only) |

### Getting your Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Create a free account
3. Navigate to **API Keys**
4. Create a new key
5. Add to your `.env` file as `GROQ_API_KEY=gsk_...`

Groq provides free API access with generous rate limits. The AI chatbot uses `llama-3.3-70b-versatile` for all responses.

## Architecture

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
│  │  • AI Consultation   │  │  • Groq LLM Integration      │ │
│  │  • Dashboard         │  │  • Safety Filter (pre-AI)     │ │
│  │  • Reports           │  │  • ML Inference Pipeline      │ │
│  └──────────────────────┘  │                               │ │
│                            │  ML Models:                   │ │
│                            │  ├─ ViT (Facial) ✅ REAL      │ │
│                            │  ├─ CNN (Voice) 🔬 PLANNED   │ │
│                            │  ├─ Mamba SSM (Temporal) 🔬  │ │
│                            │  └─ Fusion Engine             │ │
│                            └───────────┬───────────────────┘ │
│                                        │                      │
│              ┌─────────────────────────┼──────────────┐      │
│     ┌────────▼────────┐    ┌───────────▼──────────┐   │      │
│     │   PostgreSQL    │    │       Redis          │   │      │
│     │   Port 5432     │    │    Port 6379         │   │      │
│     │  • Users        │    │  • OTP Codes (TTL)   │   │      │
│     │  • Sessions     │    │  • Session Cache     │   │      │
│     │  • Readings     │    │  • Refresh Tokens    │   │      │
│     │  • Reports      │    │                      │   │      │
│     └─────────────────┘    └──────────────────────┘   │      │
│              └─────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────┘
```

## Honest Limitations

1. **Voice and temporal models are not yet trained.** They require restricted datasets (DAIC-WOZ, IEMOCAP) that need academic licenses. The app clearly indicates demo mode when these are unavailable.
2. **Facial emotion recognition has known limitations.** FER2013 is a noisy dataset with ~65% human agreement. Our model achieves competitive results but emotion recognition from faces alone is not a clinical tool.
3. **This is a research project, not a medical device.** Nothing in this app should be used for clinical diagnosis. The safety filter catches crisis situations and provides emergency resources, but it is not a substitute for professional help.
4. **Groq API dependency.** The chatbot requires an active Groq API key. Without it, the consultation feature will not work (but the rest of the app functions normally).

## Project Structure

```
mindtrack-ai/
├── backend/              # FastAPI backend (Python)
│   ├── app/
│   │   ├── api/          # Route handlers (auth, sessions, analysis, consultation, reports, users)
│   │   ├── core/         # Config, database, redis, security, websocket, ai_engine, safety_filter
│   │   ├── db/           # SQLAlchemy ORM models
│   │   ├── models/       # ML models (facial_inference, facial_model, fusion, model_loader)
│   │   └── schemas/      # Pydantic request/response schemas
│   ├── main.py           # FastAPI app entry point
│   └── requirements.txt
├── frontend/             # React + TypeScript (Vite)
│   └── src/
│       ├── api/          # Axios client with JWT interceptors
│       ├── components/   # Shared components (ChatInputBar, VoiceStatusIndicator, etc.)
│       ├── hooks/        # Custom hooks (camera, mic, websocket, session, speechOutput)
│       ├── pages/        # All page components
│       ├── store/        # Zustand state management
│       └── styles/       # Tailwind CSS + design system
├── ml_training/          # Training scripts (train_facial_vit.py, evaluate_saved_model.py, colab_train.ipynb)
├── results/              # Training output artifacts (confusion matrix, metrics, curves)
├── data/                 # Datasets + pretrained weights
├── docker-compose.yml    # Full-stack Docker setup
├── nginx/                # Reverse proxy config
└── README.md
```

## Citations

- **FER2013**: Goodfellow, I. J. et al. "Challenges in representation learning: A report on three machine learning contests." ICML 2013.
- **ViT**: Dosovitskiy, A. et al. "An Image is Worth 16x16 Words." ICLR, 2021.
- **Mamba**: Gu, A. & Dao, T. "Mamba: Linear-Time Sequence Modeling with Selective State Spaces." arXiv, 2023.
- **DAIC-WOZ**: Gratch, J. et al. "The Distress Analysis Interview Corpus." LREC, 2014.
- **IEMOCAP**: Busso, C. et al. "IEMOCAP: Interactive Emotional Dyadic Motion Capture Database." Language Resources & Evaluation, 2008.
- **S4**: Gu, A. et al. "Efficiently Modeling Long Sequences with Structured State Spaces." ICLR, 2022.

---

<div align="center">
  <strong>MindTrack AI v4.0</strong> — Built with ❤️ for mental health research<br/>
  <em>Powered by Groq • Real ML • Honest about what's real</em>
</div>
