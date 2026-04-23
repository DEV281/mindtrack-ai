import { create } from 'zustand';

interface EmotionScores {
  neutral: number;
  happy: number;
  tense: number;
  anxious: number;
  sad: number;
  fear: number;
  surprised: number;
}

interface AnalysisReading {
  timestamp: number;
  stress: number;
  anxiety: number;
  stability: number;
  depression_risk: number;
  overall_risk: number;
  emotions: EmotionScores;
  voice_freq: number;
  voice_amplitude: number;
  micro_expression_pct: number;
  confidence: number;
  model_rank: number;
  alerts: string[];
}

interface SessionState {
  sessionId: string | null;
  isActive: boolean;
  isPaused: boolean;
  startTime: number | null;
  duration: number;
  readings: AnalysisReading[];
  latestReading: AnalysisReading | null;
  modelRank: number;
  chatMode: 'live' | 'consult' | 'free';
  isConnected: boolean;

  startSession: (sessionId: string) => void;
  stopSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  addReading: (reading: AnalysisReading) => void;
  setModelRank: (rank: number) => void;
  setChatMode: (mode: 'live' | 'consult' | 'free') => void;
  setConnected: (connected: boolean) => void;
  updateDuration: () => void;
  reset: () => void;
}

const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  isActive: false,
  isPaused: false,
  startTime: null,
  duration: 0,
  readings: [],
  latestReading: null,
  modelRank: 1,
  chatMode: 'live',
  isConnected: false,

  startSession: (sessionId: string) =>
    set({
      sessionId,
      isActive: true,
      isPaused: false,
      startTime: Date.now(),
      duration: 0,
      readings: [],
      latestReading: null,
    }),

  stopSession: () =>
    set({
      isActive: false,
      isPaused: false,
      isConnected: false,
    }),

  pauseSession: () => set({ isPaused: true }),
  resumeSession: () => set({ isPaused: false }),

  addReading: (reading: AnalysisReading) => {
    const { readings } = get();
    const updated = [...readings, reading].slice(-300); // Keep last 300 readings
    set({ readings: updated, latestReading: reading });
  },

  setModelRank: (rank: number) => set({ modelRank: rank }),
  setChatMode: (mode: 'live' | 'consult' | 'free') => set({ chatMode: mode }),
  setConnected: (connected: boolean) => set({ isConnected: connected }),

  updateDuration: () => {
    const { startTime, isActive, isPaused } = get();
    if (startTime && isActive && !isPaused) {
      set({ duration: Math.floor((Date.now() - startTime) / 1000) });
    }
  },

  reset: () =>
    set({
      sessionId: null,
      isActive: false,
      isPaused: false,
      startTime: null,
      duration: 0,
      readings: [],
      latestReading: null,
      modelRank: 1,
      chatMode: 'live',
      isConnected: false,
    }),
}));

export default useSessionStore;
export type { AnalysisReading, EmotionScores, SessionState };
