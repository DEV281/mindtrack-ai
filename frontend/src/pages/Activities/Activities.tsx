import React, { useState } from 'react';
import { motion } from 'framer-motion';
import BreathingBubble from './games/BreathingBubble';
import MemoryMatch from './games/MemoryMatch';
import GratitudeJar from './games/GratitudeJar';
import WordCalm from './puzzles/WordCalm';
import MindfulJigsaw from './puzzles/MindfulJigsaw';
import MoodMusic from './MoodMusic';

type BreathingType = 'default' | 'box' | '478' | 'coherent';

type ActivityView =
  | 'hub'
  | 'memory'
  | 'gratitude'
  | 'wordcalm'
  | 'jigsaw'
  | 'music'
  | { kind: 'breathing'; type: BreathingType }
  | { kind: 'grounding'; exercise: string };

// Grounding exercise content (shown as an in-page guide)
const GROUNDING_CONTENT: Record<string, { title: string; emoji: string; steps: string[]; color: string }> = {
  sensing: {
    title: '5-4-3-2-1 Sensing',
    emoji: '👋',
    color: '#e8a838',
    steps: [
      '👀 Name 5 things you can SEE around you right now.',
      '🤲 Name 4 things you can TOUCH — then actually touch them.',
      '👂 Name 3 things you can HEAR in your environment.',
      '👃 Name 2 things you can SMELL — or recall a favourite scent.',
      '👅 Name 1 thing you can TASTE right now.',
    ],
  },
  bodyscan: {
    title: 'Body Scan',
    emoji: '🧘',
    color: '#52b788',
    steps: [
      'Close your eyes and take three slow, deep breaths.',
      'Notice any tension in your forehead and jaw — let it soften.',
      'Relax your shoulders. Let them drop away from your ears.',
      'Feel your chest rise and fall naturally with each breath.',
      'Release tension in your belly, hips, and thighs.',
      'Wiggle your fingers and toes. You are here, present and safe.',
    ],
  },
  safeplace: {
    title: 'Safe Place Visualisation',
    emoji: '🏡',
    color: '#d4829a',
    steps: [
      'Close your eyes and take three grounding breaths.',
      'Picture a place where you feel completely safe and at peace.',
      'See the colours, textures, and shapes around you in detail.',
      'Notice the sounds — are they gentle, distant, or soothing?',
      'Feel the temperature and any gentle sensation on your skin.',
      'Rest here for as long as you need. You can return anytime.',
    ],
  },
};

function GroundingGuide({ id, onBack }: { id: string; onBack: () => void }): React.ReactElement {
  const content = GROUNDING_CONTENT[id];
  if (!content) return <div />;
  const [step, setStep] = useState(0);
  const done = step >= content.steps.length;

  return (
    <div className="page-container">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary text-sm mb-6 hover:text-text-primary transition-colors">
        <span>← Back to Activities</span>
      </button>
      <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-5xl mb-3">{content.emoji}</div>
        <h2 className="text-2xl font-bold text-text-primary mb-1 text-center">{content.title}</h2>
        <p className="text-text-secondary text-sm mb-8 text-center">A mindful grounding exercise</p>

        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-xl font-bold text-text-primary mb-1">Well done!</h3>
            <p className="text-text-secondary text-sm mb-6">You've completed the grounding exercise.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setStep(0)} className="btn-primary text-sm py-2.5 px-5">Repeat</button>
              <button onClick={onBack} className="btn-secondary text-sm py-2.5 px-5">Back</button>
            </div>
          </motion.div>
        ) : (
          <div className="max-w-sm w-full">
            {/* Progress bar */}
            <div className="flex gap-1.5 mb-6 justify-center">
              {content.steps.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full transition-all duration-500"
                  style={{ background: i <= step ? content.color : 'var(--bg-sunken)' }}
                />
              ))}
            </div>

            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 text-center mb-6"
            >
              <p className="text-lg font-semibold text-text-primary leading-relaxed">{content.steps[step]}</p>
              <p className="text-text-muted text-xs mt-3">Step {step + 1} of {content.steps.length}</p>
            </motion.div>

            <div className="flex gap-3 justify-center">
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)} className="btn-secondary text-sm py-2.5 px-5">
                  ← Back
                </button>
              )}
              <button
                onClick={() => setStep(s => s + 1)}
                className="btn-primary text-sm py-2.5 px-6"
                style={{ background: `linear-gradient(135deg, ${content.color}, ${content.color}cc)` }}
              >
                {step === content.steps.length - 1 ? 'Finish ✓' : 'Next →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const GAMES = [
  { id: 'memory' as const,   emoji: '🃏', title: 'Memory Card Match', desc: 'Match wellness emoji pairs',    color: '#52b788' },
  { id: 'gratitude' as const, emoji: '🫙', title: 'Gratitude Jar',     desc: "Write what you're grateful for", color: '#f5a623' },
  { id: 'wordcalm' as const,  emoji: '🔤', title: 'Word Calm',          desc: 'Guess the positive word',       color: '#9d8fcc' },
];

const BREATHING_EXERCISES: { type: BreathingType; emoji: string; title: string; desc: string; color: string }[] = [
  { type: 'default',  emoji: '🫧', title: 'Breathing Bubble',   desc: '4-4-6 — Relax & unwind',         color: '#6c9bd2' },
  { type: 'box',      emoji: '🟦', title: 'Box Breathing',       desc: '4-4-4-4 — Balance & focus',       color: '#5b9bd5' },
  { type: '478',      emoji: '💙', title: '4-7-8 Breathing',     desc: 'Inhale 4 · Hold 7 · Exhale 8',   color: '#9d8fcc' },
  { type: 'coherent', emoji: '〰️', title: 'Coherent Breathing', desc: '5-5 — Calms your nervous system',  color: '#52b788' },
];

const GROUNDING_EXERCISES: { id: string; emoji: string; title: string; desc: string; color: string }[] = [
  { id: 'sensing',   emoji: '👋', title: '5-4-3-2-1 Sensing', desc: 'Ground yourself into this moment', color: '#e8a838' },
  { id: 'bodyscan',  emoji: '🧘', title: 'Body Scan',          desc: 'Release tension from head to toe', color: '#52b788' },
  { id: 'safeplace', emoji: '🏡', title: 'Safe Place',         desc: 'Visualise your peaceful space',    color: '#d4829a' },
];

function Activities(): React.ReactElement {
  const [view, setView] = useState<ActivityView>('hub');

  // Route to specific views
  if (typeof view === 'object' && view.kind === 'breathing') {
    return <BreathingBubble onBack={() => setView('hub')} type={view.type} />;
  }
  if (typeof view === 'object' && view.kind === 'grounding') {
    return <GroundingGuide id={view.exercise} onBack={() => setView('hub')} />;
  }
  if (view === 'memory')   return <MemoryMatch    onBack={() => setView('hub')} />;
  if (view === 'gratitude') return <GratitudeJar  onBack={() => setView('hub')} />;
  if (view === 'wordcalm') return <WordCalm       onBack={() => setView('hub')} />;
  if (view === 'jigsaw')   return <MindfulJigsaw  onBack={() => setView('hub')} />;
  if (view === 'music')    return <MoodMusic      onBack={() => setView('hub')} />;

  return (
    <div className="page-container">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="page-title">🌈 Feel Better</h1>
        <p className="text-text-secondary text-sm mt-1 mb-8">Take a break. Play, relax, and feel better.</p>
      </motion.div>

      {/* Quick Games */}
      <section className="mb-8">
        <h2 className="section-title mb-4">🎮 Quick Games</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES.map((g, i) => (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setView(g.id)}
              className="glass-card-hover p-6 text-left"
            >
              <div className="text-3xl mb-3">{g.emoji}</div>
              <h3 className="text-text-primary font-semibold mb-1">{g.title}</h3>
              <p className="text-text-secondary text-sm">{g.desc}</p>
              <div className="mt-3 h-1 w-12 rounded-full" style={{ background: g.color }} />
            </motion.button>
          ))}
          {/* Jigsaw */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            onClick={() => setView('jigsaw')}
            className="glass-card-hover p-6 text-left"
          >
            <div className="text-3xl mb-3">🧩</div>
            <h3 className="text-text-primary font-semibold mb-1">Mindful Jigsaw</h3>
            <p className="text-text-secondary text-sm">Piece together calming patterns</p>
            <div className="mt-3 h-1 w-12 rounded-full" style={{ background: '#6c9bd2' }} />
          </motion.button>
        </div>
      </section>

      {/* Breathing Exercises */}
      <section className="mb-8">
        <h2 className="section-title mb-4">🌬️ Breathing Exercises</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BREATHING_EXERCISES.map((ex, i) => (
            <motion.button
              key={ex.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.07 }}
              onClick={() => setView({ kind: 'breathing', type: ex.type })}
              className="glass-card-hover p-5 text-left"
            >
              <div className="text-3xl mb-3">{ex.emoji}</div>
              <h3 className="text-text-primary font-semibold mb-1 text-sm">{ex.title}</h3>
              <p className="text-text-secondary text-xs">{ex.desc}</p>
              <div className="mt-3 h-1 w-10 rounded-full" style={{ background: ex.color }} />
            </motion.button>
          ))}
        </div>
      </section>

      {/* Grounding Exercises */}
      <section className="mb-8">
        <h2 className="section-title mb-4">🌿 Grounding Exercises</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {GROUNDING_EXERCISES.map((ex, i) => (
            <motion.button
              key={ex.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              onClick={() => setView({ kind: 'grounding', exercise: ex.id })}
              className="glass-card-hover p-5 text-left"
            >
              <div className="text-3xl mb-3">{ex.emoji}</div>
              <h3 className="text-text-primary font-semibold mb-1">{ex.title}</h3>
              <p className="text-text-secondary text-sm">{ex.desc}</p>
              <div className="mt-3 h-1 w-10 rounded-full" style={{ background: ex.color }} />
            </motion.button>
          ))}
        </div>
      </section>

      {/* Music & Sounds */}
      <section>
        <h2 className="section-title mb-4">🎵 Music & Sounds</h2>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          onClick={() => setView('music')}
          className="glass-card-hover p-6 text-left w-full"
        >
          <div className="flex items-center gap-4">
            <div className="text-3xl">🎵</div>
            <div>
              <h3 className="text-text-primary font-semibold mb-1">Calm Music & Nature Sounds</h3>
              <p className="text-text-secondary text-sm">Listen to soothing music, nature sounds, and guided meditation</p>
            </div>
          </div>
        </motion.button>
      </section>
    </div>
  );
}

export default Activities;
