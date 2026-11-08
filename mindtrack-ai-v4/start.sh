#!/bin/bash
# ═══════════════════════════════════════════════════════════
# MindTrack AI v4 — Single Command Starter (Local)
# Usage: ./start.sh
# ═══════════════════════════════════════════════════════════

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Fix PATH for Homebrew, pyenv, node, postgres ──
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/opt/homebrew/opt/postgresql@15/bin:$HOME/.pyenv/shims:$PATH"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║         MindTrack AI v4.0                ║"
echo "  ║   Mental Health Stress Detection         ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── 0. Kill stale processes ──
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "vite.*mindtrack" 2>/dev/null || true
sleep 1

# ── 1. Start PostgreSQL ──
echo "🟢 Starting PostgreSQL..."
if command -v brew &>/dev/null; then
    brew services start postgresql@15 2>/dev/null || echo "  (already running)"
elif command -v systemctl &>/dev/null; then
    sudo systemctl start postgresql 2>/dev/null || echo "  (already running)"
else
    echo "  ⚠ Please start PostgreSQL manually"
fi

# ── 2. Start Redis ──
echo "🟢 Starting Redis..."
if command -v brew &>/dev/null; then
    brew services start redis 2>/dev/null || echo "  (already running)"
elif command -v systemctl &>/dev/null; then
    sudo systemctl start redis-server 2>/dev/null || echo "  (already running)"
else
    echo "  ⚠ Please start Redis manually"
fi

sleep 2

# ── 3. Create database if needed ──
echo "🟢 Checking database..."
if command -v createdb &>/dev/null; then
    createdb mindtrack 2>/dev/null || echo "  Database 'mindtrack' already exists"
else
    echo "  ⚠ Could not auto-create database. Run: createdb mindtrack"
fi

# ── 4. Setup & Start Backend ──
echo "🟢 Setting up Backend..."
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
    echo "  Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install deps if needed (check for fastapi as marker)
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "  Installing Python dependencies (first time only)..."
    pip install -r requirements.txt -q
fi

echo "🟢 Starting Backend (port 8000)..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

sleep 3

# ── 5. Setup & Start Frontend ──
echo "🟢 Setting up Frontend..."
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "  Installing Node.js dependencies (first time only)..."
    npm install
fi

echo "🟢 Starting Frontend (port 3000)..."
npm run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

sleep 2

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
echo "  Press Ctrl+C to stop all services"
echo ""

# ── Cleanup on exit ──
cleanup() {
    echo ""
    echo "🔴 Stopping MindTrack AI..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    pkill -f "uvicorn main:app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    echo "  Done. Backend & Frontend stopped."
    echo "  (PostgreSQL and Redis continue running as background services)"
    echo "  To stop them: brew services stop postgresql@15 && brew services stop redis"
}
trap cleanup EXIT

wait
