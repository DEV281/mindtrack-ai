import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookHeart, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────
type MoodLevel = 1 | 2 | 3 | 4 | 5
interface JournalEntry {
  id: string
  date: string // ISO
  mood: MoodLevel
  note: string
  tags: string[]
  prompt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MOODS: { level: MoodLevel; emoji: string; label: string; color: string; bg: string }[] = [
  { level: 1, emoji: '😔', label: 'Struggling', color: '#d4829a', bg: '#fce8ef' },
  { level: 2, emoji: '😟', label: 'Low', color: '#e8a838', bg: '#fef3dc' },
  { level: 3, emoji: '😐', label: 'Okay', color: '#8fa8b8', bg: '#e8eef5' },
  { level: 4, emoji: '🙂', label: 'Good', color: '#5b9bd5', bg: '#deeaf7' },
  { level: 5, emoji: '😄', label: 'Great', color: '#52b788', bg: '#d8f3e8' },
]

const DAILY_PROMPTS = [
  'What made you smile today?',
  'What is one thing you are grateful for?',
  'Describe your current mood in 3 words.',
  'What helped you feel grounded today?',
  'What is one challenge you overcame?',
  'What are you looking forward to?',
  'How did you care for yourself today?',
]

const ALL_TAGS = [
  'anxious', 'grateful', 'tired', 'hopeful', 'stressed', 'peaceful',
  'overwhelmed', 'focused', 'sad', 'energised', 'lonely', 'loved',
  'proud', 'restless', 'content',
]

const STORAGE_KEY = 'mindtrack_journal'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Helpers ─────────────────────────────────────────────────────────────────
function loadEntries(): JournalEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

function saveEntries(entries: JournalEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getDailyPrompt(): string {
  const day = new Date().getDay()
  return DAILY_PROMPTS[day % DAILY_PROMPTS.length]
}

function getStreak(entries: JournalEntry[]): number {
  const dates = new Set(entries.map((e) => e.date))
  let streak = 0
  const d = new Date()
  while (dates.has(toDateStr(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function get7DayMoodData(entries: JournalEntry[]) {
  const today = new Date()
  return DAY_LABELS.map((label, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    const dateStr = toDateStr(d)
    const dayEntries = entries.filter((e) => e.date === dateStr)
    const avg = dayEntries.length
      ? Math.round(dayEntries.reduce((s, e) => s + e.mood, 0) / dayEntries.length)
      : 0
    return { label, avg }
  })
}

function moodColor(level: number): string {
  if (level >= 5) return '#52b788'
  if (level >= 4) return '#5b9bd5'
  if (level >= 3) return '#8fa8b8'
  if (level >= 2) return '#e8a838'
  return '#d4829a'
}

function formatRelativeDate(dateStr: string): string {
  const today = toDateStr(new Date())
  const yesterday = toDateStr(new Date(Date.now() - 86400000))
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })
}

// ─── Sub-Components ───────────────────────────────────────────────────────────
function StatPill({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--bg-raised)', border: '1px solid var(--border)',
      borderRadius: 50, padding: '5px 14px', fontSize: 13, fontWeight: 600,
      color: 'var(--text-primary)',
    }}>
      {emoji} {label}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
function MoodJournal(): React.ReactElement {
  const [tab, setTab] = useState<'today' | 'history'>('today')
  const [entries, setEntries] = useState<JournalEntry[]>(loadEntries)
  const [selectedMood, setSelectedMood] = useState<MoodLevel | null>(null)
  const [note, setNote] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const prompt = getDailyPrompt()
  const today = toDateStr(new Date())
  const todayEntry = entries.find((e) => e.date === today)
  const streak = getStreak(entries)
  const chartData = get7DayMoodData(entries)
  const avgThisWeek = chartData.filter((d) => d.avg > 0)
  const avgMood = avgThisWeek.length
    ? Math.round(avgThisWeek.reduce((s, d) => s + d.avg, 0) / avgThisWeek.length)
    : 0
  const avgMoodEmoji = MOODS.find((m) => m.level === avgMood)?.emoji || '—'

  // Group history entries by date
  const grouped = entries
    .filter((e) => e.date !== today || tab === 'history')
    .sort((a, b) => b.date.localeCompare(a.date))
    .reduce<Record<string, JournalEntry[]>>((acc, e) => {
      if (!acc[e.date]) acc[e.date] = []
      acc[e.date].push(e)
      return acc
    }, {})

  const handleSave = () => {
    if (!selectedMood) return
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: today,
      mood: selectedMood,
      note,
      tags: selectedTags,
      prompt,
    }
    // Replace existing entry for today or prepend
    const updated = [newEntry, ...entries.filter((e) => e.date !== today)]
    setEntries(updated)
    saveEntries(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--lavender), var(--primary))',
          }}>
            <BookHeart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-title">Mood Journal</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 1 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatPill emoji="🔥" label={`${streak} day streak`} />
          <StatPill emoji="✏️" label={`${entries.length} entries`} />
          <StatPill emoji={avgMoodEmoji || '📊'} label={`7-day avg`} />
        </div>
      </motion.div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-sunken)', borderRadius: 14, padding: 4, width: 'fit-content' }}>
        {(['today', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '9px 22px', borderRadius: 10, border: 'none', fontFamily: 'Nunito, sans-serif',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              background: tab === t ? 'white' : 'transparent',
              color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {t === 'today' ? '📝 Today' : '📅 History'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'today' ? (
          <motion.div key="today" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Mood Picker */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                How are you feeling right now?
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                {MOODS.map((m) => (
                  <button
                    key={m.level}
                    onClick={() => setSelectedMood(m.level)}
                    style={{
                      flex: 1, padding: '14px 8px', borderRadius: 16, border: '2px solid',
                      borderColor: selectedMood === m.level ? m.color : 'transparent',
                      background: selectedMood === m.level ? m.bg : 'var(--bg-sunken)',
                      cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 4 }}>{m.emoji}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: selectedMood === m.level ? m.color : 'var(--text-muted)' }}>
                      {m.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Prompt + Note */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{prompt}</p>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write freely — this is your safe space..."
                rows={5}
                style={{
                  width: '100%', border: '1.5px solid var(--border)', borderRadius: 12,
                  padding: '12px 16px', fontSize: 14, color: 'var(--text-primary)',
                  background: 'var(--bg-sunken)', fontFamily: 'Nunito, sans-serif',
                  lineHeight: 1.7, resize: 'vertical', boxSizing: 'border-box',
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = 'white' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-sunken)' }}
              />
            </div>

            {/* Tags */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Tag your mood
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ALL_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '6px 16px', borderRadius: 50, border: '1.5px solid',
                        borderColor: active ? 'var(--primary)' : 'var(--border)',
                        background: active ? 'var(--primary-light)' : 'transparent',
                        color: active ? 'var(--primary)' : 'var(--text-secondary)',
                        fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
                        transition: 'all 0.15s', fontFamily: 'Nunito, sans-serif',
                      }}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={!selectedMood}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 50, border: 'none',
                background: selectedMood
                  ? 'linear-gradient(135deg, var(--primary), var(--lavender))'
                  : 'var(--bg-sunken)',
                color: selectedMood ? 'white' : 'var(--text-hint)',
                fontSize: 15, fontWeight: 800, cursor: selectedMood ? 'pointer' : 'not-allowed',
                fontFamily: 'Nunito, sans-serif', transition: 'all 0.2s',
                boxShadow: selectedMood ? 'var(--shadow-md)' : 'none',
              }}
            >
              {saved ? '✓ Saved!' : '💾 Save Today\'s Entry'}
            </button>

            {/* Today's existing entry */}
            {todayEntry && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{ padding: 18, marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <span style={{ fontSize: 28 }}>{MOODS.find((m) => m.level === todayEntry.mood)?.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                    {MOODS.find((m) => m.level === todayEntry.mood)?.label} — Today&apos;s entry saved
                  </p>
                  {todayEntry.note && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
                      {todayEntry.note.slice(0, 120)}{todayEntry.note.length > 120 ? '...' : ''}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {todayEntry.tags.slice(0, 5).map((t) => (
                      <span key={t} style={{
                        padding: '2px 10px', borderRadius: 50,
                        background: 'var(--primary-light)', color: 'var(--primary)',
                        fontSize: 11, fontWeight: 700,
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* 7-Day Chart */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 16 }}>
                7-Day Mood Overview
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barSize={28}>
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)', fontFamily: 'Nunito' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} hide />
                  <Tooltip
                    cursor={{ fill: 'rgba(91,155,213,0.06)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const v = payload[0].value as number
                      const mood = MOODS.find((m) => m.level === v)
                      return (
                        <div style={{
                          background: 'white', border: '1px solid var(--border)',
                          borderRadius: 10, padding: '8px 14px', fontSize: 13,
                        }}>
                          {mood ? `${mood.emoji} ${mood.label}` : 'No data'}
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.avg > 0 ? moodColor(d.avg) : '#e8eef5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Entry list */}
            {Object.keys(grouped).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: 40 }}>📖</span>
                <p style={{ marginTop: 12, fontSize: 14 }}>No journal entries yet.</p>
                <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-hint)' }}>Start by logging today&apos;s mood.</p>
              </div>
            ) : (
              Object.entries(grouped).map(([date, dayEntries]) => (
                <div key={date} style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    {formatRelativeDate(date)}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dayEntries.map((entry) => {
                      const moodData = MOODS.find((m) => m.level === entry.mood)!
                      const isExpanded = expanded === entry.id
                      return (
                        <div key={entry.id} className="glass-card" style={{ overflow: 'hidden' }}>
                          <button
                            onClick={() => setExpanded(isExpanded ? null : entry.id)}
                            style={{
                              width: '100%', padding: '14px 18px', background: 'transparent',
                              border: 'none', cursor: 'pointer', display: 'flex',
                              alignItems: 'center', gap: 12, fontFamily: 'Nunito, sans-serif',
                            }}
                          >
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '4px 12px', borderRadius: 50, fontSize: 13, fontWeight: 700,
                              background: moodData.bg, color: moodData.color,
                            }}>
                              {moodData.emoji} {moodData.label}
                            </span>
                            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {entry.tags.slice(0, 4).map((t) => (
                                <span key={t} style={{
                                  padding: '2px 8px', borderRadius: 50, fontSize: 11,
                                  background: 'var(--bg-sunken)', color: 'var(--text-secondary)',
                                }}>{t}</span>
                              ))}
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                          </button>
                          <AnimatePresence>
                            {isExpanded && entry.note && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ overflow: 'hidden' }}
                              >
                                <div style={{
                                  padding: '0 18px 16px',
                                  borderTop: '1px solid var(--border)',
                                  paddingTop: 12,
                                }}>
                                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                                    {entry.note}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MoodJournal
