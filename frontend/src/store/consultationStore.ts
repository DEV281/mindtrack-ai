import { create } from 'zustand';

export interface ConsultationMessage {
  id: string;
  sender: 'ai' | 'patient';
  message_text: string;
  timestamp: string;
  stress_at_message?: number;
  anxiety_at_message?: number;
  emotions_json?: Record<string, number>;
  is_assessment_question?: boolean;
  assessment_q_index?: number;
  assessment_answer?: number;
  image_url?: string;
  voice_transcript?: string;
  input_method?: string;
}

export interface AssessmentQuestion {
  index: number;
  category: string;
  text: string;
  options: Array<{ value: number; label: string }>;
  total: number;
}

export interface StressUpdate {
  stress: number;
  anxiety: number;
  stability: number;
  depression_risk: number;
  overall_risk: number;
  emotions: Record<string, number>;
  voice_freq: number;
  voice_amplitude: number;
  micro_expression_pct: number;
  confidence: number;
}

interface ConsultationState {
  consultationId: string | null;
  isActive: boolean;
  mode: 'live' | 'assessment' | 'free';
  messages: ConsultationMessage[];
  currentQuestion: AssessmentQuestion | null;
  assessmentProgress: number;
  stressUpdate: StressUpdate | null;
  modelRank: number;
  startTime: number | null;
  duration: number;
  isConnected: boolean;
  alerts: string[];

  // PHQ-9 / GAD-7 results
  phq9Score: number | null;
  phq9Level: string | null;
  gad7Score: number | null;
  gad7Level: string | null;
  assessmentComplete: boolean;

  // Actions
  startConsultation: (id: string) => void;
  stopConsultation: () => void;
  setMode: (mode: 'live' | 'assessment' | 'free') => void;
  addMessage: (msg: ConsultationMessage) => void;
  setCurrentQuestion: (q: AssessmentQuestion | null) => void;
  setAssessmentProgress: (p: number) => void;
  setStressUpdate: (s: StressUpdate) => void;
  setModelRank: (rank: number) => void;
  setConnected: (c: boolean) => void;
  setAlerts: (a: string[]) => void;
  setAssessmentResult: (phq9: number, phq9Level: string, gad7: number, gad7Level: string) => void;
  updateDuration: () => void;
  reset: () => void;
}

const useConsultationStore = create<ConsultationState>((set, get) => ({
  consultationId: null,
  isActive: false,
  mode: 'live',
  messages: [],
  currentQuestion: null,
  assessmentProgress: 0,
  stressUpdate: null,
  modelRank: 1,
  startTime: null,
  duration: 0,
  isConnected: false,
  alerts: [],
  phq9Score: null,
  phq9Level: null,
  gad7Score: null,
  gad7Level: null,
  assessmentComplete: false,

  startConsultation: (id: string) =>
    set({
      consultationId: id,
      isActive: true,
      startTime: Date.now(),
      duration: 0,
      messages: [],
      currentQuestion: null,
      assessmentProgress: 0,
      phq9Score: null,
      gad7Score: null,
      assessmentComplete: false,
      alerts: [],
    }),

  stopConsultation: () =>
    set({ isActive: false, isConnected: false }),

  setMode: (mode) => set({ mode }),

  addMessage: (msg) => {
    const { messages } = get();
    set({ messages: [...messages, msg] });
  },

  setCurrentQuestion: (q) => set({ currentQuestion: q }),
  setAssessmentProgress: (p) => set({ assessmentProgress: p }),
  setStressUpdate: (s) => set({ stressUpdate: s }),
  setModelRank: (rank) => set({ modelRank: rank }),
  setConnected: (c) => set({ isConnected: c }),
  setAlerts: (a) => set({ alerts: a }),

  setAssessmentResult: (phq9, phq9Level, gad7, gad7Level) =>
    set({ phq9Score: phq9, phq9Level, gad7Score: gad7, gad7Level, assessmentComplete: true }),

  updateDuration: () => {
    const { startTime, isActive } = get();
    if (startTime && isActive) {
      set({ duration: Math.floor((Date.now() - startTime) / 1000) });
    }
  },

  reset: () =>
    set({
      consultationId: null,
      isActive: false,
      mode: 'live',
      messages: [],
      currentQuestion: null,
      assessmentProgress: 0,
      stressUpdate: null,
      modelRank: 1,
      startTime: null,
      duration: 0,
      isConnected: false,
      alerts: [],
      phq9Score: null,
      phq9Level: null,
      gad7Score: null,
      gad7Level: null,
      assessmentComplete: false,
    }),
}));

export default useConsultationStore;
