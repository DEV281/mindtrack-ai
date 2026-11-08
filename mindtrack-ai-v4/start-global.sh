#!/bin/bash
# ═══════════════════════════════════════════════════════════
# MindTrack AI v4 — Global (ngrok) Starter
# Usage: ./start-global.sh
# ═══════════════════════════════════════════════════════════

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── Fix PATH for Homebrew, pyenv, node, postgres ──
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/opt/homebrew/opt/postgresql@15/bin:$HOME/.pyenv/shims:$PATH"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║      MindTrack AI v4.0 — GLOBAL MODE    ║"
echo "  ║   Mental Health Stress Detection         ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── Check ngrok ──
if ! command -v ngrok &>/dev/null; then
    echo "❌ ngrok not found. Install it with: brew install ngrok"
    exit 1
fi

# ── 0. Kill stale processes ──
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "ngrok" 2>/dev/null || true
sleep 1

# ── 1. Start PostgreSQL ──
echo "🟢 Starting PostgreSQL..."
if command -v brew &>/dev/null; then
    brew services start postgresql@15 2>/dev/null || echo "  (already running)"
elif command -v systemctl &>/dev/null; then
    sudo systemctl start postgresql 2>/dev/null || echo "  (already running)"
fi

# ── 2. Start Redis ──
echo "🟢 Starting Redis..."
if command -v brew &>/dev/null; then
    brew services start redis 2>/dev/null || echo "  (already running)"
elif command -v systemctl &>/dev/null; then
    sudo systemctl start redis-server 2>/dev/null || echo "  (already running)"
fi

sleep 2

# ── 3. Create database if needed ──
echo "🟢 Checking database..."
if command -v createdb &>/dev/null; then
    createdb mindtrack 2>/dev/null || echo "  Database 'mindtrack' already exists"
fi

# ── 4. Build Frontend ──
echo "🟢 Building Frontend for production..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "  Installing Node.js dependencies..."
    npm install
fi
npm run build 2>&1 | tail -3
cd "$SCRIPT_DIR"

# ── 5. Start Backend (serves both API + Frontend) ──
echo "🟢 Starting Backend (port 8000)..."
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
    echo "  Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "  Installing Python dependencies..."
    pip install -r requirements.txt -q
fi

uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

sleep 3

# ── 6. Start ngrok tunnel ──
echo "🟢 Starting ngrok tunnel..."
ngrok http 8000 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to be ready (retry up to 15 seconds)
NGROK_URL=""
for i in 1 2 3 4 5 6 7; do
    sleep 2
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tunnels = data.get('tunnels', [])
    for t in tunnels:
        if t.get('proto') == 'https':
            print(t['public_url'])
            break
    else:
        if tunnels:
            print(tunnels[0]['public_url'])
except: pass
" 2>/dev/null)
    if [ -n "$NGROK_URL" ]; then
        break
    fi
    echo "  Waiting for ngrok tunnel..."
done

if [ -z "$NGROK_URL" ]; then
    echo ""
    echo "  ⚠️  Could not get ngrok URL automatically."
    echo "  Check ngrok dashboard: http://localhost:4040"
    echo ""
else
    echo ""
    echo "  ════════════════════════════════════════════"
    echo "  ✅ MindTrack AI v4 is LIVE GLOBALLY!"
    echo ""
    echo "  🌍 PUBLIC URL:  $NGROK_URL"
    echo "  🔌 Local:       http://localhost:8000"
    echo "  📚 API Docs:    $NGROK_URL/docs"
    echo ""
    echo "  👤 Demo Login:  demo@mindtrack.ai / Demo@1234"
    echo "  🤖 AI Engine:   Groq Llama 3.3 70B"
    echo "  ════════════════════════════════════════════"
    echo ""
    echo "  Share the PUBLIC URL with anyone to access!"
    echo ""
fi

echo "  Press Ctrl+C to stop all services"
echo ""

# ── Cleanup on exit ──
cleanup() {
    echo ""
    echo "🔴 Stopping MindTrack AI..."
    kill $BACKEND_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    pkill -f "uvicorn main:app" 2>/dev/null || true
    pkill -f "ngrok" 2>/dev/null || true
    echo "  Done. Backend & ngrok stopped."
    echo "  (PostgreSQL and Redis continue running as background services)"
}
trap cleanup EXIT

wait
