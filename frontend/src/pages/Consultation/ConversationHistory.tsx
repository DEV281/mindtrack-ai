import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  History, Search, Calendar, Download,
  ChevronRight, MessageCircle, ClipboardCheck, Heart, X,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { format } from 'date-fns';
import useAuthStore from '../../store/authStore';

interface ConsultationSummary {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  model_rank: number;
  mode: string;
  status: string;
  final_risk_score: number | null;
  message_count: number;
  assessment_completed: boolean;
  phq9_score: number | null;
  gad7_score: number | null;
}

interface DetailMessage {
  id: string;
  sender: string;
  message_text: string;
  timestamp: string;
  stress_at_message: number | null;
  anxiety_at_message: number | null;
  input_method?: string;
  voice_transcript?: string | null;
  is_assessment_question?: boolean;
  assessment_q_index?: number | null;
  assessment_answer?: number | null;
}

interface ConsultationDetail {
  consultation_id: string;
  mode: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  model_rank: number;
  final_risk_score: number | null;
  messages: DetailMessage[];
  assessment_result: {
    phq9_score: number;
    gad7_score: number;
    phq9_level: string;
    gad7_level: string;
    recommendations: string[];
  } | null;
}

function moodFromRisk(risk: number | null): { emoji: string; label: string; color: string } {
  if (risk === null) return { emoji: '🔘', label: 'Unknown', color: 'var(--text-muted)' };
  if (risk < 30) return { emoji: '😌', label: 'Calm', color: '#52b788' };
  if (risk < 50) return { emoji: '😐', label: 'Neutral', color: '#e9c46a' };
  if (risk < 70) return { emoji: '😟', label: 'Tense', color: '#f4a261' };
  return { emoji: '😔', label: 'Heavy', color: '#b77eb5' };
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function stressDot(stress: number | null): string {
  if (stress === null) return '#8a94a6';
  if (stress < 30) return '#52b788'; // green
  if (stress < 60) return '#e9c46a'; // amber
  return '#b77eb5'; // lavender
}

function ConversationHistory(): React.ReactElement {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [consultations, setConsultations] = useState<ConsultationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConsultationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConsultations = async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get('/consultation/all');
      setConsultations(data.consultations || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, []);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (detail) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [detail]);

  const openDetail = async (id: string): Promise<void> => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/consultation/${id}/history`);
      setDetail(data);
    } catch {
      toast.error('Failed to load conversation');
    } finally {
      setDetailLoading(false);
    }
  };

  // Build stress timeline for detail
  const stressTimeline = (detail?.messages || [])
    .filter((m) => m.stress_at_message !== null && m.stress_at_message !== undefined)
    .map((m, i) => ({
      idx: i,
      time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      calmness: Math.max(0, Math.round(100 - (m.stress_at_message || 0))),
      sender: m.sender,
    }));

  // Export PDF (backend)
  const exportPDF = async (): Promise<void> => {
    if (!detail) return;
    toast('Preparing your conversation export 💙', { icon: '📄' });
    try {
      const response = await api.get(`/consultation/${detail.consultation_id}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindtrack-conversation-${detail.consultation_id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported');
    } catch {
      // Fallback: client-side PDF
      try {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        let y = 20;

        doc.setFontSize(16);
        doc.text('MindTrack — Conversation Report', 14, y);
        y += 10;

        doc.setFontSize(10);
        doc.text(`Date: ${detail.started_at ? format(new Date(detail.started_at), 'PPpp') : '—'}`, 14, y);
        y += 6;
        doc.text(`Duration: ${formatDuration(detail.duration_seconds)}`, 14, y);
        y += 6;
        doc.text(`Mode: ${detail.mode}`, 14, y);
        y += 10;

        if (detail.assessment_result) {
          doc.setFontSize(12);
          doc.text('Wellness Check-in', 14, y);
          y += 7;
          doc.setFontSize(10);
          doc.text(`Mood: ${detail.assessment_result.phq9_score}/27 (${detail.assessment_result.phq9_level})`, 14, y);
          y += 6;
          doc.text(`Worry: ${detail.assessment_result.gad7_score}/21 (${detail.assessment_result.gad7_level})`, 14, y);
          y += 10;
        }

        doc.setFontSize(12);
        doc.text('Conversation', 14, y);
        y += 7;
        doc.setFontSize(9);

        for (const msg of detail.messages) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          const sender = msg.sender === 'ai' ? 'Companion' : 'You';
          const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const lines = doc.splitTextToSize(`[${time}] ${sender}: ${msg.message_text}`, 180);
          doc.text(lines, 14, y);
          y += lines.length * 5 + 3;
        }

        doc.save(`mindtrack-conversation-${detail.consultation_id.slice(0, 8)}.pdf`);
        toast.success('PDF exported');
      } catch {
        toast.error('PDF export failed');
      }
    }
  };

  // Filter logic
  const filtered = consultations.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const dateStr = c.started_at ? format(new Date(c.started_at), 'PPpp').toLowerCase() : '';
      if (!dateStr.includes(q) && !c.mode.includes(q) && !c.status.includes(q)) return false;
    }
    const risk = c.final_risk_score;
    if (filterRisk === 'calm' && (risk === null || risk >= 40)) return false;
    if (filterRisk === 'moderate' && (risk === null || risk < 40 || risk >= 70)) return false;
    if (filterRisk === 'intense' && (risk === null || risk < 70)) return false;
    return true;
  });

  return (
    <div className="page-container pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">{user?.name ? `${user.name}'s` : 'Your'} Past Conversations</h1>
          <p className="text-text-secondary text-sm mt-1">
            Review your past sessions and see how you've been doing
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by date, mode..."
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'calm', label: '😌 Calm' },
            { key: 'moderate', label: '😐 Moderate' },
            { key: 'intense', label: '😟 Intense' },
          ].map((r) => (
            <button
              key={r.key}
              onClick={() => setFilterRisk(r.key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterRisk === r.key
                  ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                  : 'bg-bg-tertiary text-text-muted hover:text-text-secondary border border-border'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* List */}
        <div className={`${selectedId ? 'xl:col-span-5' : 'xl:col-span-12'} space-y-2`}>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="glass-card p-4 h-24 animate-pulse"
                  style={{ background: 'var(--bg-secondary)', opacity: 0.3 }}
                />
              ))}
            </div>
          ) : error ? (
            <div className="glass-card p-12 text-center">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💙</div>
              <h3 className="text-lg font-medium text-text-primary mb-2">Couldn't load your conversations</h3>
              <p className="text-text-muted text-sm mb-4">We had trouble connecting. Please try again.</p>
              <button
                onClick={fetchConsultations}
                className="btn-primary text-sm"
              >
                Try Again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <h3 className="text-lg font-medium text-text-primary mb-2">No conversations yet</h3>
              <p className="text-text-muted text-sm mb-4">Start a Talk to AI session to begin</p>
              <button
                onClick={() => navigate('/consultation')}
                className="btn-primary text-sm"
              >
                Talk to AI
              </button>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((c) => {
                const mood = moodFromRisk(c.final_risk_score);
                return (
                  <motion.button
                    key={c.id}
                    onClick={() => openDetail(c.id)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`w-full text-left glass-card p-4 transition-all hover:border-border-active ${
                      selectedId === c.id ? 'border-accent-green/30 ring-1 ring-accent-green/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '1.3rem' }}>{mood.emoji}</span>
                        <div>
                          <span className="text-sm text-text-primary font-medium">
                            {mood.label}
                          </span>
                          <p className="text-xs text-text-muted">
                            {c.started_at ? format(new Date(c.started_at), 'MMM d, yyyy  HH:mm') : '—'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className="badge text-xs"
                        style={{
                          background: `${mood.color}15`,
                          border: `1px solid ${mood.color}30`,
                          color: mood.color,
                        }}
                      >
                        Wellness: {c.final_risk_score !== null ? `${Math.max(0, 100 - c.final_risk_score).toFixed(0)}%` : '—'}
                      </span>
                      <span className="badge text-xs bg-bg-tertiary border border-border text-text-secondary">
                        <MessageCircle className="w-3 h-3 inline mr-1" />
                        {c.message_count} msgs
                      </span>
                      <span className="badge text-xs bg-bg-tertiary border border-border text-text-secondary">
                        {formatDuration(c.duration_seconds)}
                      </span>
                      {c.assessment_completed && (
                        <>
                          <span className="badge-violet text-xs">
                            <ClipboardCheck className="w-3 h-3 inline mr-1" />
                            Check-in
                          </span>
                        </>
                      )}
                      <span className={`badge text-xs ${c.status === 'completed' ? 'badge-green' : 'badge-amber'}`}>
                        {c.status}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Detail Panel */}
        {selectedId && (
          <div className="xl:col-span-7">
            <div className="glass-card flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
              {detailLoading ? (
                <div className="flex-1 flex items-center justify-center text-text-muted">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-3" />
                    Loading conversation...
                  </div>
                </div>
              ) : detail ? (
                <>
                  {/* Detail header */}
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Conversation Replay</h3>
                      <p className="text-xs text-text-muted">
                        {detail.started_at ? format(new Date(detail.started_at), 'PPpp') : '—'}
                        {' · '}{formatDuration(detail.duration_seconds)}
                        {' · '}{detail.mode}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={exportPDF} className="btn-secondary text-sm py-1.5 px-3">
                        <Download className="w-4 h-4" /> PDF
                      </button>
                      <button
                        onClick={() => { setSelectedId(null); setDetail(null); }}
                        className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors"
                      >
                        <X className="w-4 h-4 text-text-muted" />
                      </button>
                    </div>
                  </div>

                  {/* Stress timeline chart */}
                  {stressTimeline.length > 2 && (
                    <div className="p-4 border-b border-border" style={{ height: '120px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stressTimeline}>
                          <defs>
                            <linearGradient id="histCalm" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#52b788" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#52b788" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                          <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickLine={false} interval="preserveStartEnd" />
                          <YAxis domain={[0, 100]} hide />
                          <Tooltip
                            contentStyle={{
                              background: 'var(--bg-raised)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              fontSize: '11px',
                              color: 'var(--text-primary)',
                            }}
                            formatter={(val: number) => [`${val}%`, 'Calmness']}
                          />
                          <Area
                            type="monotone"
                            dataKey="calmness"
                            stroke="#52b788"
                            fill="url(#histCalm)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Assessment Summary */}
                  {detail.assessment_result && (
                    <div className="p-4 border-b border-border" style={{ background: 'rgba(157, 143, 204, 0.05)' }}>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-text-muted">Mood check</p>
                          <p className="font-mono text-lg font-bold" style={{ color: '#6fb3d2' }}>
                            {detail.assessment_result.phq9_score}/27
                          </p>
                          <p className="text-xs text-text-secondary">{detail.assessment_result.phq9_level}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted">Worry patterns</p>
                          <p className="font-mono text-lg font-bold" style={{ color: '#9d8fcc' }}>
                            {detail.assessment_result.gad7_score}/21
                          </p>
                          <p className="text-xs text-text-secondary">{detail.assessment_result.gad7_level}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {detail.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.sender === 'patient'
                              ? 'bg-accent-cyan/10 border border-accent-cyan/20'
                              : 'bg-accent-green/10 border border-accent-green/20'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold ${
                              msg.sender === 'patient' ? 'text-accent-cyan' : 'text-accent-green'
                            }`}>
                              {msg.sender === 'patient' ? 'You' : 'Your Companion'}
                            </span>
                            {msg.input_method === 'voice' && (
                              <span title="Sent via voice" className="text-xs" style={{ cursor: 'help' }}>🎙</span>
                            )}
                            <span className="text-xs text-text-muted">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap text-text-primary">{msg.message_text}</p>
                          {msg.stress_at_message !== null && msg.stress_at_message !== undefined && (
                            <div className="flex items-center gap-2 mt-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ background: stressDot(msg.stress_at_message) }}
                              />
                              <span className="text-xs text-text-muted">
                                Wellness: {Math.max(0, 100 - msg.stress_at_message).toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-muted">
                  Select a conversation to view details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConversationHistory;
