import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Calendar, Clock, Heart, ChevronRight, Search, PlusCircle, Sparkles, Download } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/authStore';

interface ReportItem {
  session_id: string;
  source: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  model_mode: { emoji: string; label: string };
  total_readings: number;
  avg_wellness: number;
  peak_stress: number;
  mood_emoji: string;
  mood_label: string;
  has_assessment: boolean;
  phq9_score: number | null;
  gad7_score: number | null;
  summary_text: string | null;
  has_report: boolean;
  report_id: string | null;
}

function formatDuration(s: number): string {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function wellnessColor(w: number): string {
  if (w >= 70) return 'text-accent-green';
  if (w >= 50) return 'text-accent-amber';
  return 'text-accent-violet';
}

function wellnessLabel(w: number): string {
  if (w >= 70) return 'CALM';
  if (w >= 50) return 'MODERATE';
  return 'NEEDS CARE';
}

function wellnessBadge(w: number): string {
  if (w >= 70) return 'badge-green';
  if (w >= 50) return 'badge-amber';
  return 'badge-violet';
}

function Reports(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get('/reports/');
      setReports(data.reports || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filtered = reports.filter((r) => {
    const wl = wellnessLabel(r.avg_wellness);
    if (filter !== 'all' && wl !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const dateStr = r.started_at ? new Date(r.started_at).toLocaleDateString().toLowerCase() : '';
      if (
        !dateStr.includes(q) &&
        !(r.summary_text || '').toLowerCase().includes(q) &&
        !r.mood_label.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const handleGenerateReport = async (sessionId: string) => {
    setGenerating(sessionId);
    try {
      await api.post(`/reports/${sessionId}/generate`);
      // Refresh the list
      const { data } = await api.get('/reports/');
      setReports(data.reports || []);
    } catch {
      // ignore
    } finally {
      setGenerating(null);
    }
  };

  const handleDownloadPdf = async (sessionId: string) => {
    try {
      const response = await api.get(`/reports/${sessionId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindtrack-report-${sessionId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">{user?.name ? `${user.name}'s` : 'Your'} Journey</h1>
          <p className="text-text-secondary text-sm mt-1">See how you've been doing over time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports..."
              className="input-field pl-10 py-2 text-sm w-52"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field py-2 text-sm w-36"
          >
            <option value="all">All</option>
            <option value="CALM">😌 Calm</option>
            <option value="MODERATE">😐 Moderate</option>
            <option value="NEEDS CARE">😟 Needs Care</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 h-52 animate-pulse" style={{ background: 'var(--bg-secondary)', opacity: 0.3 }} />
          ))}
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-16 text-center"
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💙</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Something went wrong loading your journey</h3>
          <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
            We couldn't load your reports right now. Please try again.
          </p>
          <button onClick={fetchReports} className="btn-primary inline-flex items-center gap-2">
            Try Again
          </button>
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-16 text-center"
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌱</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            {search || filter !== 'all' ? 'No matching reports found' : 'No Reports Yet'}
          </h3>
          <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
            {search || filter !== 'all'
              ? 'Try changing your search or filter criteria'
              : 'Reports are automatically generated when you complete a session. Start a conversation to create your first wellness report.'}
          </p>
          {!search && filter === 'all' && (
            <Link to="/consultation" className="btn-primary inline-flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Start a Session
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((report, i) => {
              const label = wellnessLabel(report.avg_wellness);
              const date = report.started_at ? new Date(report.started_at) : null;
              return (
                <motion.div
                  key={report.session_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/reports/${report.session_id}`} className="block glass-card-hover p-5 group">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '1.5rem' }}>{report.mood_emoji}</span>
                        <div>
                          <span className="text-sm font-medium text-text-primary">
                            {report.mood_label}
                          </span>
                          <p className="text-xs text-text-muted">
                            {date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </p>
                        </div>
                      </div>
                      <span className={wellnessBadge(report.avg_wellness)}>{label}</span>
                    </div>

                    {/* Summary preview */}
                    {report.summary_text && (
                      <p className="text-xs text-text-secondary line-clamp-2 mb-3">
                        {report.summary_text.slice(0, 120)}…
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="badge text-xs bg-bg-tertiary border border-border text-text-secondary">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                      <span className="badge text-xs bg-bg-tertiary border border-border text-text-secondary">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatDuration(report.duration_seconds)}
                      </span>
                      <span className="badge text-xs bg-bg-tertiary border border-border text-text-secondary">
                        {report.model_mode?.emoji} {report.model_mode?.label}
                      </span>
                      {report.has_assessment && (
                        <span className="badge-violet text-xs">Check-in ✓</span>
                      )}
                    </div>

                    {/* Bottom stats + actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-text-muted">Wellness</p>
                          <p className={`font-mono font-bold text-sm ${wellnessColor(report.avg_wellness)}`}>
                            {report.avg_wellness.toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted">Readings</p>
                          <p className="font-mono font-bold text-sm text-accent-cyan">
                            {report.total_readings}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!report.has_report && (
                          <button
                            onClick={(e) => { e.preventDefault(); handleGenerateReport(report.session_id); }}
                            disabled={generating === report.session_id}
                            className="p-1.5 rounded-lg hover:bg-accent-green/10 transition-colors"
                            title="Generate report"
                          >
                            <Sparkles className={`w-4 h-4 ${generating === report.session_id ? 'animate-spin text-accent-amber' : 'text-accent-green'}`} />
                          </button>
                        )}
                        {report.has_report && (
                          <button
                            onClick={(e) => { e.preventDefault(); handleDownloadPdf(report.session_id); }}
                            className="p-1.5 rounded-lg hover:bg-accent-cyan/10 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4 text-accent-cyan" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent-green transition-colors" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default Reports;
