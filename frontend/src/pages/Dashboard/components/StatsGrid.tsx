import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, AlertTriangle, Brain, TrendingUp, Clock } from 'lucide-react';
import api from '../../../api/client';

interface StatsData {
  total_sessions: number;
  total_readings: number;
  avg_risk_score: number;
  high_risk_sessions: number;
  total_consultations: number;
  model_accuracy: number;
  active_users: number;
  avg_duration: string;
}

interface StatItem {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

function StatsGrid(): React.ReactElement {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/stats');
        setStats(data);
      } catch {
        // Use fallback zeros
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statItems: StatItem[] = [
    {
      label: 'Total Sessions',
      value: stats ? String(stats.total_sessions) : '—',
      change: stats?.total_consultations ? `${stats.total_consultations} consultations` : 'No sessions yet',
      changeType: stats?.total_sessions ? 'positive' : 'neutral',
      icon: <Activity className="w-5 h-5" />,
      color: 'from-accent-green/20 to-accent-green/5',
    },
    {
      label: 'Wellness Score',
      value: stats ? `${Math.max(0, 100 - (stats.avg_risk_score || 0))}%` : '—',
      change: stats?.avg_risk_score
        ? (stats.avg_risk_score < 40 ? 'Feeling great!' : stats.avg_risk_score < 70 ? 'Room to grow' : 'Focus on self-care')
        : 'No data yet',
      changeType: stats?.avg_risk_score ? (stats.avg_risk_score < 40 ? 'positive' : 'neutral') : 'neutral',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'from-accent-cyan/20 to-accent-cyan/5',
    },
    {
      label: 'Sessions Needing Care',
      value: stats ? String(stats.high_risk_sessions) : '—',
      change: stats?.high_risk_sessions ? `${stats.high_risk_sessions} need attention` : 'All clear ✨',
      changeType: stats?.high_risk_sessions ? 'neutral' : 'positive',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'from-accent-amber/20 to-accent-amber/5',
    },
    {
      label: 'Model Accuracy',
      value: stats ? `${stats.model_accuracy}%` : '79.5%',
      change: 'ViT + CNN + Mamba',
      changeType: 'neutral',
      icon: <Brain className="w-5 h-5" />,
      color: 'from-accent-violet/20 to-accent-violet/5',
    },
    {
      label: 'Consultations',
      value: stats ? String(stats.total_consultations) : '—',
      change: stats?.total_consultations ? 'AI-assisted sessions' : 'Start your first session',
      changeType: stats?.total_consultations ? 'positive' : 'neutral',
      icon: <Users className="w-5 h-5" />,
      color: 'from-accent-amber/20 to-accent-amber/5',
    },
    {
      label: 'Avg Duration',
      value: stats?.avg_duration || '—',
      change: 'Per session',
      changeType: 'neutral',
      icon: <Clock className="w-5 h-5" />,
      color: 'from-accent-orange/20 to-accent-orange/5',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="glass-card-hover p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-secondary text-sm font-medium">{stat.label}</p>
              {loading ? (
                <div className="h-8 w-16 bg-bg-secondary/50 rounded animate-pulse mt-1.5" />
              ) : (
                <p className="stat-value mt-1.5 text-text-primary">{stat.value}</p>
              )}
              <p
                className={`text-xs mt-1.5 ${
                  stat.changeType === 'positive'
                    ? 'text-accent-green'
                    : stat.changeType === 'negative'
                      ? 'text-accent-amber'
                      : 'text-text-muted'
                }`}
              >
                {stat.change}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-text-primary`}
            >
              {stat.icon}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default StatsGrid;
