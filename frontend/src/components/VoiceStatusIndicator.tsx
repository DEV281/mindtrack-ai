/**
 * VoiceStatusIndicator — animated waveform bars showing TTS state.
 *
 * Renders 4 bars that animate when speaking and freeze when paused.
 * Returns null when idle (not speaking and not paused).
 */

import { motion } from 'framer-motion';

interface VoiceStatusIndicatorProps {
  isSpeaking: boolean;
  isPaused: boolean;
}

const BAR_HEIGHTS = [14, 20, 12, 18];
const BAR_DELAYS = [0, 0.15, 0.3, 0.1];

function VoiceStatusIndicator({ isSpeaking, isPaused }: VoiceStatusIndicatorProps): React.ReactElement | null {
  if (!isSpeaking && !isPaused) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '4px 8px',
        borderRadius: 12,
        background: isPaused ? 'var(--amber-light, #fff3cd)' : 'var(--primary-light, #e8f0fe)',
      }}
      title={isPaused ? 'Speech paused' : 'Speaking...'}
    >
      {BAR_HEIGHTS.map((maxH, i) => (
        <motion.div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: isPaused ? 'var(--amber, #d4a017)' : 'var(--primary, #5b9bd5)',
          }}
          animate={
            isPaused
              ? { height: maxH * 0.4 }
              : {
                  height: [maxH * 0.3, maxH, maxH * 0.5, maxH * 0.8, maxH * 0.3],
                }
          }
          transition={
            isPaused
              ? { duration: 0.3 }
              : {
                  duration: 0.8,
                  repeat: Infinity,
                  repeatType: 'mirror' as const,
                  delay: BAR_DELAYS[i],
                  ease: 'easeInOut',
                }
          }
        />
      ))}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          marginLeft: 4,
          color: isPaused ? 'var(--amber, #d4a017)' : 'var(--primary, #5b9bd5)',
          fontFamily: 'Nunito, sans-serif',
        }}
      >
        {isPaused ? 'Paused' : 'Speaking'}
      </span>
    </div>
  );
}

export default VoiceStatusIndicator;
