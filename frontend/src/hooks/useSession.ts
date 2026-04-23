import { useEffect, useRef, useCallback } from 'react';
import api from '../api/client';
import useSessionStore from '../store/sessionStore';
import toast from 'react-hot-toast';

interface UseSessionReturn {
  startSession: () => Promise<string | null>;
  stopSession: () => Promise<void>;
  isActive: boolean;
  duration: number;
  formattedDuration: string;
}

export function useSession(): UseSessionReturn {
  const {
    sessionId,
    isActive,
    duration,
    startSession: storeStart,
    stopSession: storeStop,
    updateDuration,
  } = useSessionStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Duration timer
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        updateDuration();
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, updateDuration]);

  const startSession = useCallback(async (): Promise<string | null> => {
    try {
      const { data } = await api.post<{ session_id: string }>('/sessions/start', {
        model_rank: useSessionStore.getState().modelRank,
      });
      storeStart(data.session_id);
      toast.success('Session started');
      return data.session_id;
    } catch {
      toast.error('Failed to start session');
      return null;
    }
  }, [storeStart]);

  const stopSession = useCallback(async (): Promise<void> => {
    if (!sessionId) return;
    try {
      await api.post(`/sessions/${sessionId}/stop`);
      storeStop();
      toast.success('Session saved');
    } catch {
      storeStop();
      toast.error('Session stopped (save may have failed)');
    }
  }, [sessionId, storeStop]);

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    startSession,
    stopSession,
    isActive,
    duration,
    formattedDuration: formatDuration(duration),
  };
}

export default useSession;
