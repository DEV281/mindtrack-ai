import { useNavigate } from 'react-router-dom'

function PrivacyPolicy(): React.ReactElement {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'Nunito, sans-serif' }}>
      {/* Sticky Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)', padding: '14px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>💙</span>
          <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>MindTrack</span>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'var(--primary-light)', border: 'none', borderRadius: 50,
            padding: '8px 20px', fontSize: 13, fontWeight: 700, color: 'var(--primary)',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      </header>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 40 }}>
          Last updated: April 15, 2026
        </p>

        {([
          {
            id: 'intro', title: '1. Introduction',
            content: `MindTrack AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mental wellness platform, including our website, mobile applications, and related services (collectively, the "Service"). Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.`,
          },
          {
            id: 'collect', title: '2. Information We Collect',
            content: `We collect information you provide directly, including: account registration information (name, email), wellness journal entries and mood logs, conversation transcripts from AI sessions (end-to-end stored encrypted), and profile preferences. We also collect technical data automatically: device type and browser, IP address for security, usage patterns and sessions (anonymized), and error logs. We do NOT collect or store biometric video or audio recordings. All camera and microphone data is processed locally in your browser — only numerical scores (e.g., stress level 0–100) are transmitted.`,
          },
          {
            id: 'use', title: '3. How We Use Your Information',
            content: `We use your information to: provide, maintain, and improve the Service; personalize your wellness experience; generate insights and reports about your mental health trends; authenticate your identity and ensure security; send you important service communications; fulfill our legal obligations; and conduct research to advance mental health support technology. We will never sell your personal data to third parties. We do not use your data for advertising purposes.`,
          },
          {
            id: 'camera', title: '4. Camera & Microphone Data',
            content: `MindTrack AI uses your device's camera and microphone during AI consultation sessions to analyze facial expressions and voice energy levels to provide empathetic, context-aware responses. IMPORTANT: All camera and microphone processing occurs entirely on your device using WebAssembly and browser APIs. No video or audio is ever transmitted to our servers. Only derived numerical metrics (e.g., stress indicator: 42/100) are sent. You may use the Service without granting camera or microphone access. You may revoke access at any time through your browser settings.`,
          },
          {
            id: 'storage', title: '5. Data Storage & Security',
            content: `Journal entries and mood logs are stored in your browser's localStorage and are not transmitted to our servers unless you explicitly choose to sync. AI conversation transcripts are stored encrypted using AES-256 and associated with your account for the "Past Conversations" feature. We employ industry-standard security measures including TLS 1.3 in transit, AES-256 at rest, regular security audits, and access controls. No security system is impenetrable. We will notify you of any breach within 72 hours as required by law.`,
          },
          {
            id: 'rights', title: '6. Your Rights',
            content: `Depending on your location, you may have rights under GDPR, CCPA, or similar laws, including: the right to access your personal data, the right to correct inaccurate data, the right to delete your account and all associated data, the right to data portability, the right to withdraw consent, and the right to lodge a complaint with a supervisory authority. To exercise any of these rights, contact us at privacy@mindtrack.ai. We will respond within 30 days.`,
          },
          {
            id: 'children', title: '7. Children\'s Privacy',
            content: `MindTrack AI is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal information, we will promptly delete it. If you are a parent or guardian and believe we may have collected information from a child under 13, please contact us immediately.`,
          },
          {
            id: 'changes', title: '8. Changes to This Policy',
            content: `We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date and notify you via email or prominent notice in the Service. Continued use of the Service after changes constitutes acceptance of the updated policy.`,
          },
          {
            id: 'contact', title: '9. Contact Us',
            content: `If you have questions or concerns about this Privacy Policy, please contact us at: privacy@mindtrack.ai or write to MindTrack AI Privacy Team, c/o MindTrack Inc. We take every inquiry seriously and will respond promptly.`,
          },
        ]).map((section) => (
          <section key={section.id} id={section.id} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
              {section.title}
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.85, whiteSpace: 'pre-line' }}>
              {section.content}
            </p>
          </section>
        ))}

        <div style={{
          marginTop: 48, padding: '24px 28px',
          background: 'var(--primary-light)', borderRadius: 18,
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>Your Mental Health, Your Data</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7 }}>
            MindTrack AI is built on a foundation of trust. Your wellness data is yours — always.
            We&apos;ll never share it without your explicit consent.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
