import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BreakReminderProps {
  activeSeconds: number
  onTakeBreak: () => void
}

const BREAK_THRESHOLD = 30 * 60 // 30 minutes
const SNOOZE_DURATION = 15 * 60 // 15 minutes

function BreakReminder({ activeSeconds, onTakeBreak }: BreakReminderProps): React.ReactElement | null {
  const [visible, setVisible] = useState(false)
  const snoozedAt = useRef<number | null>(null)

  useEffect(() => {
    if (activeSeconds <= 0) {
      setVisible(false)
      snoozedAt.current = null
      return
    }

    // Check if snoozed
    if (snoozedAt.current !== null) {
      const elapsed = activeSeconds - snoozedAt.current
      if (elapsed < SNOOZE_DURATION) return
    }

    if (activeSeconds >= BREAK_THRESHOLD && !visible) {
      setVisible(true)
    }
  }, [activeSeconds, visible])

  const handleKeepGoing = () => {
    snoozedAt.current = activeSeconds
    setVisible(false)
  }

  const handleTakeBreak = () => {
    setVisible(false)
    onTakeBreak()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          style={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 8000,
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '18px 24px',
            maxWidth: 480,
            width: 'calc(100vw - 48px)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <span style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>🌱</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              You&apos;ve been here for 30 minutes
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
              Remember to take a short break — stretch, breathe, have some water. I&apos;ll be here when you return.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleTakeBreak}
                style={{
                  background: 'var(--green-light)',
                  border: 'none',
                  borderRadius: 50,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--green)',
                  cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                Take a Break
              </button>
              <button
                onClick={handleKeepGoing}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 50,
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                Keep Going
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default BreakReminder
