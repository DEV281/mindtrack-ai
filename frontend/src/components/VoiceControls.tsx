/**
 * VoiceControls — Pause / Stop / Volume bar shown while AI is speaking.
 *
 * Animated speaking indicator with bouncing bars, sentence progress,
 * and framer-motion slide-in/out.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, Square, Volume2 } from 'lucide-react';

interface VoiceControlsProps {
  isSpeaking: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  currentSentence: number;
  totalSentences: number;
}

/* ---- Bouncing bars indicator ---- */

function SpeakingBars() {
  const heights = [12, 18, 10, 16, 8];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 20 }}>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          animate={{
            height: [h * 0.3, h, h * 0.5, h * 0.8, h * 0.3],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.12,
            ease: 'easeInOut',
          }}
          style={{
            width: 3,
            borderRadius: 2,
            background: '#00e5a0',
          }}
        />
      ))}
    </div>
  );
}

/* ---- Component ---- */

export function VoiceControls({
  isSpeaking,
  isPaused,
  onPause,
  onResume,
  onStop,
  volume,
  onVolumeChange,
  currentSentence,
  totalSentences,
}: VoiceControlsProps): React.ReactElement {
  return (
    <AnimatePresence>
      {isSpeaking && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ overflow: 'hidden' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 12px',
              borderRadius: 12,
              background: 'rgba(0,229,160,0.06)',
              border: '1px solid rgba(0,229,160,0.15)',
              marginBottom: 8,
            }}
          >
            {/* Pause / Resume */}
            <button
              onClick={isPaused ? onResume : onPause}
              title={isPaused ? 'Resume' : 'Pause'}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,229,160,0.12)',
                border: '1px solid rgba(0,229,160,0.25)',
                cursor: 'pointer',
                flexShrink: 0,
                color: '#00e5a0',
              }}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>

            {/* Stop */}
            <button
              onClick={onStop}
              title="Stop speaking"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                cursor: 'pointer',
                flexShrink: 0,
                color: '#ef4444',
              }}
            >
              <Square size={12} />
            </button>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <Volume2 size={14} style={{ color: '#7fa8c4', flexShrink: 0 }} />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                style={{
                  width: 70,
                  accentColor: '#00e5a0',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Bouncing bars */}
            {!isPaused && <SpeakingBars />}

            {/* Progress */}
            <span
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                marginLeft: 'auto',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {isPaused ? 'Paused' : 'Speaking…'}{' '}
              {totalSentences > 0 && `${currentSentence} of ${totalSentences}`}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VoiceControls;
