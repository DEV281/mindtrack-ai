import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Type, X } from 'lucide-react';

interface MicPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseText: () => void;
}

function MicPermissionModal({ isOpen, onClose, onUseText }: MicPermissionModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  const steps = [
    { emoji: '🔍', text: 'Look for the microphone icon in your browser address bar' },
    { emoji: '✅', text: 'Click "Allow" when asked for permission' },
    { emoji: '🔄', text: 'Refresh the page if it still doesn\'t work' },
    { emoji: '⚙️', text: 'Or go to browser Settings → Privacy → Site Settings → Microphone' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'white',
            borderRadius: 24,
            padding: 32,
            width: '100%',
            maxWidth: 440,
            boxShadow: '0 20px 60px rgba(91,155,213,0.2)',
            fontFamily: 'Nunito, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(212,130,154,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MicOff style={{ width: 22, height: 22, color: '#d4829a' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#2c3e50', margin: 0 }}>
                  Microphone access needed
                </h2>
                <p style={{ fontSize: 13, color: '#5d7a8a', margin: 0 }}>
                  To use voice features
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: 'none',
                background: 'var(--bg-sunken)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#8fa8b8',
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 12,
                  borderRadius: 14,
                  background: '#f7f9fc',
                  fontSize: 14,
                  color: '#2c3e50',
                }}
              >
                <span style={{ fontSize: 18 }}>{step.emoji}</span>
                <span>{step.text}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => {
                // Try to trigger permission
                navigator.mediaDevices.getUserMedia({ audio: true })
                  .then(() => onClose())
                  .catch(() => { /* still show modal */ });
              }}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 50,
                border: 'none',
                background: 'linear-gradient(135deg, #5b9bd5, #7ab4e8)',
                color: 'white',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Mic style={{ width: 16, height: 16 }} />
              Try again
            </button>
            <button
              onClick={onUseText}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 50,
                border: '1.5px solid #dde7ef',
                background: 'white',
                color: '#5d7a8a',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Type style={{ width: 16, height: 16 }} />
              Use text instead
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default MicPermissionModal;
