/**
 * useSpeechInput — Web Speech API SpeechRecognition hook.
 *
 * Provides speech-to-text conversion using the browser's built-in
 * SpeechRecognition API.  Returns live interim transcripts as well as
 * confirmed final text, with debounced auto-send support.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

/* ------------------------------------------------------------------
   Web Speech API type shims (not always in TS lib)
   ------------------------------------------------------------------ */

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventShim extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventShim extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionShim extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEventShim) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventShim) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtorType = new () => SpeechRecognitionShim;

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

export type SpeechInputState = 'idle' | 'listening' | 'processing' | 'error';

export interface UseSpeechInputReturn {
  isListening: boolean;
  transcript: string;
  finalTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  isSupported: boolean;
  error: string | null;
  state: SpeechInputState;
  resetTranscript: () => void;
}

/* ------------------------------------------------------------------
   Browser compat shim
   ------------------------------------------------------------------ */

const SpeechRecognitionCtor: SpeechRecognitionCtorType | undefined =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : undefined;

/* ------------------------------------------------------------------
   HTTPS check
   ------------------------------------------------------------------ */

function isSecureContext(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return true;
  return window.location.protocol === 'https:';
}

/* ------------------------------------------------------------------
   Hook
   ------------------------------------------------------------------ */

export function useSpeechInput(): UseSpeechInputReturn {
  const isSupported = !!SpeechRecognitionCtor && isSecureContext();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SpeechInputState>('idle');

  const recognitionRef = useRef<SpeechRecognitionShim | null>(null);
  const shouldListenRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- helpers ---- */

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  /* ---- start ---- */

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Use Chrome or Edge.');
      setState('error');
      return;
    }

    if (!isSecureContext()) {
      setError('Voice features require a secure connection (HTTPS). Please contact your administrator.');
      setState('error');
      return;
    }

    // Tear down any previous instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
    }

    const recognition = new SpeechRecognitionCtor!();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setState('listening');
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEventShim) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (interim) {
        setTranscript(interim);
        setState('listening');
        // Reset debounce timer on new interim result
        clearDebounce();
      }

      if (final) {
        setTranscript('');
        setFinalTranscript(final.trim());
        setState('processing');

        // Auto-send after 1.5s silence
        clearDebounce();
        debounceTimerRef.current = setTimeout(() => {
          setState('listening');
        }, 1500);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventShim) => {
      const code = event.error;

      switch (code) {
        case 'not-allowed':
          setError('Microphone permission denied. Click the mic icon in your browser address bar to allow.');
          setState('error');
          shouldListenRef.current = false;
          setIsListening(false);
          break;
        case 'no-speech':
          // Silently restart — user just hasn't spoken yet
          break;
        case 'network':
          setError('Speech recognition needs an internet connection.');
          setState('error');
          break;
        case 'aborted':
          // Intentional abort — no action needed
          break;
        default:
          setError(`Speech recognition error: ${code}`);
          setState('error');
          console.error('SpeechRecognition error:', code, event);
          break;
      }
    };

    recognition.onend = () => {
      // Auto-restart if we should still be listening
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          // May fail if already started — eat it
        }
      } else {
        setIsListening(false);
        setState('idle');
      }
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError('Failed to start speech recognition.');
      setState('error');
    }
  }, [isSupported, clearDebounce]);

  /* ---- stop ---- */

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    clearDebounce();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { /* ignore */ }
    }

    setIsListening(false);
    setState('idle');
  }, [clearDebounce]);

  /* ---- toggle ---- */

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  /* ---- reset ---- */

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
  }, []);

  /* ---- cleanup on unmount ---- */

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      clearDebounce();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
    };
  }, [clearDebounce]);

  return {
    isListening,
    transcript,
    finalTranscript,
    startListening,
    stopListening,
    toggleListening,
    isSupported,
    error,
    state,
    resetTranscript,
  };
}

export default useSpeechInput;
