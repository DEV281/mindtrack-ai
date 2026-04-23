/**
 * VoiceInputButton — Microphone toggle button with visual state feedback.
 *
 * Shows pulse animation when listening, amber spin when processing,
 * and sound wave rings for active recording.
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { useSpeechInput } from '../hooks/useSpeechInput';
import type { SpeechInputState } from '../hooks/useSpeechInput';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  onInterim: (text: string) => void;
  disabled?: boolean;
}

/* ---- Styled sub-components ---- */

function PulseRings() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="voice-input-ring"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid #00e5a0',
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

/* ---- Style maps by state ---- */

const stateStyles: Record<SpeechInputState, React.CSSProperties> = {
  idle: {
    background: 'rgba(0,229,160,0.15)',
    border: '1px solid rgba(0,229,160,0.3)',
  },
  listening: {
    background: 'rgba(0,229,160,0.2)',
    border: '2px solid #00e5a0',
  },
  processing: {
    background: 'rgba(255,176,32,0.15)',
    border: '1px solid #ffb020',
  },
  error: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid #ef4444',
  },
};

const iconColors: Record<SpeechInputState, string> = {
  idle: '#7fa8c4',
  listening: '#00e5a0',
  processing: '#ffb020',
  error: '#ef4444',
};

const tooltips: Record<SpeechInputState, string> = {
  idle: 'Click to speak',
  listening: 'Listening… click to stop',
  processing: 'Processing speech…',
  error: 'Speech error — click to retry',
};

/* ---- Component ---- */

export function VoiceInputButton({
  onTranscript,
  onInterim,
  disabled = false,
}: VoiceInputButtonProps): React.ReactElement {
  const {
    isListening,
    transcript,
    finalTranscript,
    toggleListening,
    isSupported,
    state,
  } = useSpeechInput();

  const prevFinalRef = useRef('');

  // Forward interim transcript
  useEffect(() => {
    if (transcript) {
      onInterim(transcript);
    }
  }, [transcript, onInterim]);

  // Forward final transcript — only if it changed
  useEffect(() => {
    if (finalTranscript && finalTranscript !== prevFinalRef.current) {
      prevFinalRef.current = finalTranscript;
      onTranscript(finalTranscript);
    }
  }, [finalTranscript, onTranscript]);

  if (!isSupported) {
    return (
      <button
        disabled
        title="Voice input requires Chrome or Edge browser. Text input is still fully available."
        className="voice-input-btn voice-input-btn--disabled"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'not-allowed',
          opacity: 0.4,
          background: 'rgba(100,100,100,0.15)',
          border: '1px solid rgba(100,100,100,0.3)',
          flexShrink: 0,
        }}
      >
        <MicOff size={20} color="#666" />
      </button>
    );
  }

  const style = stateStyles[state];
  const iconColor = iconColors[state];
  const tooltip = tooltips[state];

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <motion.button
        onClick={() => {
          if (!disabled) toggleListening();
        }}
        disabled={disabled}
        title={tooltip}
        whileTap={{ scale: 0.92 }}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
          outline: 'none',
          ...style,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <AnimatePresence>
          {state === 'listening' && <PulseRings />}
        </AnimatePresence>

        {state === 'processing' ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Mic size={20} color={iconColor} />
          </motion.div>
        ) : isListening ? (
          <Mic size={20} color={iconColor} />
        ) : (
          <MicOff size={20} color={iconColor} />
        )}
      </motion.button>
    </div>
  );
}

export default VoiceInputButton;
