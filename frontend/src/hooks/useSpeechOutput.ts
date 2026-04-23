/**
 * useSpeechOutput — Web Speech API SpeechSynthesis hook.
 *
 * Provides text-to-speech with voice selection, rate/pitch/volume control,
 * markdown stripping, sentence-level queueing, and localStorage persistence.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

export interface VoiceSettings {
  voiceName: string | null;
  rate: number;
  pitch: number;
  volume: number;
  autoSpeak: boolean;
  autoListen: boolean;
  language: string;
}

export interface UseSpeechOutputReturn {
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  selectedVoice: SpeechSynthesisVoice | null;
  availableVoices: SpeechSynthesisVoice[];
  setVoice: (voice: SpeechSynthesisVoice) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (vol: number) => void;
  settings: VoiceSettings;
  updateSettings: (partial: Partial<VoiceSettings>) => void;
  currentSentence: number;
  totalSentences: number;
}

/* ------------------------------------------------------------------
   Constants
   ------------------------------------------------------------------ */

const STORAGE_KEY = 'mindtrack_voice_settings';

const DEFAULT_SETTINGS: VoiceSettings = {
  voiceName: null,
  rate: 0.88,
  pitch: 1.05,
  volume: 0.92,
  autoSpeak: true,
  autoListen: true,
  language: 'en-US',
};

/** Priority list for voice selection — first match wins. */
const VOICE_PRIORITY = [
  'Google UK English Female',
  'Google US English',
  'Microsoft Aria Online (Natural)',
  'Samantha',
];

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function loadSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch { /* ignore corrupt data */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: VoiceSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* storage full — ignore */ }
}

/** Strip markdown, emoji, and formatting from text before speaking. */
function stripMarkdown(text: string): string {
  let cleaned = text;
  // Remove bold and italic markers
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
  cleaned = cleaned.replace(/__(.+?)__/g, '$1');
  cleaned = cleaned.replace(/_(.+?)_/g, '$1');
  // Remove headers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  // Remove emoji (common ranges)
  cleaned = cleaned.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu,
    '',
  );
  // Replace double newlines with pause
  cleaned = cleaned.replace(/\n\n+/g, '. ');
  // Replace bullet points
  cleaned = cleaned.replace(/^[-•*]\s+/gm, ', ');
  // Replace URLs with "link"
  cleaned = cleaned.replace(/https?:\/\/\S+/g, 'link');
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

/** Split text into sentences. */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end-of-string
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.filter((s) => s.trim().length > 0);
}

/** Pick the best voice from the available list. */
function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  savedName: string | null,
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  // Try saved preference
  if (savedName) {
    const saved = voices.find((v) => v.name === savedName);
    if (saved) return saved;
  }

  // Try priority list
  for (const name of VOICE_PRIORITY) {
    const match = voices.find((v) => v.name.includes(name));
    if (match) return match;
  }

  // Any female English voice
  const femaleEn = voices.find(
    (v) => v.lang.startsWith('en') && /female/i.test(v.name),
  );
  if (femaleEn) return femaleEn;

  // First English voice
  const anyEn = voices.find((v) => v.lang.startsWith('en'));
  if (anyEn) return anyEn;

  // Fallback: first available
  return voices[0];
}

/* ------------------------------------------------------------------
   Hook
   ------------------------------------------------------------------ */

export function useSpeechOutput(): UseSpeechOutputReturn {
  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [settings, setSettings] = useState<VoiceSettings>(loadSettings);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [totalSentences, setTotalSentences] = useState(0);

  const utteranceQueueRef = useRef<SpeechSynthesisUtterance[]>([]);
  const speakingIndexRef = useRef(0);
  const cancelledRef = useRef(false);

  /* ---- Load voices ---- */

  useEffect(() => {
    if (!isSupported) return;

    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        setSelectedVoice((prev) => prev ?? pickBestVoice(voices, settings.voiceName));
      }
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;

    // Fallback: if voices don't load after 3s, set empty
    const fallbackTimer = setTimeout(() => {
      if (synth.getVoices().length === 0) {
        console.warn('Text-to-speech voices not available in this browser');
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      synth.onvoiceschanged = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported]);

  /* ---- Persist settings ---- */

  const updateSettings = useCallback((partial: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  /* ---- speak() ---- */

  const speakNextInQueue = useCallback(() => {
    if (cancelledRef.current) return;

    const queue = utteranceQueueRef.current;
    const idx = speakingIndexRef.current;

    if (idx >= queue.length) {
      setIsSpeaking(false);
      setCurrentSentence(0);
      setTotalSentences(0);
      return;
    }

    setCurrentSentence(idx + 1);
    window.speechSynthesis.speak(queue[idx]);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return;

      // Cancel current speech
      cancelledRef.current = true;
      window.speechSynthesis.cancel();
      cancelledRef.current = false;

      const cleaned = stripMarkdown(text);
      const sentences = splitSentences(cleaned);
      if (sentences.length === 0) return;

      const voice = selectedVoice;
      const queue: SpeechSynthesisUtterance[] = sentences.map((s, i) => {
        const utterance = new SpeechSynthesisUtterance(s);
        if (voice) utterance.voice = voice;
        utterance.rate = settings.rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;
        utterance.lang = settings.language;

        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          speakingIndexRef.current = i + 1;
          speakNextInQueue();
        };

        utterance.onerror = (ev) => {
          if (ev.error === 'canceled' || ev.error === 'interrupted') return;
          console.error('Utterance error:', ev.error);
          speakingIndexRef.current = i + 1;
          speakNextInQueue();
        };

        return utterance;
      });

      utteranceQueueRef.current = queue;
      speakingIndexRef.current = 0;
      setTotalSentences(sentences.length);
      setCurrentSentence(1);
      setIsSpeaking(true);
      setIsPaused(false);

      window.speechSynthesis.speak(queue[0]);
    },
    [isSupported, selectedVoice, settings, speakNextInQueue],
  );

  /* ---- stop / pause / resume ---- */

  const stop = useCallback(() => {
    if (!isSupported) return;
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    utteranceQueueRef.current = [];
    speakingIndexRef.current = 0;
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentSentence(0);
    setTotalSentences(0);
    // Clear Chrome ping interval
    if ((window as any).__tts_ping_interval) {
      clearInterval((window as any).__tts_ping_interval);
      (window as any).__tts_ping_interval = null;
    }
    setTimeout(() => { cancelledRef.current = false; }, 0);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported]);

  /* ---- voice / rate / pitch / volume setters ---- */

  const setVoice = useCallback(
    (voice: SpeechSynthesisVoice) => {
      setSelectedVoice(voice);
      updateSettings({ voiceName: voice.name });
    },
    [updateSettings],
  );

  const setRate = useCallback(
    (rate: number) => updateSettings({ rate: Math.max(0.7, Math.min(1.3, rate)) }),
    [updateSettings],
  );

  const setPitch = useCallback(
    (pitch: number) => updateSettings({ pitch: Math.max(0.8, Math.min(1.2, pitch)) }),
    [updateSettings],
  );

  const setVolume = useCallback(
    (vol: number) => updateSettings({ volume: Math.max(0, Math.min(1, vol)) }),
    [updateSettings],
  );

  /* ---- cleanup on unmount ---- */

  useEffect(() => {
    return () => {
      if (isSupported) {
        cancelledRef.current = true;
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    selectedVoice,
    availableVoices,
    setVoice,
    setRate,
    setPitch,
    setVolume,
    settings,
    updateSettings,
    currentSentence,
    totalSentences,
  };
}

export default useSpeechOutput;
