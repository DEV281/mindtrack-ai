import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps): React.ReactElement | null {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl max-h-[85vh] rounded-2xl flex flex-col relative"
            style={{ background: '#0d1a2d', border: '1px solid #1e2d45' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#1e2d45' }}>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-accent-green" />
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Terms & Conditions</h2>
                  <p className="text-xs text-text-muted">Last updated: {currentDate}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5" style={{ fontSize: 14, lineHeight: 1.8, color: '#8a94a6' }}>
              <section style={{ marginBottom: 24 }}>
                <h3 className="text-text-primary font-semibold mb-2">1. PURPOSE & DISCLAIMER</h3>
                <p>
                  MindTrack AI is a wellness support tool and is <strong style={{ color: '#e8edf5' }}>NOT</strong> a substitute for
                  professional medical diagnosis, treatment, or clinical care. Always consult a qualified mental health
                  professional for medical advice. The analysis provided by MindTrack AI is for informational and
                  self-awareness purposes only.
                </p>
              </section>

              <section style={{ marginBottom: 24 }}>
                <h3 className="text-text-primary font-semibold mb-2">2. DATA COLLECTION</h3>
                <p>
                  We collect: email address, session data, wellness analysis results, and consultation transcripts.
                  Camera and microphone data is processed <strong style={{ color: '#e8edf5' }}>locally on your device</strong> and
                  is NOT transmitted or stored on our servers. Only the analysis results (numerical scores and
                  detected emotional states) are stored.
                </p>
              </section>

              <section style={{ marginBottom: 24 }}>
                <h3 className="text-text-primary font-semibold mb-2">3. DATA STORAGE & SECURITY</h3>
                <p>
                  Session results are encrypted and stored securely using industry-standard encryption protocols.
                  You may request deletion of your data at any time via Settings &gt; Privacy &gt; Delete My Data.
                  Upon deletion, all your session data, reports, and consultation history will be permanently removed
                  within 30 days.
                </p>
              </section>

              <section style={{ marginBottom: 24 }}>
                <h3 className="text-text-primary font-semibold mb-2">4. CRISIS SITUATIONS</h3>
                <p style={{ marginBottom: 8 }}>
                  If you are in crisis or experiencing a mental health emergency, please contact:
                </p>
                <ul style={{ listStyle: 'disc', paddingLeft: 20 }}>
                  <li>National Suicide Prevention Lifeline: <strong style={{ color: '#e8edf5' }}>988</strong></li>
                  <li>Crisis Text Line: Text <strong style={{ color: '#e8edf5' }}>HOME to 741741</strong></li>
                  <li>Emergency services: <strong style={{ color: '#e8edf5' }}>911</strong></li>
                </ul>
                <p style={{ marginTop: 8 }}>
                  MindTrack AI is not an emergency service and cannot provide crisis intervention.
                </p>
              </section>

              <section style={{ marginBottom: 24 }}>
                <h3 className="text-text-primary font-semibold mb-2">5. USER RESPONSIBILITIES</h3>
                <p>
                  You must be 18 years or older to use this platform. You agree not to misuse the platform or
                  provide false information. You are responsible for maintaining the confidentiality of your
                  account credentials. Any activity under your account is your responsibility.
                </p>
              </section>

              <section>
                <h3 className="text-text-primary font-semibold mb-2">6. CHANGES TO TERMS</h3>
                <p>
                  We may update these terms from time to time. Continued use of MindTrack AI after changes
                  constitutes acceptance of the updated terms. We will notify users of significant changes
                  via email or in-app notification.
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#1e2d45' }}>
              {onAccept && (
                <button
                  onClick={() => { onAccept(); onClose(); }}
                  className="btn-primary py-2.5 px-6 text-sm"
                >
                  I Accept
                </button>
              )}
              <button
                onClick={onClose}
                className="btn-secondary py-2.5 px-6 text-sm"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TermsModal;
