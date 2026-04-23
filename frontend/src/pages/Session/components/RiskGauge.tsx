import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { AnalysisReading } from '../../../store/sessionStore';

interface RiskGaugeProps {
  latestReading: AnalysisReading | null;
}

function RiskGauge({ latestReading }: RiskGaugeProps): React.ReactElement {
  const risk = latestReading?.overall_risk ?? 0;
  const wellness = Math.max(0, 100 - risk);

  const [displayVal, setDisplayVal] = useState(0);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();
    const startVal = displayVal;
    const endVal = wellness;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayVal(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [wellness]);

  const getLevel = (w: number): { label: string; emoji: string; color: string } => {
    if (w >= 70) return { label: 'Feeling good', emoji: '😌', color: '#52b788' };
    if (w >= 40) return { label: 'A little tense', emoji: '🌿', color: '#e8a838' };
    return { label: "Let's check in", emoji: '💙', color: '#9d8fcc' };
  };

  const level = getLevel(wellness);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayVal / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ padding: 20 }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
        How you're feeling
      </h3>

      {/* Full circle gauge */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: 160, height: 160 }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--bg-sunken)"
              strokeWidth="10"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={level.color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                transition: 'stroke-dashoffset 1.2s ease',
              }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{level.emoji}</span>
          </div>
        </div>
      </div>

      {/* Message below */}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: level.color }}>
          {level.label}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {wellness >= 70
            ? "You're doing great — keep it up 🌟"
            : wellness >= 40
              ? "It's okay to take a moment for yourself"
              : "Remember, we're here with you 💙"}
        </p>
      </div>
    </motion.div>
  );
}

export default RiskGauge;
