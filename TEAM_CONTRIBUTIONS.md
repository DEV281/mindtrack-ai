# MindTrack AI — Team Contributions Breakdown

> **Project:** MindTrack AI v4 — AI-Powered Mental Health Stress Detection Platform
> **Stack:** FastAPI (Python) · React/TypeScript · PostgreSQL · Redis · Groq LLM

---

## Member 1 — AI Engine, Real-Time Analysis & ML Pipeline

**Role:** AI/ML Engineer & Backend Systems

### Core Responsibility
Designed and implemented the real-time AI brain that powers every conversation,
the live biometric analysis pipeline, and the machine learning training infrastructure.

### Backend Files Owned
| File | Description |
|------|-------------|
| `backend/app/core/ai_engine.py` | Groq LLM integration (Llama 3.3 70B), streaming responses, personality mode detection, camera biometric context injection into prompts |
| `backend/app/core/websocket.py` | WebSocket connection manager for real-time AI chat |
| `backend/app/api/consultation.py` | WebSocket endpoint for live AI consultation, PHQ-9/GAD-7 assessment engine, demo analysis generator, message streaming |
| `backend/app/api/analysis.py` | Real-time analysis API endpoints |
| `backend/app/api/sessions.py` | Live session management and data recording |
| `backend/app/schemas/analysis.py` | Analysis reading data schemas |
| `backend/app/schemas/consultation.py` | Consultation data schemas |
| `backend/app/schemas/session.py` | Session schemas |

### ML Training Pipeline
| File | Description |
|------|-------------|
| `ml_training/train_facial.py` | ViT + CNN + Mamba model training for facial expression analysis |
| `ml_training/train_temporal.py` | Temporal stress pattern model (S4 state space model) |
| `ml_training/train_voice.py` | Voice frequency + amplitude stress analysis training |
| `ml_training/data_loader.py` | Dataset loading and preprocessing pipeline |
| `ml_training/evaluate_models.py` | Model evaluation, benchmarking, accuracy metrics |
| `ml_training/notebooks/` | Research notebooks and experiments |

### Frontend Files Owned
| File | Description |
|------|-------------|
| `frontend/src/pages/Session/components/AIChat.tsx` | Real-time AI chat UI with token streaming display |
| `frontend/src/pages/Session/components/CameraFeed.tsx` | Live camera feed with expression overlay |
| `frontend/src/pages/Session/components/WaveformVisual.tsx` | Voice waveform visualization |
| `frontend/src/pages/Session/components/StressMeters.tsx` | Live stress/anxiety gauge meters |
| `frontend/src/pages/Session/components/RiskGauge.tsx` | Overall risk gauge component |
| `frontend/src/pages/Session/components/AlertsPanel.tsx` | Crisis alert panel |
| `frontend/src/pages/Session/LiveSession.tsx` | Live analysis session orchestrator page |
| `frontend/src/hooks/useCamera.ts` | Camera capture and frame extraction hook |
| `frontend/src/hooks/useMicrophone.ts` | Microphone input and audio analysis hook |
| `frontend/src/hooks/useSession.ts` | Session state and WebSocket session hook |
| `frontend/src/hooks/useWebSocket.ts` | WebSocket lifecycle hook |
| `frontend/src/store/sessionStore.ts` | Session state management (Zustand) |

### Key Features Delivered
- ✅ Real-time AI conversation with Groq Llama 3.3 70B (streaming token by token)
- ✅ Dynamic personality modes: Companion, Coach, Mindfulness, Motivational, Night, Recovery, Clinical
- ✅ Camera biometric context injection — AI sees live stress/anxiety readings
- ✅ PHQ-9 + GAD-7 clinical assessment engine with crisis protocol
- ✅ Live voice waveform and frequency analysis
- ✅ ML training pipeline for ViT+CNN+Mamba facial stress detection
- ✅ Model benchmarking: 79.5% stress detection accuracy

---

## Member 2 — Backend Architecture, Authentication & Database

**Role:** Backend Engineer & System Architect

### Core Responsibility
Built the entire backend infrastructure: database schema, authentication system
with OTP email verification, JWT security, API gateway, and deployment pipeline.

### Backend Files Owned
| File | Description |
|------|-------------|
| `backend/main.py` | FastAPI app entry point, middleware, routing, lifespan events, dashboard stats endpoints, demo user seeding |
| `backend/app/core/config.py` | Pydantic settings — all environment configuration |
| `backend/app/core/database.py` | Async SQLAlchemy engine, session factory, DB init |
| `backend/app/core/security.py` | JWT creation/decoding, password hashing (bcrypt), OTP generation, password strength validation |
| `backend/app/core/redis_client.py` | Redis async client — OTP storage, refresh token management, session caching |
| `backend/app/api/auth.py` | Full auth system: register, login (2FA OTP), verify OTP, resend OTP, refresh token, logout, Google OAuth2 |
| `backend/app/api/users.py` | User profile management, onboarding profile, T&C acceptance, complexity assessment, password change |
| `backend/app/api/reports.py` | Auto-generated session reports, PDF export, report history |
| `backend/app/db/models.py` | All 8 SQLAlchemy ORM models: User, Session, AnalysisReading, Report, Consultation, ConsultationMessage, AssessmentResult, ActivityMoodLog, GratitudeEntry |
| `backend/app/schemas/auth.py` | Auth request/response Pydantic schemas |
| `backend/migrate.py` | Database migration script |
| `backend/requirements.txt` | Python dependencies |
| `backend/.env` / `backend/.env.example` | Environment configuration |
| `backend/Dockerfile` | Backend Docker image |

### Infrastructure Files Owned
| File | Description |
|------|-------------|
| `docker-compose.yml` | Full Docker orchestration (backend + frontend + postgres + redis + nginx) |
| `nginx/` | Nginx reverse proxy config for production |
| `start.sh` | Local one-command startup script |
| `Run-Local.command` | macOS double-click launcher |
| `start-global.sh` / `Run-Global.command` | Global/ngrok deployment scripts |
| `stop.sh` | Clean shutdown script |
| `SETUP.md` | Full setup documentation |
| `README.md` | Project README |

### Key Features Delivered
- ✅ Full JWT authentication with access + refresh token pair
- ✅ Email OTP verification via Gmail SMTP (aiosmtplib)
- ✅ Fault-tolerant Redis: auth flows work even if Redis is down
- ✅ Google OAuth2 login integration
- ✅ 8-table PostgreSQL schema with all relationships and cascades
- ✅ Auto-generated wellness reports with PDF export
- ✅ Dashboard analytics: session counts, stress trends, comparison cards
- ✅ Complete Docker + Nginx production deployment setup
- ✅ Database auto-migration on startup

---

## Member 3 — Frontend UI/UX, Wellness Features & User Experience

**Role:** Frontend Developer & UX Designer

### Core Responsibility
Built the complete React/TypeScript frontend — every screen the user sees,
the design system, wellness activity games, mood journal, reports UI,
onboarding flow, settings, and voice input/output experience.

### Frontend Pages Owned
| File/Directory | Description |
|----------------|-------------|
| `frontend/src/pages/Auth/Login.tsx` | Login page with demo login button |
| `frontend/src/pages/Auth/Register.tsx` | Registration form with password strength meter |
| `frontend/src/pages/Auth/OTPVerify.tsx` | 6-digit OTP input with auto-submit and resend |
| `frontend/src/pages/Auth/TermsModal.tsx` | Terms & Conditions modal |
| `frontend/src/pages/Auth/PrivacyPolicy.tsx` | Privacy Policy modal |
| `frontend/src/pages/Dashboard/Dashboard.tsx` | Main dashboard: stats, recent sessions, trend chart, comparison cards |
| `frontend/src/pages/Dashboard/components/` | TrendChart, SessionTable, WellnessWeather, DailyWellness |
| `frontend/src/pages/Consultation/ConsultationRoom.tsx` | Full Talk-to-AI room: chat panel, mode tabs, assessment progress, voice toggle |
| `frontend/src/pages/Consultation/ConversationHistory.tsx` | Past conversations with message replay |
| `frontend/src/pages/Reports/Reports.tsx` | Reports list with filters and search |
| `frontend/src/pages/Reports/ReportDetail.tsx` | Individual report detail with charts and PDF export |
| `frontend/src/pages/Activities/Activities.tsx` | Wellness activities hub |
| `frontend/src/pages/Activities/MoodMusic.tsx` | Mood-based music player |
| `frontend/src/pages/Activities/games/BreathingBubble.tsx` | Interactive 4-7-8 breathing exercise |
| `frontend/src/pages/Activities/games/GratitudeJar.tsx` | Daily gratitude journal entries |
| `frontend/src/pages/Activities/games/MemoryMatch.tsx` | Memory card matching game |
| `frontend/src/pages/Activities/puzzles/` | Word calm and jigsaw puzzle games |
| `frontend/src/pages/Journal/MoodJournal.tsx` | Daily mood journal with emoji tracking |
| `frontend/src/pages/Onboarding/PersonalDetails.tsx` | Onboarding: personal info, concerns, sleep quality |
| `frontend/src/pages/Onboarding/ComplexityAssessment.tsx` | AI complexity profile quiz (analytical/reflective/exploratory) |
| `frontend/src/pages/Settings/Settings.tsx` | Full settings: profile, notifications, theme, password, account deletion |
| `frontend/src/pages/Legal/PrivacyPolicy.tsx` | Privacy policy standalone page |
| `frontend/src/pages/Legal/TermsAndConditions.tsx` | Terms page |
| `frontend/src/pages/Layout/AppLayout.tsx` | Sidebar navigation and layout shell |
| `frontend/src/pages/Benchmarks/` | Model benchmark comparison page |
| `frontend/src/pages/Datasets/` | Dataset management page |

### Shared Components Owned
| File | Description |
|------|-------------|
| `frontend/src/components/ChatInputBar.tsx` | Rich chat input: text, image attach, emoji, send button |
| `frontend/src/components/VoiceInputButton.tsx` | Push-to-talk voice input button |
| `frontend/src/components/VoiceControls.tsx` | Voice playback controls (play/pause/stop) |
| `frontend/src/components/VoiceWaveformInput.tsx` | Animated voice waveform while recording |
| `frontend/src/components/VoicePermissionModal.tsx` | First-time voice mode permission prompt |
| `frontend/src/components/MicPermissionModal.tsx` | Microphone access permission modal |
| `frontend/src/components/SessionStartModal.tsx` | Session start confirmation modal |
| `frontend/src/components/BreakReminder.tsx` | Periodic wellness break reminder |
| `frontend/src/components/CrisisResources.tsx` | Crisis helpline resources panel |
| `frontend/src/components/DailyAffirmation.tsx` | Daily affirmation card |
| `frontend/src/components/WellnessTip.tsx` | Random wellness tip widget |
| `frontend/src/components/TermsConsentModal.tsx` | Full T&C consent modal with sections |
| `frontend/src/components/LocationPermissionModal.tsx` | Location permission for wellness features |

### Design System & Config
| File | Description |
|------|-------------|
| `frontend/src/styles/` | Full CSS design system: tokens, glassmorphism, animations, themes |
| `frontend/tailwind.config.js` | Custom Tailwind color palette, fonts, animations |
| `frontend/src/App.tsx` | React Router setup with protected/public routes |
| `frontend/src/main.tsx` | App entry with toast notifications |
| `frontend/index.html` | HTML template with SEO meta tags |
| `frontend/vite.config.ts` | Vite bundler config |

### Hooks & State Owned
| File | Description |
|------|-------------|
| `frontend/src/hooks/useSpeechInput.ts` | Full speech-to-text via Web Speech API |
| `frontend/src/hooks/useSpeechOutput.ts` | Text-to-speech output with sentence buffering |
| `frontend/src/hooks/useSpeechRecognition.ts` | Speech recognition with interim results |
| `frontend/src/hooks/useSpeechSynthesis.ts` | Speech synthesis with voice selection |
| `frontend/src/hooks/useLocation.ts` | Geolocation hook |
| `frontend/src/store/authStore.ts` | Auth state (login, register, OTP, token storage) |
| `frontend/src/store/consultationStore.ts` | Consultation chat state (messages, assessment, stress) |
| `frontend/src/store/themeStore.ts` | Dark/light/calm theme persistence |
| `frontend/src/api/client.ts` | Axios API client with JWT auth interceptor and token refresh |

### Key Features Delivered
- ✅ Complete multi-page React app with animated transitions (Framer Motion)
- ✅ Premium dark-mode glassmorphism design system
- ✅ Full onboarding flow with complexity profile quiz
- ✅ Voice input (speech-to-text) + voice output (text-to-speech) in consultation
- ✅ 5 wellness games/activities: Breathing, Gratitude Jar, Memory Match, Word Calm, Jigsaw
- ✅ Mood Journal with emoji mood tracking
- ✅ PDF report export with html2canvas + jsPDF
- ✅ Interactive trend charts (Recharts)
- ✅ Real-time stress meters and risk gauge in consultation
- ✅ 4 visual themes: Calm (default), Neural, Ocean, Sunset

---

## Project-Wide Summary

| | Member 1 | Member 2 | Member 3 |
|--|----------|----------|----------|
| **Role** | AI/ML Engineer | Backend Architect | Frontend Developer |
| **Primary Language** | Python + TypeScript | Python | TypeScript/React |
| **Files** | ~18 files | ~22 files | ~55 files |
| **Lines of Code** | ~4,500 | ~5,500 | ~18,000 |
| **Core Innovation** | Live AI streaming + biometric context | Auth system + DB architecture | Full UI/UX + wellness features |

### Shared / Collaborative Work
- `docker-compose.yml` — All three members
- `README.md` / `SETUP.md` — All three members
- API integration between frontend ↔ backend — Members 2 & 3
- WebSocket protocol design — Members 1 & 2
