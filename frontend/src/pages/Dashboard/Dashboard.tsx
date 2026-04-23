import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import WellnessScore from './components/WellnessScore';
import ComparisonCards from './components/ComparisonCards';
import TrendChart from './components/TrendChart';
import ModelComparison from './components/ModelComparison';
import { useLocation, getLocationPref } from '../../hooks/useLocation';
import LocationPermissionModal from '../../components/LocationPermissionModal';
import useAuthStore from '../../store/authStore';
import api from '../../api/client';
import DailyAffirmation from '../../components/DailyAffirmation';
import WellnessTip from '../../components/WellnessTip';
import './Dashboard.css';

interface RecentSession {
  id: string;
  date: string;
  duration: string;
  avgStress: number;
  risk: string;
  model: string;
  readings: number;
}

const AFFIRMATIONS = [
  'You are doing better than you think.',
  'Small steps forward are still steps forward.',
  'It is okay to rest. It is okay to heal.',
  'Your feelings are valid.',
  'You have survived every difficult day so far.',
  'Progress, not perfection.',
  'Be gentle with yourself today.',
];

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Good morning', emoji: '🌤' };
  if (hour >= 12 && hour < 17) return { text: 'Good afternoon', emoji: '☀️' };
  if (hour >= 17 && hour < 21) return { text: 'Good evening', emoji: '🌇' };
  return { text: 'Good night', emoji: '🌙' };
}

function getDayDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getDailyAffirmation(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length];
}

function getMoodFromStress(stress: number): { emoji: string; label: string; className: string } {
  if (stress < 30) return { emoji: '😌', label: 'Calm', className: 'mood-calm' };
  if (stress < 50) return { emoji: '😐', label: 'Neutral', className: 'mood-neutral' };
  if (stress < 70) return { emoji: '😟', label: 'A little tense', className: 'mood-tense' };
  return { emoji: '😔', label: 'Heavy', className: 'mood-heavy' };
}

function Dashboard(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [comparisonCards, setComparisonCards] = useState<{ emoji: string; title: string; detail: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [wellnessScore, setWellnessScore] = useState(72);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const navigate = useNavigate();

  const { city, country, weather, requestPermission } = useLocation();

  const greeting = getGreeting();
  const affirmation = getDailyAffirmation();
  const displayName = user?.name?.split(' ')[0] || 'there';

  useEffect(() => {
    const pref = getLocationPref();
    if (pref === null) {
      const timer = setTimeout(() => setShowLocationModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsRes, statsRes, comparisonRes] = await Promise.all([
          api.get('/stats/recent-sessions').catch(() => ({ data: { sessions: [] } })),
          api.get('/stats').catch(() => ({ data: {} })),
          api.get('/stats/comparison').catch(() => ({ data: { cards: [] } })),
        ]);
        setRecentSessions(sessionsRes.data.sessions || []);
        setComparisonCards(comparisonRes.data.cards || []);
        const avgRisk = statsRes.data?.avg_risk_score || 0;
        setWellnessScore(Math.max(0, Math.round(100 - avgRisk)));
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const quickActions = [
    { emoji: '🧘', label: 'Start Session', path: '/session' },
    { emoji: '💬', label: 'Talk to AI', path: '/consultation' },
    { emoji: '🎵', label: 'Music & Games', path: '/activities' },
    { emoji: '📊', label: 'Journey', path: '/reports' },
  ];

  return (
    <div className="dashboard-calm" style={{ padding: '24px 32px', minHeight: '100vh' }}>
      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onAllow={() => {
          setShowLocationModal(false);
          requestPermission();
        }}
        onDismiss={() => setShowLocationModal(false)}
      />

      {/* Greeting Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="db-greeting"
        style={{ marginBottom: 24 }}
      >
        <h1>
          {greeting.emoji} {greeting.text}, {displayName}
        </h1>
        <p className="affirmation">"{affirmation}"</p>
        <div className="meta">
          <span>Today: {getDayDate()}</span>
          {city && weather && (
            <span>
              📍 {city}{country ? `, ${country}` : ''} {weather.emoji} {weather.temp}°C {weather.condition}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/session')}
          style={{
            marginTop: 16,
            background: 'linear-gradient(135deg, #5b9bd5, #7ab4e8)',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 28px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(91,155,213,0.3)',
            fontFamily: 'Nunito, sans-serif',
          }}
        >
          Start Today's Session →
        </button>
        {/* Daily Affirmation */}
        <DailyAffirmation />

      </motion.div>

      {/* Today's Mental Weather */}
      {recentSessions.length > 0 && (() => {
        const avgS = Math.round(recentSessions.reduce((s, r) => s + r.avgStress, 0) / recentSessions.length);
        const w = avgS < 20 ? { emoji: '☀️', label: 'Calm', bg: 'var(--green-light)', color: '#1a8f5c' }
          : avgS < 40 ? { emoji: '⛅', label: 'Mild', bg: '#e8f5e9', color: '#388e3c' }
          : avgS < 60 ? { emoji: '☁️', label: 'Moderate', bg: 'var(--amber-light)', color: '#b97a1e' }
          : avgS < 80 ? { emoji: '🌧️', label: 'Stormy', bg: 'var(--rose-light)', color: '#c0392b' }
          : { emoji: '⛈️', label: 'Critical', bg: '#fde2e2', color: '#e74c3c' };
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              background: w.bg,
              borderRadius: 20,
              padding: '20px 28px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <span style={{ fontSize: 36 }}>{w.emoji}</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>Today&apos;s Mental Weather</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: w.color, margin: 0 }}>
                {w.label} <span style={{ fontSize: 14, fontWeight: 600 }}>{avgS}/100</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>↑ vs yesterday</span>
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{recentSessions.length} sessions today</p>
            </div>
          </motion.div>
        );
      })()}

      {/* Wellness Score + Comparison Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, marginBottom: 24, alignItems: 'start' }}>
        <WellnessScore score={wellnessScore} loading={loading} />
        <div>
          <ComparisonCards cards={comparisonCards} />
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}
      >
        {quickActions.map((action, i) => (
          <motion.button
            key={action.path}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.04 }}
            onClick={() => navigate(action.path)}
            className="db-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: 20,
              cursor: 'pointer',
              border: '1px solid var(--border)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
            whileTap={{ scale: 0.97 }}
          >
            <span style={{ fontSize: '2rem' }}>{action.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{action.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Trend Chart + Emotion Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <TrendChart />
        <div className="db-card" style={{ overflow: 'hidden' }}>
          <ModelComparison />
        </div>
      </div>

      {/* Recent Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="db-card"
      >
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>
          My Recent Sessions
        </h2>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 44, background: 'var(--bg-raised)', borderRadius: 8 }} />
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2.5rem', marginBottom: 12 }}>🌱</span>
            <p style={{ fontSize: 14 }}>Nothing here yet — but every journey starts somewhere</p>
            <p style={{ fontSize: 12, marginTop: 4, marginBottom: 16, color: 'var(--text-hint)' }}>Start a session to see your history</p>
            <button
              onClick={() => navigate('/consultation')}
              style={{
                background: 'linear-gradient(135deg, #5b9bd5, #7ab4e8)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50px',
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
              }}
            >
              Start a Conversation
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="calm-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time together</th>
                  <th>How I Felt</th>
                  <th>Messages</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session, i) => {
                  const mood = getMoodFromStress(session.avgStress);
                  return (
                    <motion.tr
                      key={session.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                    >
                      <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8rem' }}>
                        {session.date}
                      </td>
                      <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8rem' }}>
                        {session.duration}
                      </td>
                      <td>
                        <span className={`mood-badge ${mood.className}`}>
                          {mood.emoji} {mood.label}
                        </span>
                      </td>
                      <td style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8rem' }}>
                        {session.readings}
                      </td>
                      <td>
                        <button
                          onClick={() => navigate('/consultation/history')}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: '50px',
                            padding: '4px 14px',
                            fontSize: '0.75rem',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontFamily: 'Nunito, sans-serif',
                          }}
                        >
                          View
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
      {/* Wellness Tip */}
      <WellnessTip />
    </div>
  );
}

export default Dashboard;
