/**
 * VoicePermissionModal — First-session onboarding modal that explains
 * voice features and requests microphone permission.
 *
 * Remembers the user's choice in localStorage so it only shows once.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MessageSquare, CheckCircle } from 'lucide-react';

const STORAGE_KEY = 'mindtrack_voice_pref';

export type VoicePreference = 'voice' | 'text' | null;

/** Check whether the user has already made a choice. */
export function getVoicePreference(): VoicePreference {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'voice' || val === 'text') return val;
  } catch { /* ignore */ }
  return null;
}

/** Save voice preference to localStorage. */
function savePreference(pref: 'voice' | 'text'): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch { /* ignore */ }
}

interface VoicePermissionModalProps {
  isOpen: boolean;
  onChoose: (mode: 'voice' | 'text') => void;
}

export function VoicePermissionModal({
  isOpen,
  onChoose,
}: VoicePermissionModalProps): React.ReactElement {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnableVoice = async () => {
    setRequesting(true);
    setError(null);
    try {
      // Request mic permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop the test stream — the actual hooks will open their own
      stream.getTracks().forEach((t) => t.stop());
      savePreference('voice');
      onChoose('voice');
    } catch (err) {
      setError('Microphone permission denied. You can enable it later in Settings.');
      // Still allow continuing in text mode
      setTimeout(() => {
        savePreference('text');
        onChoose('text');
      }, 2500);
    } finally {
      setRequesting(false);
    }
  };

  const handleTextOnly = () => {
    savePreference('text');
    onChoose('text');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            style={{
              width: '100%',
              maxWidth: 460,
              margin: '0 16px',
              borderRadius: 20,
              padding: '32px 28px',
              background: 'linear-gradient(145deg, rgba(18,24,38,0.98), rgba(12,17,28,0.98))',
              border: '1px solid rgba(0,229,160,0.15)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header icon */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,229,160,0.12)',
                border: '1px solid rgba(0,229,160,0.25)',
                margin: '0 auto 20px',
              }}
            >
              <Mic size={28} color="#00e5a0" />
            </div>

            <h2
              style={{
                textAlign: 'center',
                fontSize: 20,
                fontWeight: 700,
                color: '#e4eaf0',
                marginBottom: 8,
              }}
            >
              Enable Voice Conversation?
            </h2>

            <p
              style={{
                textAlign: 'center',
                fontSize: 13,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              MindTrack AI can talk with you using your microphone and speakers
              for a more natural therapy experience.
            </p>

            {/* Features */}
            <div style={{ marginBottom: 20 }}>
              {[
                'You can speak instead of type',
                'Dr. AI will speak responses aloud',
                'Fully hands-free consultation',
              ].map((text) => (
                <div
                  key={text}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 0',
                  }}
                >
                  <CheckCircle size={16} color="#00e5a0" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Privacy note */}
            <p
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.35)',
                textAlign: 'center',
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              Your voice is analyzed locally for stress detection.
              <br />
              No audio is stored or transmitted.
            </p>

            {/* Error */}
            {error && (
              <p
                style={{
                  fontSize: 12,
                  color: '#ef4444',
                  textAlign: 'center',
                  marginBottom: 16,
                }}
              >
                {error}
              </p>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleEnableVoice}
                disabled={requesting}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: requesting ? 'wait' : 'pointer',
                  background: 'linear-gradient(135deg, #00e5a0, #00c48c)',
                  color: '#0a0e17',
                  border: 'none',
                  transition: 'opacity 0.2s',
                  opacity: requesting ? 0.7 : 1,
                }}
              >
                <Mic size={16} />
                {requesting ? 'Requesting…' : 'Enable Voice Mode'}
              </button>

              <button
                onClick={handleTextOnly}
                disabled={requesting}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  transition: 'background 0.2s',
                }}
              >
                <MessageSquare size={16} />
                Continue Text Only
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VoicePermissionModal;
