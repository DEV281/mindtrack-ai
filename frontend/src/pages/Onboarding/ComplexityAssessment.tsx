import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import api from '../../api/client';

interface Question {
  id: number;
  title: string;
  question: string;
  options: { key: string; text: string; score: number }[];
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    title: 'Emotional Complexity',
    question: 'When you feel stressed, which best describes you?',
    options: [
      { key: 'A', text: 'I know exactly what\'s causing it and can explain it', score: 1 },
      { key: 'B', text: 'I have a general sense but it\'s hard to put into words', score: 2 },
      { key: 'C', text: 'I often don\'t know why I feel stressed', score: 3 },
      { key: 'D', text: 'My feelings are usually mixed and complicated', score: 2 },
    ],
  },
  {
    id: 2,
    title: 'Coping Style',
    question: 'When facing a difficult emotion, you usually:',
    options: [
      { key: 'A', text: 'Address it directly — talk about it or write it down', score: 1 },
      { key: 'B', text: 'Distract yourself — work, hobbies, TV', score: 2 },
      { key: 'C', text: 'Withdraw — need time alone to process', score: 3 },
      { key: 'D', text: 'Seek support — talk to someone you trust', score: 2 },
    ],
  },
  {
    id: 3,
    title: 'Insight Level',
    question: 'How well do you understand your own emotional patterns?',
    options: [
      { key: 'A', text: 'Very well — I can predict my moods and triggers', score: 1 },
      { key: 'B', text: 'Somewhat — I notice patterns but don\'t always understand them', score: 2 },
      { key: 'C', text: 'Not very well — my emotions often surprise me', score: 3 },
      { key: 'D', text: 'Not at all — I rarely reflect on my emotional state', score: 2 },
    ],
  },
  {
    id: 4,
    title: 'Communication Comfort',
    question: 'When talking about your feelings with someone:',
    options: [
      { key: 'A', text: 'I find it easy and natural', score: 1 },
      { key: 'B', text: 'I can do it but it takes effort', score: 2 },
      { key: 'C', text: 'I find it difficult and uncomfortable', score: 3 },
      { key: 'D', text: 'I avoid it as much as possible', score: 2 },
    ],
  },
  {
    id: 5,
    title: 'Support Preference',
    question: 'What kind of support do you find most helpful?',
    options: [
      { key: 'A', text: 'Practical advice — tell me what to do', score: 1 },
      { key: 'B', text: 'Being listened to — just let me talk', score: 2 },
      { key: 'C', text: 'Information — help me understand what I\'m experiencing', score: 3 },
      { key: 'D', text: 'Guided exercises — show me techniques to practice', score: 2 },
    ],
  },
];

interface ProfileResult {
  profile: string;
  emoji: string;
  title: string;
  description: string;
  approach: string;
}

function getProfile(score: number): ProfileResult {
  if (score <= 8) {
    return {
      profile: 'analytical',
      emoji: '🧠',
      title: 'You are a clear thinker',
      description: 'You process emotions in a structured, direct way.',
      approach: "I'll give you clear guidance and practical steps.",
    };
  }
  if (score <= 11) {
    return {
      profile: 'reflective',
      emoji: '💭',
      title: 'You are a thoughtful person',
      description: 'You take time to understand your feelings.',
      approach: "I'll explore things with you at your own pace.",
    };
  }
  return {
    profile: 'exploratory',
    emoji: '🌊',
    title: 'You are emotionally rich',
    description: 'Your inner world is deep and complex.',
    approach: "I'll be patient and help you discover your own answers.",
  };
}

function ComplexityAssessment(): React.ReactElement {
  const navigate = useNavigate();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAnswer = (score: number) => {
    const newAnswers = [...answers, score];
    setAnswers(newAnswers);

    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setShowResult(true);
    }
  };

  const totalScore = answers.reduce((sum, a) => sum + a, 0);
  const result = getProfile(totalScore);

  const handleComplete = async () => {
    setSaving(true);
    try {
      await api.post('/users/me/complexity', {
        answers,
        complexity_score: totalScore,
        complexity_profile: result.profile,
      });
    } catch { /* noop */ }
    setSaving(false);
    navigate('/dashboard');
  };

  const question = QUESTIONS[currentQ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary bg-noise p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-accent-cyan/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent-violet/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative"
      >
        {!showResult ? (
          <>
            {/* Progress */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold text-text-primary mb-1">
                Help us understand you better 💙
              </h1>
              <p className="text-sm text-text-secondary">
                5 quick questions — no right or wrong answers
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                {QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === currentQ ? 32 : 16,
                      background: i < currentQ ? '#00e5a0' : i === currentQ ? '#9d6fff' : '#1e2d45',
                    }}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.3 }}
                className="glass-card p-8"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge-violet text-xs">{question.title}</span>
                  <span className="text-xs text-text-muted">Q{question.id} of 5</span>
                </div>
                <p className="text-text-primary font-medium mb-6">{question.question}</p>

                <div className="space-y-3">
                  {question.options.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleAnswer(opt.score)}
                      className="w-full text-left px-4 py-3.5 rounded-xl border border-border bg-bg-secondary/50 text-text-secondary text-sm transition-all hover:border-accent-violet/50 hover:bg-accent-violet/5 hover:text-text-primary"
                    >
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-tertiary text-xs font-semibold text-text-muted mr-3 border border-border">
                        {opt.key}
                      </span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center"
          >
            <div className="text-5xl mb-4">{result.emoji}</div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">{result.title}</h2>
            <p className="text-text-secondary mb-2">{result.description}</p>
            <p className="text-accent-green text-sm mb-6">{result.approach}</p>

            <div className="bg-bg-secondary/50 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-text-muted mb-1">Your complexity profile</p>
              <p className="font-semibold text-text-primary capitalize">{result.profile}</p>
              <p className="text-xs text-text-muted mt-1">Score: {totalScore}/15</p>
            </div>

            <button
              onClick={handleComplete}
              disabled={saving}
              className="btn-primary w-full"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
              ) : (
                <>Continue to Dashboard <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default ComplexityAssessment;
