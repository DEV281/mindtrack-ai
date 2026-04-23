import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CrisisResourcesProps {
  className?: string
}

function CrisisResources({ className = '' }: CrisisResourcesProps): React.ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Persistent pill */}
      <button
        onClick={() => setOpen(true)}
        className={className}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          background: 'var(--rose-light)',
          border: '1px solid var(--rose)',
          borderRadius: 50,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--rose)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 4px 16px rgba(212,130,154,0.25)',
          fontFamily: 'Nunito, sans-serif',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
      >
        🆘 Crisis Help
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-raised)',
                border: '2px solid var(--rose)',
                borderRadius: 20,
                padding: '28px 32px',
                maxWidth: 420,
                width: '100%',
                boxShadow: '0 20px 60px rgba(212,130,154,0.2)',
              }}
            >
              <p style={{ fontSize: 22, marginBottom: 8 }}>💙</p>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                You are not alone.
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
                Help is available right now — no matter what you're going through.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { emoji: '📞', label: '988 — Suicide & Crisis Lifeline', sub: 'Call or text, available 24/7', href: 'tel:988' },
                  { emoji: '💬', label: 'Text HOME to 741741', sub: 'Crisis Text Line — free, 24/7', href: 'sms:741741?body=HOME' },
                  { emoji: '🌐', label: 'findahelpline.com', sub: 'Worldwide mental health resources', href: 'https://findahelpline.com' },
                  { emoji: '🚨', label: '911 — Emergency Services', sub: 'If you are in immediate danger', href: 'tel:911' },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      background: 'var(--rose-light)',
                      borderRadius: 12,
                      textDecoration: 'none',
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.85')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')}
                  >
                    <span style={{ fontSize: 20 }}>{item.emoji}</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--rose)', margin: 0 }}>{item.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{item.sub}</p>
                    </div>
                  </a>
                ))}
              </div>

              <button
                onClick={() => setOpen(false)}
                style={{
                  marginTop: 20,
                  width: '100%',
                  padding: '10px 0',
                  background: 'var(--bg-sunken)',
                  border: 'none',
                  borderRadius: 50,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default CrisisResources
