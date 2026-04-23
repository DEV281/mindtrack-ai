import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock } from 'lucide-react';

interface PrivacyPolicyProps {
  isOpen: boolean;
  onClose: () => void;
}

function PrivacyPolicy({ isOpen, onClose }: PrivacyPolicyProps): React.ReactElement | null {
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
                <Lock className="w-5 h-5 text-accent-violet" />
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Privacy Policy</h2>
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
                <h3 className="text-text-primary font-semibold mb-2">What Data We Collect</h3>
                <p>We collect the following information when you use MindTrack AI:</p>
                <ul style={{ listStyle: 'disc', paddingLeft: 20, marginTop: 8 }}>
                  <li>Account information (email, name, institution)</li>
                  <li>Session data (wellness scores, analysis results, consultation transcripts)</li>
                  <li>Usage data (session frequency, feature usage patterns)</li>
                  <li>Onboarding preferences (optional personal details you choose to share)</li>
                </ul>
              </section>

              <section style={{ marginBottom: 24 }}>
                <h3 className="text-text-primary font-semibold mb-2">How We Use Your Data</h3>
                <p>
                  Your data is used exclusively to provide and improve your wellness experience.
                  This includes generating personalized reports, tracking your wellness trends over time,
                  and providing AI-assisted consultation support. We never use your data for advertising
                  or marketing purposes.
                </p>
              </section>

              <section style={{ marginBottom: 24 }}>
                <h3 className="text-text-primary font-semibold mb-2">Camera & Microphone Data</h3>
                <p>
                  All camera and microphone data is processed <strong style={{ color: '#e8edf5' }}>locally on your device</strong>.
                  Raw video and audio streams are never transmitted to our servers. Only numerical analysis
                  results (e.g., stress scores, detected emotional states) are stored. You can revoke
                  camera and microphone permissions at any time through your browser settings.
                </p>
              </section>

              <section style={{ marginBottom: 24 }}>
                <h3 className="text-text-primary font-semibold mb-2">Location Data</h3>
                <p>
                  If you grant location permission, your coordinates are used solely on your device to
                  display local weather and personalize your experience. Location data is
                  <strong style={{ color: '#e8edf5' }}> never transmitted</strong> to our servers and is cached
                  locally on your device for a maximum of 30 minutes.
                </p>
              </section>

              <section style={{ marginBottom: 24 }}>
                <h3 className="text-text-primary font-semibold mb-2">Data Retention</h3>
                <p>
                  Session data is retained for 90 days by default. You can request deletion of your
                  data at any time through Settings &gt; Privacy &gt; Delete My Data. Upon account
                  deletion, all associated data is permanently removed within 30 days.
                </p>
              </section>

              <section style={{ marginBottom: 24 }}>
                <h3 className="text-text-primary font-semibold mb-2">Third Parties</h3>
                <p>
                  We do <strong style={{ color: '#e8edf5' }}>not sell, trade, or share</strong> your personal
                  data with any third parties. No data is shared with advertisers, data brokers, or
                  any external organizations. The only external services used are for weather data
                  (Open-Meteo, no personal data sent) and geocoding (Nominatim, coordinates only).
                </p>
              </section>

              <section style={{ marginBottom: 24 }}>
                <h3 className="text-text-primary font-semibold mb-2">Your Rights</h3>
                <p>You have the right to:</p>
                <ul style={{ listStyle: 'disc', paddingLeft: 20, marginTop: 8 }}>
                  <li><strong style={{ color: '#e8edf5' }}>Access</strong> — Request a copy of all data we hold about you</li>
                  <li><strong style={{ color: '#e8edf5' }}>Correction</strong> — Update or correct your personal information</li>
                  <li><strong style={{ color: '#e8edf5' }}>Deletion</strong> — Request permanent deletion of your account and data</li>
                  <li><strong style={{ color: '#e8edf5' }}>Portability</strong> — Export your data in a standard format</li>
                </ul>
              </section>

              <section style={{ marginBottom: 24 }}>
                <h3 className="text-text-primary font-semibold mb-2">Contact</h3>
                <p>
                  For privacy-related inquiries, contact us at:{' '}
                  <strong style={{ color: '#00e5a0' }}>privacy@mindtrack.ai</strong>
                </p>
              </section>

              <section>
                <h3 className="text-text-primary font-semibold mb-2">Compliance</h3>
                <p>
                  MindTrack AI is designed with GDPR and HIPAA compliance principles in mind.
                  We implement data minimization, purpose limitation, and storage limitation.
                  All data is encrypted at rest and in transit using AES-256 and TLS 1.3 respectively.
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t" style={{ borderColor: '#1e2d45' }}>
              <button onClick={onClose} className="btn-secondary py-2.5 px-6 text-sm">
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PrivacyPolicy;
