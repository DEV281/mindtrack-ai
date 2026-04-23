import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SessionStartModalProps {
  isOpen: boolean
  onReady: () => void
  onSkip: () => void
}

const SKIP_PREF_KEY = 'mindtrack_skip_session_intro'

export function getSkipPref(): boolean {
  return localStorage.getItem(SKIP_PREF_KEY) === 'true'
}

function SessionStartModal({ isOpen, onReady, onSkip }: SessionStartModalProps): React.ReactElement | null {
  const [remembered, setRemembered] = useState(false)

  const handleReady = () => {
    if (remembered) localStorage.setItem(SKIP_PREF_KEY, 'true')
    onReady()
  }

  const handleSkip = () => {
    if (remembered) localStorage.setItem(SKIP_PREF_KEY, 'true')
    onSkip()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.40)',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: '36px 40px',
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Before we begin
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
            Find a quiet, comfortable spot.<br />
            You&apos;ll need camera and microphone access.<br />
            This session is just for you.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleReady}
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--lavender))',
                color: 'white',
                border: 'none',
                borderRadius: 50,
                padding: '13px 0',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              I&apos;m Ready →
            </button>

            <button
              onClick={handleSkip}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 13,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
                padding: '8px 0',
              }}
            >
              Skip intro
            </button>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 16,
              fontSize: 12,
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={remembered}
              onChange={(e) => setRemembered(e.target.checked)}
              style={{ accentColor: 'var(--primary)' }}
            />
            Don&apos;t show this again
          </label>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default SessionStartModal
