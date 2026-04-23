import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';

interface Props { onBack: () => void; }
const STORAGE_KEY = 'mindtrack_gratitude';

interface Entry { text: string; date: string; }

function GratitudeJar({ onBack }: Props): React.ReactElement {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [todayCount, setTodayCount] = useState(0);
  const [showPast, setShowPast] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const all: Entry[] = JSON.parse(raw);
        setEntries(all);
        setTodayCount(all.filter((e) => e.date === today).length);
      }
    } catch { /* noop */ }
  }, [today]);

  const addEntry = () => {
    if (!input.trim() || todayCount >= 5) return;
    const entry: Entry = { text: input.trim(), date: today };
    const updated = [...entries, entry];
    setEntries(updated);
    setTodayCount(todayCount + 1);
    setInput('');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const fillLevel = Math.min(todayCount / 5, 1);

  return (
    <div className="page-container">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary text-sm mb-6 hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Activities
      </button>

      <div className="flex flex-col items-center" style={{ minHeight: '60vh' }}>
        <h2 className="text-xl font-semibold text-text-primary mb-1">🫙 Gratitude Jar</h2>
        <p className="text-text-secondary text-sm mb-6">Write one thing you're grateful for today</p>

        {/* Jar visual */}
        <div className="relative mb-6" style={{ width: 160, height: 200 }}>
          {/* Jar outline */}
          <div
            style={{
              width: '100%',
              height: '100%',
              border: '3px solid rgba(108,155,210,0.3)',
              borderRadius: '0 0 24px 24px',
              borderTop: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Fill */}
            <motion.div
              animate={{ height: `${fillLevel * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(245,166,35,0.3), rgba(245,166,35,0.1))',
                borderRadius: '0 0 20px 20px',
              }}
            />
            {/* Floating slips */}
            <AnimatePresence>
              {entries.filter((e) => e.date === today).map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -40, opacity: 0, rotate: Math.random() * 30 - 15 }}
                  animate={{ y: 200 - (i + 1) * 30, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.2 }}
                  style={{
                    position: 'absolute',
                    left: 10 + (i % 3) * 30,
                    width: 60,
                    padding: '4px 6px',
                    background: 'rgba(245,166,35,0.15)',
                    borderRadius: 6,
                    fontSize: 8,
                    color: '#f5a623',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {/* Jar lid */}
          <div
            style={{
              position: 'absolute',
              top: -8,
              left: '10%',
              right: '10%',
              height: 12,
              background: 'rgba(108,155,210,0.2)',
              borderRadius: '6px 6px 0 0',
              border: '2px solid rgba(108,155,210,0.3)',
              borderBottom: 'none',
            }}
          />
        </div>

        {todayCount >= 3 && (
          <p className="text-accent-green text-sm mb-4">Your jar is filling up with good things 💙</p>
        )}

        {todayCount < 5 ? (
          <div className="flex gap-2 w-full max-w-md">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEntry()}
              placeholder="I'm grateful for..."
              className="input-field flex-1"
              maxLength={100}
            />
            <button onClick={addEntry} disabled={!input.trim()} className="btn-primary py-3 px-4">
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="text-text-secondary text-sm">You've added 5 items today — come back tomorrow! 🌟</p>
        )}

        <p className="text-text-muted text-xs mt-3">{todayCount}/5 entries today</p>

        {/* Past entries toggle */}
        {entries.filter((e) => e.date !== today).length > 0 && (
          <div className="mt-8 w-full max-w-md">
            <button
              onClick={() => setShowPast(!showPast)}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              {showPast ? 'Hide' : 'Show'} past gratitude entries
            </button>
            {showPast && (
              <div className="mt-3 space-y-2">
                {entries
                  .filter((e) => e.date !== today)
                  .slice(-10)
                  .reverse()
                  .map((e, i) => (
                    <div key={i} className="glass-card p-3 text-sm">
                      <p className="text-text-primary">{e.text}</p>
                      <p className="text-text-muted text-xs mt-1">{e.date}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GratitudeJar;
