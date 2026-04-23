import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Square } from 'lucide-react';

interface Props { onBack: () => void; type?: 'box' | '478' | 'coherent' | 'default'; }

// Phase definitions for each breathing technique
const BREATHING_PATTERNS = {
  default: [
    { phase: 'in',   duration: 4000, label: 'Breathe In',  scale: 1 },
    { phase: 'hold', duration: 4000, label: 'Hold',         scale: 1 },
    { phase: 'out',  duration: 6000, label: 'Breathe Out', scale: 0.5 },
  ],
  box: [
    { phase: 'in',   duration: 4000, label: 'Breathe In',  scale: 1 },
    { phase: 'hold', duration: 4000, label: 'Hold',         scale: 1 },
    { phase: 'out',  duration: 4000, label: 'Breathe Out', scale: 0.5 },
    { phase: 'hold', duration: 4000, label: 'Hold',         scale: 0.5 },
  ],
  '478': [
    { phase: 'in',   duration: 4000,  label: 'Breathe In',  scale: 1 },
    { phase: 'hold', duration: 7000,  label: 'Hold',         scale: 1 },
    { phase: 'out',  duration: 8000,  label: 'Breathe Out', scale: 0.5 },
  ],
  coherent: [
    { phase: 'in',   duration: 5000, label: 'Breathe In',  scale: 1 },
    { phase: 'out',  duration: 5000, label: 'Breathe Out', scale: 0.5 },
  ],
};

const PATTERN_LABELS: Record<string, string> = {
  default:   '4-4-6 Breathing',
  box:       '📦 Box Breathing (4-4-4-4)',
  '478':     '4-7-8 Breathing',
  coherent:  '〰️ Coherent Breathing (5-5)',
};

function BreathingBubble({ onBack, type = 'default' }: Props): React.ReactElement {
  const phases = BREATHING_PATTERNS[type] ?? BREATHING_PATTERNS.default;
  const CYCLE_MS = phases.reduce((s, p) => s + p.duration, 0);

  const [active, setActive] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(2);
  const [elapsed, setElapsed] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [scale, setScale] = useState(0.5);
  const startRef = useRef(0);
  const frameRef = useRef<number>(0);
  const totalMs = selectedDuration * 60 * 1000;

  const animate = useCallback(() => {
    const now = Date.now();
    const diff = now - startRef.current;
    setElapsed(diff);

    if (diff >= totalMs) {
      setActive(false);
      setCycles(Math.floor(diff / CYCLE_MS));
      return;
    }

    const cyclePos = diff % CYCLE_MS;
    setCycles(Math.floor(diff / CYCLE_MS));

    let acc = 0;
    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      if (cyclePos < acc + p.duration) {
        setPhaseIndex(i);
        const progress = (cyclePos - acc) / p.duration;
        if (p.phase === 'in') {
          setScale(0.5 + progress * 0.5);
        } else if (p.phase === 'hold') {
          setScale(p.scale);
        } else {
          setScale(1 - progress * 0.5);
        }
        break;
      }
      acc += p.duration;
    }
    frameRef.current = requestAnimationFrame(animate);
  }, [totalMs, phases, CYCLE_MS]);

  useEffect(() => {
    if (active) {
      startRef.current = Date.now();
      frameRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frameRef.current);
    }
  }, [active, animate]);

  const done = !active && elapsed > 0 && elapsed >= totalMs;
  const currentPhase = phases[phaseIndex];
  const phaseLabel = currentPhase?.label ?? 'Ready';

  // Phase step durations string e.g. "4s → 7s → 8s"
  const phaseSummary = phases.map((p, i) => `${p.duration / 1000}s`).join(' → ');

  return (
    <div className="page-container">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary text-sm mb-6 hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Activities
      </button>

      <div className="flex flex-col items-center justify-center" style={{ minHeight: '65vh' }}>
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">🌟</div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Well done!</h2>
              <p className="text-text-secondary">You completed {cycles} breathing cycles</p>
              <p className="text-text-muted text-sm mt-1">{selectedDuration} minutes of mindful breathing</p>
              <div className="flex gap-3 justify-center mt-8">
                <button onClick={() => { setElapsed(0); setActive(true); }} className="btn-primary py-2.5 px-6 text-sm">
                  <Play className="w-4 h-4" /> Do Again
                </button>
                <button onClick={onBack} className="btn-secondary py-2.5 px-5 text-sm">Back to Activities</button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="session" className="flex flex-col items-center w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Title */}
              <h2 className="text-xl font-bold text-text-primary mb-0.5 text-center">
                {PATTERN_LABELS[type] ?? '🫧 Breathing Bubble'}
              </h2>
              <p className="text-text-muted text-xs mb-1">{phaseSummary}</p>

              {/* Duration selector */}
              {!active && (
                <div className="mb-6 mt-4 text-center">
                  <p className="text-text-secondary text-sm mb-3">Choose duration</p>
                  <div className="flex gap-3 justify-center">
                    {[2, 5, 10].map((d) => (
                      <button
                        key={d}
                        onClick={() => setSelectedDuration(d)}
                        className="px-5 py-2 rounded-xl border text-sm font-semibold transition-all"
                        style={{
                          background: selectedDuration === d ? 'rgba(91,155,213,0.12)' : 'transparent',
                          borderColor: selectedDuration === d ? 'rgba(91,155,213,0.5)' : 'var(--border)',
                          color: selectedDuration === d ? 'var(--primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {d} min
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bubble */}
              <div className="relative flex items-center justify-center my-4" style={{ width: 260, height: 260 }}>
                {/* Outer glow ring */}
                <motion.div
                  animate={{ scale: active ? scale * 1.35 : 1, opacity: active ? 0.3 : 0 }}
                  transition={{ ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(91,155,213,0.25) 0%, transparent 70%)',
                  }}
                />
                {/* Main bubble */}
                <motion.div
                  animate={{ scale }}
                  transition={{ ease: 'easeInOut', duration: currentPhase ? currentPhase.duration / 1000 : 0.5 }}
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, rgba(91,155,213,0.35) 0%, rgba(157,143,204,0.25) 50%, rgba(91,155,213,0.08) 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 ${50 * scale}px rgba(91,155,213,0.2)`,
                    border: '1.5px solid rgba(91,155,213,0.3)',
                  }}
                >
                  <span className="font-bold text-text-primary" style={{ fontSize: active ? 15 : 14 }}>
                    {active ? phaseLabel : 'Ready'}
                  </span>
                </motion.div>
              </div>

              {/* Controls */}
              {!active ? (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setElapsed(0); setCycles(0); setPhaseIndex(0); setScale(0.5); setActive(true); }}
                  className="btn-primary mt-2 py-3 px-10"
                >
                  <Play className="w-4 h-4" /> Start Breathing
                </motion.button>
              ) : (
                <div className="text-center mt-4">
                  <p className="text-text-muted text-sm mb-2">
                    Cycle {cycles + 1} · {Math.floor(elapsed / 1000)}s / {selectedDuration * 60}s
                  </p>
                  {/* Progress bar */}
                  <div className="w-48 h-1.5 rounded-full mx-auto mb-3" style={{ background: 'var(--bg-sunken)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((elapsed / totalMs) * 100, 100)}%`,
                        background: 'var(--primary)',
                      }}
                    />
                  </div>
                  <button
                    onClick={() => { setActive(false); setElapsed(0); setScale(0.5); }}
                    className="flex items-center gap-1.5 mx-auto text-text-muted text-xs hover:text-text-secondary transition-colors"
                  >
                    <Square className="w-3 h-3" /> Stop
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default BreathingBubble;
