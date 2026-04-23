import { useEffect, useRef, useState, useCallback } from 'react';
import { getAccessToken, WS_BASE } from '../api/client';
import useSessionStore from '../store/sessionStore';
import type { AnalysisReading } from '../store/sessionStore';

interface UseWebSocketOptions {
  sessionId: string | null;
  onMessage?: (data: AnalysisReading) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  error: string | null;
  send: (data: Record<string, unknown>) => void;
  reconnect: () => void;
  disconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { sessionId, onMessage, onError, onClose } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 10;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addReading = useSessionStore((s) => s.addReading);
  const setConnected = useSessionStore((s) => s.setConnected);

  const connect = useCallback(() => {
    if (!sessionId) return;

    const token = getAccessToken();
    let url: string;
    if (WS_BASE) {
      // Production: connect directly to Railway backend
      url = `${WS_BASE}/ws/session/${sessionId}${token ? `?token=${token}` : ''}`;
    } else {
      // Local dev: use Vite proxy via window.location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      url = `${protocol}//${host}/ws/session/${sessionId}${token ? `?token=${token}` : ''}`;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as AnalysisReading;
          addReading(data);
          onMessage?.(data);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = (event: Event) => {
        setError('WebSocket connection error');
        onError?.(event);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setConnected(false);
        onClose?.();

        // Exponential backoff reconnection
        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptRef.current),
            30000
          );
          reconnectAttemptRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Failed to reconnect after multiple attempts');
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WebSocket connection failed');
    }
  }, [sessionId, addReading, setConnected, onMessage, onError, onClose]);

  useEffect(() => {
    if (sessionId) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId, connect]);

  const send = useCallback(
    (data: Record<string, unknown>) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(data));
      }
    },
    []
  );

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0;
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  const disconnect = useCallback(() => {
    reconnectAttemptRef.current = maxReconnectAttempts; // Prevent auto-reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsConnected(false);
    setConnected(false);
  }, [setConnected]);

  return { isConnected, error, send, reconnect, disconnect };
}

export default useWebSocket;
