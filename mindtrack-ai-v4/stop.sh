#!/bin/bash
# ═══════════════════════════════════════════════════════════
# MindTrack AI v4 — Stop All Services
# Usage: ./stop.sh
# ═══════════════════════════════════════════════════════════

# Fix PATH for Homebrew
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"

echo "🔴 Stopping MindTrack AI..."

# Kill backend and frontend processes
pkill -f "uvicorn main:app" 2>/dev/null && echo "  ✅ Backend stopped" || echo "  Backend not running"
pkill -f "vite" 2>/dev/null && echo "  ✅ Frontend stopped" || echo "  Frontend not running"
pkill -f "ngrok" 2>/dev/null && echo "  ✅ ngrok stopped" || echo "  ngrok not running"

# Optionally stop database services
read -p "Stop PostgreSQL & Redis? (y/N): " REPLY
if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    brew services stop postgresql@15 2>/dev/null || true
    brew services stop redis 2>/dev/null || true
    echo "  ✅ Database services stopped"
fi

echo "Done."
