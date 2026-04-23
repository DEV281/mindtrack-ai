#!/bin/bash
# ═══════════════════════════════════════════════════════════
# MindTrack AI v4 — GLOBAL MODE (Double-click to run!)
# ═══════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/opt/homebrew/opt/postgresql@15/bin:$HOME/.pyenv/shims:$PATH"

clear
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║      MindTrack AI v4.0 — GLOBAL MODE    ║"
echo "  ║   Mental Health Stress Detection         ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# Check ngrok
if ! command -v ngrok &>/dev/null; then
    echo "❌ ngrok not found. Install: brew install ngrok"
    echo "Press any key to close..."
    read -n 1
    exit 1
fi

# Kill stale
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "ngrok" 2>/dev/null || true
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

# Build Frontend
echo "🟢 Building Frontend for production..."
cd "$SCRIPT_DIR/frontend"
[ ! -d "node_modules" ] && npm install
npm run build 2>&1 | tail -3
cd "$SCRIPT_DIR"

# Backend
echo "🟢 Starting Backend..."
cd "$SCRIPT_DIR/backend"
[ ! -d "venv" ] && python3 -m venv venv
source venv/bin/activate
python3 -c "import fastapi" 2>/dev/null || pip install -r requirements.txt -q
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"
sleep 3

# ngrok
echo "🟢 Starting ngrok tunnel..."
ngrok http 8000 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

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
            print(t['public_url']); break
    else:
        if tunnels: print(tunnels[0]['public_url'])
except: pass
" 2>/dev/null)
    [ -n "$NGROK_URL" ] && break
    echo "  Waiting for tunnel..."
done

if [ -z "$NGROK_URL" ]; then
    echo ""
    echo "  ⚠️  Could not get ngrok URL. Check: http://localhost:4040"
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
    echo "  Share the PUBLIC URL with anyone!"
    echo ""
    open "$NGROK_URL" 2>/dev/null
fi

echo "  Press Ctrl+C to stop all services"
echo ""

cleanup() {
    echo ""
    echo "🔴 Stopping MindTrack AI..."
    kill $BACKEND_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    pkill -f "uvicorn main:app" 2>/dev/null || true
    pkill -f "ngrok" 2>/dev/null || true
    echo "  Done."
}
trap cleanup EXIT
wait
