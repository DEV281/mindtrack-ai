"""WebSocket connection manager for real-time analysis streams."""

from __future__ import annotations

import json
from typing import Dict, List

from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections per session."""

    def __init__(self) -> None:
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        """Accept a new WebSocket connection and register it."""
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str) -> None:
        """Unregister a WebSocket connection."""
        if session_id in self.active_connections:
            self.active_connections[session_id] = [
                ws for ws in self.active_connections[session_id] if ws != websocket
            ]
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def send_json(self, websocket: WebSocket, data: dict) -> None:
        """Send JSON data to a specific connection."""
        await websocket.send_text(json.dumps(data))

    async def broadcast(self, session_id: str, data: dict) -> None:
        """Broadcast JSON data to all connections in a session."""
        if session_id in self.active_connections:
            message = json.dumps(data)
            disconnected: List[WebSocket] = []
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    disconnected.append(connection)
            for ws in disconnected:
                self.disconnect(ws, session_id)

    def get_connection_count(self, session_id: str) -> int:
        """Return the number of active connections for a session."""
        return len(self.active_connections.get(session_id, []))

    def get_total_connections(self) -> int:
        """Return total number of active connections across all sessions."""
        return sum(len(conns) for conns in self.active_connections.values())


manager = ConnectionManager()
