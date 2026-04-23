import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

const AFFIRMATIONS = [
  'You are doing better than you think.',
  'Small steps forward are still steps forward.',
  'It is okay to rest. It is okay to heal.',
  'Your feelings are valid.',
  'You have survived every difficult day so far.',
  'Progress, not perfection.',
  'Be gentle with yourself today.',
  'You deserve kindness, especially from yourself.',
  'Every day is a fresh start.',
  'You are not alone in this.',
  'It is brave to ask for help.',
  'Your wellbeing matters.',
  'This feeling will pass.',
  'You are worthy of support.',
  'One breath at a time.',
]

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

function DailyAffirmation(): React.ReactElement {
  const baseIndex = getDayOfYear() % AFFIRMATIONS.length
  const [offset, setOffset] = useState(0)
  const [visible, setVisible] = useState(true)

  const currentIndex = (baseIndex + offset) % AFFIRMATIONS.length
  const affirmation = AFFIRMATIONS[currentIndex]

  const rotate = useCallback(() => {
    setVisible(false)
    setTimeout(() => {
      setOffset((o) => o + 1)
      setVisible(true)
    }, 200)
  }, [])

  return (
    <div
      style={{
        background: 'var(--primary-light)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
      }}
    >
      <span style={{ fontSize: 22 }}>✨</span>
      <AnimatePresence mode="wait">
        {visible && (
          <motion.p
            key={currentIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{
              flex: 1,
              fontSize: 14,
              fontStyle: 'italic',
              color: 'var(--primary-dark)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            &ldquo;{affirmation}&rdquo;
          </motion.p>
        )}
      </AnimatePresence>
      <button
        onClick={rotate}
        title="New affirmation"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--primary)',
          padding: 4,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  )
}

export default DailyAffirmation
