import { motion } from 'framer-motion';
import type { AnalysisReading } from '../../../store/sessionStore';

interface StressMetersProps {
  latestReading: AnalysisReading | null;
}

interface MeterConfig {
  label: string;
  key: keyof Pick<AnalysisReading, 'stress' | 'anxiety' | 'stability' | 'depression_risk' | 'confidence'>;
  emoji: string;
  color: string;
  bgColor: string;
  invert?: boolean;
}

const meters: MeterConfig[] = [
  { label: 'Your calm level', key: 'stress', emoji: '😌', color: '#52b788', bgColor: '#d8f3e8', invert: true },
  { label: 'Calmness', key: 'anxiety', emoji: '🧘', color: '#5b9bd5', bgColor: '#deeaf7', invert: true },
  { label: 'Inner balance', key: 'stability', emoji: '💙', color: '#52b788', bgColor: '#d8f3e8' },
  { label: 'Mood stability', key: 'depression_risk', emoji: '🌙', color: '#9d8fcc', bgColor: '#ebe8f7', invert: true },
  { label: 'Reading clarity', key: 'confidence', emoji: '✨', color: '#5b9bd5', bgColor: '#deeaf7' },
];

function getWordDesc(value: number, invert?: boolean): { word: string; color: string } {
  const effective = invert ? 100 - value : value;
  if (effective >= 70) return { word: 'Calm', color: '#52b788' };
  if (effective >= 45) return { word: 'A little tense', color: '#e8a838' };
  if (effective >= 25) return { word: 'Unsettled', color: '#e8a838' };
  return { word: 'Needs attention', color: '#9d8fcc' };
}

function getMeterColor(value: number, invert?: boolean): string {
  const effective = invert ? 100 - value : value;
  if (effective >= 70) return '#52b788';
  if (effective >= 45) return '#e8a838';
  return '#9d8fcc';
}

function StressMeters({ latestReading }: StressMetersProps): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ padding: 20 }}
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
        How you're feeling right now
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {meters.map((meter) => {
          const rawValue = latestReading ? latestReading[meter.key] : 0;
          const displayValue = typeof rawValue === 'number' ? rawValue : 0;
          const desc = getWordDesc(displayValue, meter.invert);
          const barValue = meter.invert ? Math.max(0, 100 - displayValue) : displayValue;
          const barColor = getMeterColor(displayValue, meter.invert);

          return (
            <div key={meter.label}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>{meter.emoji}</span>
                  {meter.label}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: desc.color,
                    fontFamily: 'Nunito, sans-serif',
                  }}
                >
                  {desc.word}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: 'var(--bg-sunken)',
                }}
              >
                <motion.div
                  style={{
                    height: '100%',
                    borderRadius: 4,
                    backgroundColor: barColor,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(barValue, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default StressMeters;
