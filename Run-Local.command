#!/bin/bash
# ═══════════════════════════════════════════════════════════
# MindTrack AI v4 — LOCAL MODE (Double-click to run!)
# ═══════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/opt/homebrew/opt/postgresql@15/bin:$HOME/.pyenv/shims:$PATH"

clear
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║         MindTrack AI v4.0                ║"
echo "  ║   Mental Health Stress Detection         ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# Kill stale
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# PostgreSQL
echo "🟢 Starting PostgreSQL..."
brew services start postgresql@15 2>/dev/null || echo "  (already running)"

# Redis
echo "🟢 Starting Redis..."
brew services start redis 2>/dev/null || echo "  (already running)"
sleep 2

# Database
echo "🟢 Checking database..."
createdb mindtrack 2>/dev/null || echo "  Database 'mindtrack' already exists"

# Backend
echo "🟢 Starting Backend..."
cd "$SCRIPT_DIR/backend"
[ ! -d "venv" ] && python3 -m venv venv
source venv/bin/activate
python3 -c "import fastapi" 2>/dev/null || pip install -r requirements.txt -q
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd "$SCRIPT_DIR"
sleep 3

# Frontend
echo "🟢 Starting Frontend..."
cd "$SCRIPT_DIR/frontend"
[ ! -d "node_modules" ] && npm install
npm run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"
sleep 3

echo ""
echo "  ════════════════════════════════════════════"
echo "  ✅ MindTrack AI v4 is running!"
echo ""
echo "  🌐 Frontend:  http://localhost:3000"
echo "  🔌 Backend:   http://localhost:8000"
echo "  📚 API Docs:  http://localhost:8000/docs"
echo ""
echo "  👤 Demo Login: demo@mindtrack.ai / Demo@1234"
echo "  🤖 AI Engine: Groq Llama 3.3 70B"
echo "  ════════════════════════════════════════════"
echo ""

# Auto-open browser
open http://localhost:3000 2>/dev/null

echo "  Press Ctrl+C to stop all services"
echo ""

cleanup() {
    echo ""
    echo "🔴 Stopping MindTrack AI..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    pkill -f "uvicorn main:app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    echo "  Done."
}
trap cleanup EXIT
wait
