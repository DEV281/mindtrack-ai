import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Heart, Clock, Calendar, TrendingUp, Sparkles, CheckCircle, Shield } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import api from '../../api/client';

const EMOTION_COLORS: Record<string, string> = {
  neutral: '#8a94a6',
  happy: '#52b788',
  tense: '#e9c46a',
  anxious: '#f4a261',
  sad: '#6fb3d2',
  fear: '#b77eb5',
  surprised: '#9d8fcc',
};

const EMOTION_LABELS: Record<string, string> = {
  neutral: 'Calm',
  happy: 'Happy',
  tense: 'Tense',
  anxious: 'Worried',
  sad: 'Low',
  fear: 'Uneasy',
  surprised: 'Surprised',
};

interface TimelinePoint {
  seconds_elapsed: number;
  stress: number;
  anxiety: number;
  stability: number;
  depression_risk: number;
  overall_risk: number;
  emotions: Record<string, number>;
}

interface AlertItem {
  seconds_elapsed: number;
  severity: string;
  text: string;
}

interface AssessmentData {
  mood_score: number;
  worry_score: number;
  mood_level: string;
  worry_level: string;
  q9_flagged: boolean;
  q17_flagged: boolean;
  questions_and_answers: Array<{
    index: number;
    question: string;
    answer_value: number | null;
    answer_label: string | null;
  }>;
}

interface SummaryData {
  text: string;
  observations: string[];
  recommendations: string[];
}

interface ReportData {
  session_id: string;
  source: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  model_mode: { emoji: string; label: string };
  avg_risk: number;
  peak_risk: number;
  avg_wellness: number;
  mood_emoji: string;
  mood_label: string;
  total_readings: number;
  timeline: TimelinePoint[];
  emotion_summary: Record<string, number>;
  alerts: AlertItem[];
  assessment: AssessmentData | null;
  summary: SummaryData | null;
}

function wellnessColor(w: number): string {
  if (w >= 70) return '#52b788';
  if (w >= 50) return '#e9c46a';
  return '#b77eb5';
}

function ReportDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/reports/${id}`);
      setReport(data);

      // Auto-generate summary if not present
      if (!data.summary) {
        try {
          const genRes = await api.post(`/reports/${id}/generate`);
          setReport((prev: ReportData | null) =>
            prev
              ? {
                  ...prev,
                  summary: {
                    text: genRes.data.text,
                    observations: genRes.data.key_observations,
                    recommendations: genRes.data.recommendations,
                  },
                }
              : prev
          );
        } catch {
          // Summary generation failed — non-critical
        }
      }
    } catch {
      setError('Report not found or could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchReport();
  }, [id]);

  const handleGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const { data } = await api.post(`/reports/${id}/generate`);
      setReport((prev) => prev ? { ...prev, summary: { text: data.text, observations: data.key_observations, recommendations: data.recommendations } } : prev);
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!id) return;
    try {
      const response = await api.get(`/reports/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindtrack-report-${id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: jsPDF client-side
      if (!report) return;
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('MindTrack — Wellness Report', 20, 25);
      doc.setFontSize(10);
      const date = report.started_at ? new Date(report.started_at).toLocaleString() : 'N/A';
      doc.text(`Date: ${date}`, 20, 38);
      doc.text(`Wellness: ${report.avg_wellness.toFixed(0)}%`, 20, 46);
      doc.text(`Mood: ${report.mood_emoji} ${report.mood_label}`, 20, 54);
      let y = 68;
      if (report.summary) {
        doc.setFontSize(12);
        doc.text('Your Session Reflection', 20, y);
        y += 10;
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(report.summary.text, 170);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 10;
        for (const obs of report.summary.observations) {
          const ol = doc.splitTextToSize(`✦ ${obs}`, 170);
          doc.text(ol, 20, y);
          y += ol.length * 5 + 3;
          if (y > 270) { doc.addPage(); y = 20; }
        }
        y += 5;
        doc.setFontSize(12);
        doc.text('Next Steps', 20, y);
        y += 10;
        doc.setFontSize(9);
        for (const rec of report.summary.recommendations) {
          const rl = doc.splitTextToSize(`→ ${rec}`, 170);
          doc.text(rl, 20, y);
          y += rl.length * 5 + 3;
          if (y > 270) { doc.addPage(); y = 20; }
        }
      }
      doc.save(`mindtrack-report-${id.slice(0, 8)}.pdf`);
    }
  };

  // Build chart data
  const timelineData = (report?.timeline || []).map((t) => ({
    time: `${Math.floor(t.seconds_elapsed / 60)}:${String(t.seconds_elapsed % 60).padStart(2, '0')}`,
    calmness: Math.max(0, Math.round(100 - t.stress)),
    wellness: Math.max(0, Math.round(t.stability)),
    stress: Math.round(t.stress),
  }));

  const emotionBreakdown = Object.entries(report?.emotion_summary || {})
    .map(([emotion, value]) => ({
      emotion: EMOTION_LABELS[emotion.toLowerCase()] || emotion.charAt(0).toUpperCase() + emotion.slice(1),
      value: Math.round(value as number),
      color: EMOTION_COLORS[emotion.toLowerCase()] || '#8a94a6',
    }))
    .sort((a, b) => b.value - a.value);

  const pieData = emotionBreakdown.map((e) => ({
    name: e.emotion,
    value: e.value,
    fill: e.color,
  }));

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/reports" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </Link>
          <div className="flex-1">
            <div className="h-8 w-64 bg-bg-secondary/50 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 h-24 animate-pulse" style={{ background: 'var(--bg-secondary)', opacity: 0.3 }} />
          ))}
        </div>
        <div className="glass-card p-6 h-72 animate-pulse" style={{ background: 'var(--bg-secondary)', opacity: 0.2 }} />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="page-container">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/reports" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </Link>
          <h1 className="page-title">Report Not Found</h1>
        </div>
        <div className="glass-card p-16 text-center">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <p className="text-text-secondary mb-4">{error || 'This report could not be loaded.'}</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={fetchReport} className="btn-secondary inline-flex">
              Try Again
            </button>
            <Link to="/reports" className="btn-primary inline-flex">← Back to Reports</Link>
          </div>
        </div>
      </div>
    );
  }

  const date = report.started_at ? new Date(report.started_at) : null;
  const durMin = Math.floor((report.duration_seconds || 0) / 60);
  const durSec = (report.duration_seconds || 0) % 60;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/reports" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '1.8rem' }}>{report.mood_emoji}</span>
            <div>
              <h1 className="page-title">Session Report — {report.mood_label}</h1>
              <p className="text-text-secondary text-sm mt-0.5">
                {date ? date.toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!report.summary && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-secondary text-sm"
            >
              <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generating...' : 'Generate Summary'}
            </button>
          )}
          <button onClick={handleExportPdf} className="btn-secondary text-sm">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* 3 Quick Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Wellness Score',
            value: `${report.avg_wellness.toFixed(0)}%`,
            icon: Heart,
            color: wellnessColor(report.avg_wellness),
            sub: report.mood_label,
          },
          {
            label: 'Duration',
            value: durMin > 0 ? `${durMin}m ${durSec}s` : `${durSec}s`,
            icon: Clock,
            color: '#6fb3d2',
            sub: `${report.total_readings} readings`,
          },
          {
            label: 'Mode',
            value: `${report.model_mode?.emoji || ''} ${report.model_mode?.label || ''}`,
            icon: TrendingUp,
            color: '#9d8fcc',
            sub: report.assessment ? 'Check-in completed' : 'Free conversation',
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-xs text-text-muted">{stat.label}</span>
              </div>
              <p className="font-mono text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-text-secondary mt-1">{stat.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* 2-col grid: Journey chart + Emotions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Journey Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 xl:col-span-2"
        >
          <h2 className="section-title mb-4">Your Journey</h2>
          <div className="h-64">
            {timelineData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">
                No timeline data available for this session
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="calmnessGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#52b788" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#52b788" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="wellnessGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6fb3d2" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6fb3d2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="calmness"
                    name="Calmness"
                    stroke="#52b788"
                    fill="url(#calmnessGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="wellness"
                    name="Stability"
                    stroke="#6fb3d2"
                    fill="url(#wellnessGrad)"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Emotion Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="section-title mb-4">How You Felt</h2>
          {emotionBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-text-muted text-sm">
              No emotion data available
            </div>
          ) : (
            <>
              <div className="h-36 mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {emotionBreakdown.slice(0, 5).map((e) => (
                  <div key={e.emotion} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                      <span className="text-text-secondary">{e.emotion}</span>
                    </div>
                    <span className="font-mono text-text-primary font-medium">{e.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Summary section + Check-in + Gentle nudges */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Session Reflection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          {report.summary ? (
            <>
              <h2 className="section-title mb-3">Your Session Reflection</h2>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">{report.summary.text}</p>

              {report.summary.observations.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-2">✦ Key Observations</h3>
                  <div className="space-y-2">
                    {report.summary.observations.map((obs, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                        <span className="text-accent-green mt-0.5">•</span>
                        <span>{obs}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.summary.recommendations.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-text-primary mb-2">→ Next Steps</h3>
                  <div className="space-y-2">
                    {report.summary.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#52b788' }} />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-text-muted opacity-30" />
              <p className="text-text-secondary text-sm mb-4">Summary not yet generated</p>
              <button onClick={handleGenerate} disabled={generating} className="btn-primary text-sm">
                {generating ? 'Generating...' : 'Generate Summary'}
              </button>
            </div>
          )}
        </motion.div>

        {/* Right column: Assessment + Alerts */}
        <div className="space-y-6">
          {/* Wellness Check-in */}
          {report.assessment && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card p-6"
            >
              <h2 className="section-title mb-3">Wellness Check-in</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                  <p className="text-xs text-text-muted">Mood check</p>
                  <p className="font-mono text-xl font-bold" style={{ color: '#6fb3d2' }}>
                    {report.assessment.mood_score}/27
                  </p>
                  <p className="text-xs text-text-secondary">{report.assessment.mood_level}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-raised)' }}>
                  <p className="text-xs text-text-muted">Worry check</p>
                  <p className="font-mono text-xl font-bold" style={{ color: '#9d8fcc' }}>
                    {report.assessment.worry_score}/21
                  </p>
                  <p className="text-xs text-text-secondary">{report.assessment.worry_level}</p>
                </div>
              </div>
              {report.assessment.q9_flagged || report.assessment.q17_flagged ? (
                <div
                  className="p-3 rounded-lg text-xs text-text-secondary mb-3"
                  style={{ background: 'rgba(183, 126, 181, 0.1)', border: '1px solid rgba(183, 126, 181, 0.2)' }}
                >
                  <Shield className="w-4 h-4 inline mr-1" style={{ color: '#b77eb5' }} />
                  If you're having difficult thoughts, please reach out: 988 or text HOME to 741741 💜
                </div>
              ) : null}
            </motion.div>
          )}

          {/* Session Moments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h2 className="section-title mb-3">Session Moments</h2>
            {report.alerts.length === 0 ? (
              <div className="text-sm text-text-muted py-6 text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: '#52b788' }} />
                A smooth, steady session — well done 🌟
              </div>
            ) : (
              <div className="space-y-2">
                {report.alerts.slice(0, 8).map((alert, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{
                      background: alert.severity === 'high'
                        ? 'rgba(183, 126, 181, 0.1)'
                        : alert.severity === 'medium'
                        ? 'rgba(233, 196, 106, 0.1)'
                        : 'rgba(111, 179, 210, 0.08)',
                      border: `1px solid ${
                        alert.severity === 'high'
                          ? 'rgba(183, 126, 181, 0.2)'
                          : alert.severity === 'medium'
                          ? 'rgba(233, 196, 106, 0.2)'
                          : 'rgba(111, 179, 210, 0.15)'
                      }`,
                    }}
                  >
                    <span className="font-mono text-xs text-text-muted whitespace-nowrap">
                      {Math.floor(alert.seconds_elapsed / 60)}:{String(alert.seconds_elapsed % 60).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-text-secondary">{alert.text}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default ReportDetail;
