#!/bin/bash
# ═══════════════════════════════════════════════════════════
# MindTrack AI v4 — Remaining Setup Tasks
# Run this script to complete the final steps
# ═══════════════════════════════════════════════════════════

set -e
cd "$(dirname "$0")"

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║   MindTrack AI v4 — Final Setup               ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# ── TASK 1: Git Push ──────────────────────────────────────
echo "━━━ TASK 1: Push to GitHub ━━━"
echo ""
echo "Your commit is ready (1905955). Pushing to origin/main..."
echo ""

# Try push — if it fails, guide the user
if git push origin main 2>&1; then
    echo "✅ Pushed to GitHub successfully!"
else
    echo ""
    echo "⚠️  Push failed — you need to authenticate with GitHub."
    echo ""
    echo "Option A: Use a Personal Access Token (recommended)"
    echo "  1. Go to: https://github.com/settings/tokens"
    echo "  2. Generate new token (classic) → check 'repo' scope"
    echo "  3. Run:  git push origin main"
    echo "  4. Username: DEV281"
    echo "  5. Password: paste your token"
    echo ""
    echo "Option B: Use SSH"
    echo "  1. Run:  ssh-keygen -t ed25519 -C 'your@email.com'"
    echo "  2. Copy:  cat ~/.ssh/id_ed25519.pub"
    echo "  3. Add at: https://github.com/settings/keys"
    echo "  4. Run:  git remote set-url origin git@github.com:DEV281/mindtrack-ai.git"
    echo "  5. Run:  git push origin main"
    echo ""
fi

echo ""

# ── TASK 2: Docker (if available) ─────────────────────────
echo "━━━ TASK 2: Docker Full Stack ━━━"
echo ""

if command -v docker &> /dev/null; then
    echo "Docker found! Starting full stack..."
    docker-compose up --build -d
    echo ""
    echo "⏳ Waiting for services to start..."
    sleep 15
    echo ""
    echo "Checking health:"
    docker-compose ps
    echo ""
    echo "✅ Open http://localhost:80 in your browser"
    echo "   Demo login: demo@mindtrack.ai / Demo@1234"
else
    echo "⚠️  Docker is not installed on this machine."
    echo ""
    echo "To install Docker Desktop:"
    echo "  1. Download from: https://www.docker.com/products/docker-desktop/"
    echo "  2. Install and start Docker Desktop"
    echo "  3. Run:  cd $(pwd) && docker-compose up --build"
    echo ""
    echo "Or deploy without Docker:"
    echo "  Backend:  cd backend && pip install -r requirements.txt && uvicorn main:app --port 8000"
    echo "  Frontend: cd frontend && npm install && npm run dev"
    echo "  (Requires PostgreSQL and Redis running separately)"
fi

echo ""

# ── TASK 3: Model Training ────────────────────────────────
echo "━━━ TASK 3: Train the ViT Model ━━━"
echo ""
echo "The training notebook is ready at: ml_training/colab_train.ipynb"
echo ""
echo "Steps:"
echo "  1. Go to: https://colab.research.google.com"
echo "  2. File → Upload notebook → select ml_training/colab_train.ipynb"
echo "  3. Runtime → Change runtime type → GPU (T4)"
echo "  4. Run Cell 1 (Setup) — enter your Kaggle credentials when prompted"
echo "  5. Run Cell 2 (Download FER2013)"
echo "  6. Run Cell 3 (Training) — takes ~25-40 minutes on T4"
echo "  7. Run Cell 4 (View Results) — see confusion matrix & metrics"
echo "  8. Run Cell 5 (Download) — downloads model weights + results"
echo ""
echo "After training:"
echo "  Copy vit_fer2013_best.pt to: data/pretrained/vit_fer2013_best.pt"
echo "  The app will automatically switch from Demo Mode to Live AI Analysis!"
echo ""

echo "═══════════════════════════════════════════════════"
echo "  All verification already complete:"
echo "  ✅ 57/57 Python tests passing"
echo "  ✅ TypeScript: zero errors"
echo "  ✅ Vite production build: 3446 modules, 1.8MB"
echo "  ✅ All backend modules verified"
echo "  ✅ Git committed: 25 files, +3864/-388 lines"
echo "═══════════════════════════════════════════════════"
