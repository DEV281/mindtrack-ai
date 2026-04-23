import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import api from '../../../api/client';
import { TrendingUp } from 'lucide-react';

interface TrendPoint {
  session: string;
  wellness: number;
}

function getMoodLabel(score: number): string {
  if (score >= 75) return 'calm';
  if (score >= 50) return 'neutral';
  if (score >= 30) return 'a little tense';
  return 'heavy';
}

function TrendChart(): React.ReactElement {
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const { data } = await api.get('/stats/trend-data');
        const raw = data.trend || [];
        const mapped: TrendPoint[] = raw.map((t: { session: string; stress: number; stability: number }) => ({
          session: t.session,
          wellness: Math.round(t.stability || Math.max(0, 100 - (t.stress || 0))),
        }));
        setTrendData(mapped);
      } catch {
        // leave empty
      } finally {
        setLoading(false);
      }
    };
    fetchTrend();
  }, []);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    const value = payload[0].value;
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #dde7ef',
          borderRadius: 14,
          padding: '10px 14px',
          fontSize: 12,
          color: '#2c3e50',
          boxShadow: '0 4px 12px rgba(91,155,213,0.1)',
          fontFamily: 'Nunito, sans-serif',
        }}
      >
        <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
        <p>You felt <strong>{getMoodLabel(value)}</strong></p>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="db-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700 }}>
          Your Journey Today
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#52b788' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Wellness</span>
        </div>
      </div>

      <div style={{ height: 260 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ height: 32, width: 120, background: 'var(--bg-sunken)', borderRadius: 8 }} />
          </div>
        ) : trendData.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2rem', marginBottom: 12 }}>📈</span>
            <p style={{ fontSize: 14 }}>No session data yet</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Complete a session to see your journey</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="wellnessGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#52b788" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#52b788" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dde7ef" />
              <XAxis
                dataKey="session"
                tick={{ fill: '#8fa8b8', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#dde7ef' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#8fa8b8', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#dde7ef' }}
                label={{
                  value: 'Wellness',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: '#8fa8b8', fontSize: 11 },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="wellness"
                stroke="#52b788"
                fill="url(#wellnessGrad)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#52b788', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}

export default TrendChart;
