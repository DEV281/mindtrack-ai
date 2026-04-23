import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Send,
  Heart,
  User as UserIcon,
  Activity,
  Mic,
} from 'lucide-react';
import useSessionStore from '../../../store/sessionStore';
import type { AnalysisReading } from '../../../store/sessionStore';

interface AIChatProps {
  latestReading: AnalysisReading | null;
  isActive: boolean;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
  type?: 'question' | 'answer-options' | 'result';
  options?: { label: string; value: number }[];
  questionIndex?: number;
}

const CHECKIN_QUESTIONS = [
  'Have you found it hard to enjoy things you usually like?',
  'Have you been feeling low or discouraged?',
  'Having trouble sleeping, or sleeping more than usual?',
  'Feeling more tired than normal?',
  'Changes in appetite — eating more or less than usual?',
  'Being hard on yourself or feeling like you let others down?',
  'Finding it difficult to concentrate on reading or watching TV?',
  'Moving more slowly — or feeling fidgety and restless?',
  'Having thoughts that life feels too heavy?',
  'Feeling nervous or on edge?',
  'Not being able to stop or control worrying?',
  'Worrying about too many different things?',
  'Having trouble relaxing?',
  'Being so restless that it is hard to sit still?',
  'Getting easily annoyed or irritable?',
  'Feeling afraid, as if something bad might happen?',
  'Have you had thoughts of harming yourself?',
];

const ANSWER_OPTIONS = [
  { label: 'Not at all', value: 0 },
  { label: 'A few days', value: 1 },
  { label: 'Often', value: 2 },
  { label: 'Nearly every day', value: 3 },
];

const COPING_STRATEGIES = [
  { trigger: ['stressed', 'stress'], response: '🧘 **Let\'s try box breathing together**: Breathe in 4s → Hold 4s → Breathe out 4s → Hold 4s. Repeat 4 times.' },
  { trigger: ['anxious', 'anxiety', 'panic'], response: '🌱 **5-4-3-2-1 Grounding**: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.' },
  { trigger: ['sad', 'depressed'], response: '💡 **Positive reframing**: Write down what\'s bothering you, then ask — is there another way to look at this?' },
  { trigger: ['tired', 'exhausted'], response: '🧠 **Muscle relaxation**: Squeeze each muscle for 5 seconds, then release. Start with your toes and work up.' },
  { trigger: ['help', 'crisis'], response: '💙 If you need support right now:\n\n• **988 Lifeline**: Call or text **988**\n• **Crisis Text Line**: Text **HOME** to **741741**\n• **Emergency**: Call **911**\n\nYou are not alone. Help is available 24/7.' },
];

function getStressWord(stress: number): string {
  if (stress < 30) return 'calm';
  if (stress < 50) return 'a little tense';
  if (stress < 70) return 'somewhat stressed';
  return 'quite stressed';
}

function AIChat({ latestReading, isActive }: AIChatProps): React.ReactElement {
  const chatMode = useSessionStore((s) => s.chatMode);
  const setChatMode = useSessionStore((s) => s.setChatMode);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [consultAnswers, setConsultAnswers] = useState<number[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [consultComplete, setConsultComplete] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAutoMessageRef = useRef(0);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Mode 1: Live Analysis — auto-messages every ~16s
  useEffect(() => {
    if (chatMode !== 'live' || !isActive || !latestReading) return;

    const now = Date.now();
    if (now - lastAutoMessageRef.current < 16000) return;
    lastAutoMessageRef.current = now;

    const risk = latestReading.overall_risk;
    let message = '';

    if (risk < 30) {
      message = `😌 You seem calm and centered right now. Keep it up!`;
    } else if (risk < 50) {
      message = `🌱 You seem ${getStressWord(latestReading.stress)}. Maybe take a moment to stretch or breathe.`;
    } else if (risk < 70) {
      message = `🧘 Things feel a bit unsettled. Let's try the 5-4-3-2-1 grounding technique together.`;
    } else {
      message = `💙 I notice you might be struggling. Let's try box breathing: Breathe in 4s → Hold 4s → Out 4s → Hold 4s.`;
    }

    addMessage('assistant', message);
  }, [chatMode, isActive, latestReading]);

  // Mode 2: Check-in — start with first question
  useEffect(() => {
    if (chatMode === 'consult' && messages.length === 0) {
      startConsultation();
    }
  }, [chatMode]);

  const startConsultation = (): void => {
    setConsultAnswers([]);
    setCurrentQuestionIdx(0);
    setConsultComplete(false);
    setMessages([
      {
        id: genId(),
        role: 'assistant',
        content: '👋 Hi! I\'d like to check in with you. I\'ll ask a few questions to understand how you\'ve been feeling recently. Take your time with each one.',
        timestamp: Date.now(),
      },
    ]);
    setTimeout(() => askQuestion(0), 800);
  };

  const askQuestion = (idx: number): void => {
    if (idx >= CHECKIN_QUESTIONS.length) {
      finishConsultation();
      return;
    }
    const section = idx < 9 ? 'Mood' : idx < 16 ? 'Feelings' : 'Safety';
    addMessage('assistant', `**Question ${idx + 1}/${CHECKIN_QUESTIONS.length}:**\n\n${CHECKIN_QUESTIONS[idx]}`, 'question');
    addMessage('assistant', '', 'answer-options', ANSWER_OPTIONS, idx);
  };

  const handleConsultAnswer = (questionIdx: number, value: number): void => {
    const newAnswers = [...consultAnswers];
    newAnswers[questionIdx] = value;
    setConsultAnswers(newAnswers);

    const label = ANSWER_OPTIONS.find((o) => o.value === value)?.label || '';
    addMessage('user', label);

    // Safety question
    if (questionIdx === 16 && value > 0) {
      addMessage(
        'assistant',
        '💙 **Thank you for being honest.** Please reach out for support:\n\n' +
        '• **988 Lifeline**: Call or text **988**\n' +
        '• **Crisis Text Line**: Text **HOME** to **741741**\n' +
        '• **Emergency**: Call **911**\n\n' +
        'You are not alone. Help is available 24/7.'
      );
    }

    const nextIdx = questionIdx + 1;
    setCurrentQuestionIdx(nextIdx);
    setTimeout(() => askQuestion(nextIdx), 600);
  };

  const finishConsultation = (): void => {
    setConsultComplete(true);
    const moodScore = consultAnswers.slice(0, 9).reduce((a, b) => a + (b || 0), 0);
    const worryScore = consultAnswers.slice(9, 16).reduce((a, b) => a + (b || 0), 0);

    const moodLevel = moodScore <= 4 ? 'Looking good' : moodScore <= 9 ? 'Slight changes' : moodScore <= 14 ? 'Moderate' : moodScore <= 19 ? 'Higher than usual' : 'Needs attention';
    const worryLevel = worryScore <= 4 ? 'Calm' : worryScore <= 9 ? 'Mild worrying' : worryScore <= 14 ? 'Moderate' : 'Significant';

    addMessage(
      'assistant',
      `🌟 **Your Check-in Results:**\n\n` +
      `**Mood patterns**: ${moodLevel}\n` +
      `**Worry patterns**: ${worryLevel}\n\n` +
      `**What might help:**\n` +
      (moodScore <= 9 && worryScore <= 9
        ? '• Keep doing what you\'re doing — you\'re on a good path\n• Stay active and maintain your routines\n• Continue healthy sleep habits'
        : moodScore <= 14 || worryScore <= 14
          ? '• Consider talking to someone you trust\n• Try daily relaxation or breathing exercises\n• Keep an eye on how you feel this week'
          : '• We strongly suggest speaking with a professional\n• Daily self-care routines could help\n• Remember, asking for help is a sign of strength'),
      'result'
    );
  };

  const addMessage = (
    role: 'assistant' | 'user',
    content: string,
    type?: string,
    options?: { label: string; value: number }[],
    questionIndex?: number
  ): void => {
    setMessages((prev) => [
      ...prev,
      {
        id: genId(),
        role,
        content,
        timestamp: Date.now(),
        type: type as ChatMessage['type'],
        options,
        questionIndex,
      },
    ]);
  };

  // Mode 3: Free Chat
  const handleSend = (): void => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    addMessage('user', userMsg);
    setInput('');

    const lower = userMsg.toLowerCase();
    let response = '';

    for (const strategy of COPING_STRATEGIES) {
      if (strategy.trigger.some((t) => lower.includes(t))) {
        response = strategy.response;
        break;
      }
    }

    if (!response) {
      if (chatMode === 'live') {
        response = `I'm here with you. Right now you seem ${getStressWord(latestReading?.stress ?? 0)}. ${
          latestReading && latestReading.stress > 50
            ? 'Would you like to try a calming exercise?'
            : 'Keep up the good work!'
        }`;
      } else {
        const responses = [
          'I hear you. Can you tell me more about what you\'re experiencing right now?',
          'Thank you for sharing. How long have you been feeling this way?',
          'That sounds challenging. What helps you feel better usually?',
          'It\'s wonderful that you\'re paying attention to your feelings.',
          'Would you like to try a brief breathing exercise together?',
          'Remember, these feelings are temporary. You\'re not alone in this.',
        ];
        response = responses[Math.floor(Math.random() * responses.length)];
      }
    }

    setTimeout(() => addMessage('assistant', response), 500);
  };

  const modes = [
    { key: 'live' as const, label: '💬 Chat', icon: Activity },
    { key: 'consult' as const, label: '📋 Check-in', icon: MessageCircle },
    { key: 'free' as const, label: '🎙 Voice', icon: Mic },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card flex flex-col h-[600px] xl:h-full"
    >
      {/* Mode Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {modes.map((mode) => (
          <button
            key={mode.key}
            onClick={() => {
              setChatMode(mode.key);
              if (mode.key === 'consult') startConsultation();
              else setMessages([]);
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '12px 0',
              fontSize: 14,
              fontWeight: chatMode === mode.key ? 700 : 500,
              color: chatMode === mode.key ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: chatMode === mode.key ? '2px solid var(--primary)' : '2px solid transparent',
              background: chatMode === mode.key ? 'var(--primary-light)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'Nunito, sans-serif',
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }} className="space-y-3">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.type === 'answer-options' && msg.options ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: '90%' }}>
                  {msg.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() =>
                        msg.questionIndex !== undefined &&
                        handleConsultAnswer(msg.questionIndex, opt.value)
                      }
                      disabled={
                        msg.questionIndex !== undefined &&
                        consultAnswers[msg.questionIndex] !== undefined
                      }
                      style={{
                        padding: '6px 14px',
                        borderRadius: 50,
                        fontSize: 12,
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        background:
                          msg.questionIndex !== undefined && consultAnswers[msg.questionIndex] === opt.value
                            ? 'var(--primary-light)'
                            : msg.questionIndex !== undefined && consultAnswers[msg.questionIndex] !== undefined
                              ? 'var(--bg-sunken)'
                              : 'white',
                        color:
                          msg.questionIndex !== undefined && consultAnswers[msg.questionIndex] === opt.value
                            ? 'var(--primary)'
                            : msg.questionIndex !== undefined && consultAnswers[msg.questionIndex] !== undefined
                              ? 'var(--text-hint)'
                              : 'var(--text-secondary)',
                        border: `1.5px solid ${
                          msg.questionIndex !== undefined && consultAnswers[msg.questionIndex] === opt.value
                            ? 'var(--primary)'
                            : 'var(--border)'
                        }`,
                        cursor:
                          msg.questionIndex !== undefined && consultAnswers[msg.questionIndex] !== undefined
                            ? 'not-allowed'
                            : 'pointer',
                        fontFamily: 'Nunito, sans-serif',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 16px',
                    borderRadius: 18,
                    fontSize: 14,
                    lineHeight: 1.7,
                    ...(msg.role === 'user'
                      ? {
                          background: 'linear-gradient(135deg, #5b9bd5, #7ab4e8)',
                          color: 'white',
                          borderBottomRightRadius: 6,
                        }
                      : msg.type === 'result'
                        ? {
                            background: 'var(--green-light)',
                            border: '1px solid rgba(82,183,136,0.25)',
                            color: 'var(--text-primary)',
                            borderBottomLeftRadius: 6,
                          }
                        : {
                            background: 'white',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            borderBottomLeftRadius: 6,
                          }),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {msg.role === 'assistant' ? (
                      <Heart style={{ width: 14, height: 14, color: '#d4829a' }} />
                    ) : (
                      <UserIcon style={{ width: 14, height: 14, color: 'white', opacity: 0.7 }} />
                    )}
                    <span style={{
                      fontSize: 11,
                      color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                    }}>
                      {msg.role === 'assistant' ? 'Your Companion' : 'You'}
                    </span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {chatMode !== 'consult' && (
        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={
                chatMode === 'live'
                  ? 'How are you feeling?...'
                  : "Tell me what's on your mind..."
              }
              className="input-field"
              style={{ fontSize: 14, padding: '10px 16px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="btn-primary"
              style={{ padding: '10px 16px' }}
            >
              <Send style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {chatMode === 'consult' && !consultComplete && (
        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>Progress:</span>
            <div style={{ flex: 1, height: 6, background: 'var(--bg-sunken)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${(currentQuestionIdx / 17) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(135deg, #5b9bd5, #7ab4e8)',
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace" }}>{currentQuestionIdx}/17</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default AIChat;
