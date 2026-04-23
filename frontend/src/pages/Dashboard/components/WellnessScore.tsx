import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface WellnessScoreProps {
  score: number;
  loading?: boolean;
}

function getScoreMessage(score: number): { message: string; color: string } {
  if (score >= 90) return { message: "You're doing wonderfully today! 🌟", color: '#52b788' };
  if (score >= 75) return { message: "You're in a good place today 😊", color: '#52b788' };
  if (score >= 60) return { message: 'Doing okay — keep going 🌱', color: '#5b9bd5' };
  if (score >= 45) return { message: "A little tension today — that's okay 💙", color: '#5b9bd5' };
  if (score >= 30) return { message: 'Today feels heavy — be gentle with yourself 🫂', color: '#9d8fcc' };
  return { message: 'Difficult day — support is here for you 💜', color: '#9d8fcc' };
}

function WellnessScore({ score, loading }: WellnessScoreProps): React.ReactElement {
  const [displayScore, setDisplayScore] = useState(0);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    if (loading) return;
    const duration = 1500;
    const startTime = performance.now();
    const startVal = 0;
    const endVal = score;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(startVal + (endVal - startVal) * eased));

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [score, loading]);

  const { message, color } = getScoreMessage(score);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="db-card"
      style={{ textAlign: 'center', padding: '32px' }}
    >
      <h2 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '24px', fontWeight: 700 }}>
        Your Wellness Today
      </h2>

      {loading ? (
        <div style={{ width: 180, height: 180, margin: '0 auto', borderRadius: '50%', background: 'var(--bg-sunken)' }} />
      ) : (
        <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto' }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle
              cx="90"
              cy="90"
              r={radius}
              className="wellness-circle-bg"
            />
            <circle
              cx="90"
              cy="90"
              r={radius}
              className="wellness-circle-fill"
              style={{
                stroke: color,
                strokeDasharray: circumference,
                strokeDashoffset,
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
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
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '2rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              {displayScore}
            </span>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
              }}
            >
              {' '}/ 100
            </span>
          </div>
        </div>
      )}

      <p
        style={{
          marginTop: '16px',
          fontSize: '0.95rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>
    </motion.div>
  );
}

export default WellnessScore;
