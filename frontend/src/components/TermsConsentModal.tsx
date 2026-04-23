import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, X, ExternalLink, AlertTriangle } from 'lucide-react'
import useAuthStore from '../store/authStore'

// ── Storage key per user so consent is tracked individually ──────────────────
const CONSENT_KEY = (userId: string) => `mindtrack_tos_accepted_${userId}`

export function hasAcceptedTerms(userId: string): boolean {
  return localStorage.getItem(CONSENT_KEY(userId)) === 'accepted'
}

export function markTermsAccepted(userId: string): void {
  localStorage.setItem(CONSENT_KEY(userId), 'accepted')
}

// ── Component ─────────────────────────────────────────────────────────────────
interface TermsConsentModalProps {
  onAccept: () => void
  onReject: () => void
}

function TermsConsentModal({ onAccept, onReject }: TermsConsentModalProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy')
  const [scrolledPrivacy, setScrolledPrivacy] = useState(false)
  const [scrolledTerms, setScrolledTerms] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const canAccept = scrolledPrivacy && scrolledTerms

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const nearBottom = el.scrollHeight - el.scrollTop < el.clientHeight + 80
    if (nearBottom) {
      if (activeTab === 'privacy') setScrolledPrivacy(true)
      if (activeTab === 'terms') setScrolledTerms(true)
    }
  }

  const handleReject = () => {
    setIsRejecting(true)
    setTimeout(() => {
      onReject()
    }, 400)
  }

  return (
    <AnimatePresence>
      <motion.div
        key="tos-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(17, 24, 39, 0.72)',
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={{
            background: 'white',
            borderRadius: 24,
            width: '100%',
            maxWidth: 620,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '24px 28px 16px',
            borderBottom: '1px solid #f0f4f8',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 13,
                background: 'linear-gradient(135deg, #5b9bd5, #9d8fcc)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <ShieldCheck style={{ color: 'white', width: 20, height: 20 }} />
              </div>
              <div>
                <h2 style={{
                  fontFamily: 'Nunito, sans-serif', fontWeight: 900,
                  fontSize: 20, color: '#171c1f', margin: 0,
                }}>
                  Before you begin
                </h2>
                <p style={{ fontSize: 13, color: '#717880', margin: 0, marginTop: 2 }}>
                  Please read and accept our Privacy Policy &amp; Terms to continue
                </p>
              </div>
            </div>

            {/* Disclaimer pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#fef9ec', border: '1px solid #f5d87e',
              borderRadius: 10, padding: '8px 14px', marginTop: 14,
            }}>
              <AlertTriangle style={{ color: '#c9933e', width: 15, height: 15, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: '#7c5b12', margin: 0, lineHeight: 1.5 }}>
                MindTrack AI is a <strong>wellness support tool</strong>, not a licensed clinical service. It cannot replace professional medical advice or emergency services.
              </p>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{
            display: 'flex', gap: 4, padding: '12px 28px 0',
            borderBottom: '1px solid #f0f4f8', flexShrink: 0,
          }}>
            {([
              { id: 'privacy', label: '🔒 Privacy Policy', done: scrolledPrivacy },
              { id: 'terms', label: '📋 Terms of Service', done: scrolledTerms },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.id ? '#5b9bd5' : 'transparent'}`,
                  fontSize: 13, fontWeight: 700,
                  color: activeTab === tab.id ? '#5b9bd5' : '#717880',
                  cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {tab.label}
                {tab.done && (
                  <span style={{
                    width: 16, height: 16, borderRadius: 50,
                    background: '#52b788', color: 'white',
                    fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900,
                  }}>✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Scroll progress hint */}
          {!canAccept && (
            <div style={{
              padding: '6px 28px', background: '#f0f4f8',
              fontSize: 11, color: '#717880', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>👇</span>
              <span>
                Scroll to the bottom of {!scrolledPrivacy ? 'Privacy Policy' : 'Terms of Service'} to enable Accept
              </span>
            </div>
          )}

          {/* Scrollable content */}
          <div
            onScroll={handleScroll}
            style={{
              flex: 1, overflowY: 'auto', padding: '20px 28px',
              scrollBehavior: 'smooth',
            }}
          >
            {activeTab === 'privacy' ? <PrivacySummary /> : <TermsSummary />}
          </div>

          {/* Action Buttons */}
          <div style={{
            padding: '16px 28px 24px',
            borderTop: '1px solid #f0f4f8',
            flexShrink: 0,
            background: 'white',
          }}>
            {/* View full links */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
              <a
                href="/privacy" target="_blank" rel="noreferrer"
                style={{
                  fontSize: 12, color: '#5b9bd5', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700,
                }}
              >
                Full Privacy Policy <ExternalLink style={{ width: 11, height: 11 }} />
              </a>
              <a
                href="/terms" target="_blank" rel="noreferrer"
                style={{
                  fontSize: 12, color: '#5b9bd5', textDecoration: 'none',
                  display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700,
                }}
              >
                Full Terms &amp; Conditions <ExternalLink style={{ width: 11, height: 11 }} />
              </a>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {/* Reject */}
              <button
                onClick={handleReject}
                style={{
                  flex: '0 0 auto', padding: '12px 22px',
                  borderRadius: 50, border: '1.5px solid #dfe3e7',
                  background: 'white', color: '#41474f',
                  fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: isRejecting ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ba1a1a'; e.currentTarget.style.color = '#ba1a1a' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#dfe3e7'; e.currentTarget.style.color = '#41474f' }}
              >
                <X style={{ width: 14, height: 14 }} />
                Decline &amp; Log Out
              </button>

              {/* Accept */}
              <button
                onClick={onAccept}
                disabled={!canAccept}
                title={!canAccept ? 'Please scroll through both tabs first' : ''}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 50, border: 'none',
                  background: canAccept
                    ? 'linear-gradient(135deg, #136299, #5b9bd5)'
                    : '#dfe3e7',
                  color: canAccept ? 'white' : '#a8b4bf',
                  fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15,
                  cursor: canAccept ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: canAccept ? '0 4px 20px rgba(91,155,213,0.35)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <ShieldCheck style={{ width: 17, height: 17 }} />
                {canAccept ? 'I Accept — Enter MindTrack' : 'Scroll both tabs to continue'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Inline summaries (compact for the modal) ─────────────────────────────────

function PrivacySummary(): React.ReactElement {
  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>
      {[
        {
          emoji: '📷', title: 'Camera & Microphone',
          body: 'All camera and microphone data is processed locally in your browser. No video or audio is ever transmitted to our servers. Only numerical scores (e.g. stress: 42/100) are sent.',
        },
        {
          emoji: '📖', title: 'Journal & Mood Data',
          body: 'Your journal entries and mood logs are stored in your browser\'s localStorage and are not sent to our servers unless you explicitly enable sync.',
        },
        {
          emoji: '🔐', title: 'Data Security',
          body: 'AI conversation transcripts are encrypted with AES-256. We use TLS 1.3 in transit. We will never sell your data to third parties.',
        },
        {
          emoji: '⚖️', title: 'Your Rights',
          body: 'You have the right to access, correct, delete, and export your personal data at any time. Contact privacy@mindtrack.ai to exercise your rights.',
        },
        {
          emoji: '👶', title: 'Children\'s Privacy',
          body: 'MindTrack AI is not intended for users under 13. We do not knowingly collect data from children.',
        },
        {
          emoji: '📩', title: 'Contact',
          body: 'For privacy questions: privacy@mindtrack.ai',
        },
      ].map((s) => (
        <div key={s.title} style={{ marginBottom: 20 }}>
          <h3 style={{
            fontSize: 14, fontWeight: 800, color: '#171c1f',
            margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>{s.emoji}</span> {s.title}
          </h3>
          <p style={{ fontSize: 13, color: '#41474f', lineHeight: 1.75, margin: 0 }}>
            {s.body}
          </p>
        </div>
      ))}
      {/* End sentinel for scroll detection */}
      <div style={{ height: 1 }} />
    </div>
  )
}

function TermsSummary(): React.ReactElement {
  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>
      {/* Big disclaimer at top */}
      <div style={{
        background: '#fef9ec', border: '1px solid #f5d87e',
        borderRadius: 12, padding: '14px 16px', marginBottom: 20,
      }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#7c5b12', margin: '0 0 4px' }}>
          ⚠️ Not a Medical Service
        </p>
        <p style={{ fontSize: 13, color: '#41474f', margin: 0, lineHeight: 1.65 }}>
          MindTrack AI is a <strong>wellness coaching tool</strong>. It does not provide clinical diagnosis, clinical treatment, or crisis intervention. In an emergency, call <strong>911</strong> or the Crisis Lifeline at <strong>988</strong>.
        </p>
      </div>

      {[
        {
          emoji: '📋', title: 'Acceptance of Terms',
          body: 'By clicking Accept, you agree to be bound by these Terms & Conditions. If you do not agree, you may not use the Service.',
        },
        {
          emoji: '🤖', title: 'AI-Generated Content',
          body: 'AI responses are generated by language models and may sometimes be inaccurate. They do not constitute professional advice. Always exercise your own judgment.',
        },
        {
          emoji: '🔞', title: 'Eligibility',
          body: 'You must be at least 13 years old. Users under 18 require parental or guardian consent.',
        },
        {
          emoji: '✅', title: 'Acceptable Use',
          body: 'You agree not to misuse the platform, attempt to manipulate the AI, share harmful content, or use automation tools to access the Service.',
        },
        {
          emoji: '🛡️', title: 'Limitation of Liability',
          body: 'MindTrack AI is not liable for any decisions made based on AI responses or wellness data. Our total liability is limited to amounts paid in the prior 3 months.',
        },
        {
          emoji: '🆘', title: 'Crisis Situations',
          body: 'If you are experiencing a crisis or thoughts of self-harm, contact 988 (Suicide & Crisis Lifeline), text HOME to 741741, or call 911 immediately. Do not rely on MindTrack AI in emergencies.',
        },
        {
          emoji: '🗑️', title: 'Account Deletion',
          body: 'You may request full deletion of your account and all associated data at any time by contacting support@mindtrack.ai.',
        },
      ].map((s) => (
        <div key={s.title} style={{ marginBottom: 20 }}>
          <h3 style={{
            fontSize: 14, fontWeight: 800, color: '#171c1f',
            margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>{s.emoji}</span> {s.title}
          </h3>
          <p style={{ fontSize: 13, color: '#41474f', lineHeight: 1.75, margin: 0 }}>
            {s.body}
          </p>
        </div>
      ))}
      {/* End sentinel */}
      <div style={{ height: 1 }} />
    </div>
  )
}

export default TermsConsentModal
