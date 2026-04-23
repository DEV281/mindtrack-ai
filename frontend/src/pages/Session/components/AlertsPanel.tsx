import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import type { AnalysisReading } from '../../../store/sessionStore';

interface AlertsPanelProps {
  latestReading: AnalysisReading | null;
}

function AlertsPanel({ latestReading }: AlertsPanelProps): React.ReactElement {
  const risk = latestReading?.overall_risk ?? 0;

  // Generate gentle nudges
  const nudges: Array<{ text: string; color: string; bgColor: string }> = [];

  if (risk > 80) {
    nudges.push({
      text: "Let's take a moment together — try a deep breath 💙",
      color: '#9d8fcc',
      bgColor: 'rgba(157,143,204,0.1)',
    });
  }
  if (latestReading && latestReading.depression_risk > 70) {
    nudges.push({
      text: 'You might benefit from a wellness check-in 🌱',
      color: '#9d8fcc',
      bgColor: 'rgba(157,143,204,0.1)',
    });
  }
  if (latestReading && latestReading.anxiety > 60) {
    nudges.push({
      text: 'Your body might need some calm right now 🧘',
      color: '#e8a838',
      bgColor: 'rgba(232,168,56,0.1)',
    });
  }
  if (latestReading && latestReading.stress > 50 && nudges.length === 0) {
    nudges.push({
      text: "It's okay to pause — you're doing well 🌿",
      color: '#52b788',
      bgColor: 'rgba(82,183,136,0.1)',
    });
  }

  const displayNudges = nudges.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ padding: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Heart style={{ width: 16, height: 16, color: '#d4829a' }} />
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Gentle nudges</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AnimatePresence mode="popLayout">
          {displayNudges.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
              Everything looks good right now 😊
            </p>
          ) : (
            displayNudges.map((nudge, i) => (
              <motion.div
                key={`${nudge.text}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: 12,
                  borderRadius: 14,
                  fontSize: 13,
                  background: nudge.bgColor,
                  color: nudge.color,
                  fontWeight: 500,
                }}
              >
                <span>{nudge.text}</span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default AlertsPanel;
