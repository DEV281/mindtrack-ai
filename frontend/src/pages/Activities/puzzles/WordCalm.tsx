import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Delete } from 'lucide-react';

interface Props { onBack: () => void; }

const WORD_LIST = [
  'PEACE', 'CALM', 'SERENE', 'GRACE', 'BLOOM',
  'TRUST', 'BRAVE', 'LIGHT', 'DREAM', 'BLISS',
  'SMILE', 'HEALS', 'LOVED', 'FRESH', 'ALIVE',
  'HAPPY', 'RELAX', 'VITAL', 'RENEW', 'CLEAR',
];

type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

interface Guess {
  word: string;
  statuses: LetterStatus[];
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
];

function getStatusBg(status: LetterStatus): string {
  switch (status) {
    case 'correct': return 'rgba(82,183,130,0.85)';
    case 'present': return 'rgba(232,168,56,0.85)';
    case 'absent':  return 'rgba(100,116,139,0.7)';
    default:        return 'transparent';
  }
}

function WordCalm({ onBack }: Props): React.ReactElement {
  const [answer] = useState(() => WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [current, setCurrent] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [usedLetters, setUsedLetters] = useState<Record<string, LetterStatus>>({});
  const [shakeRow, setShakeRow] = useState<number | null>(null);
  const maxGuesses = 6;

  const checkGuess = useCallback((word: string): LetterStatus[] => {
    const statuses: LetterStatus[] = Array(5).fill('absent');
    const remaining = answer.split('');

    // First pass: correct positions
    for (let i = 0; i < 5; i++) {
      if (word[i] === answer[i]) {
        statuses[i] = 'correct';
        remaining[i] = '_';
      }
    }
    // Second pass: present but wrong position
    for (let i = 0; i < 5; i++) {
      if (statuses[i] !== 'correct') {
        const idx = remaining.indexOf(word[i]);
        if (idx !== -1) {
          statuses[i] = 'present';
          remaining[idx] = '_';
        }
      }
    }
    return statuses;
  }, [answer]);

  const submitGuess = useCallback(() => {
    if (current.length !== 5 || gameState !== 'playing') return;
    const statuses = checkGuess(current);
    const newGuess: Guess = { word: current, statuses };
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);

    // Update used letters (higher priority: correct > present > absent)
    const newUsed = { ...usedLetters };
    for (let i = 0; i < 5; i++) {
      const letter = current[i];
      const s = statuses[i];
      if (!newUsed[letter] || s === 'correct' || (s === 'present' && newUsed[letter] === 'absent')) {
        newUsed[letter] = s;
      }
    }
    setUsedLetters(newUsed);

    if (current === answer) {
      setGameState('won');
    } else if (newGuesses.length >= maxGuesses) {
      setGameState('lost');
    }
    setCurrent('');
  }, [current, gameState, guesses, answer, checkGuess, usedLetters]);

  const handleKey = useCallback((key: string) => {
    if (gameState !== 'playing') return;
    if (key === 'DEL' || key === 'BACKSPACE') {
      setCurrent((p) => p.slice(0, -1));
    } else if (key === 'ENTER' || key === 'RETURN') {
      if (current.length < 5) {
        // Shake current row
        setShakeRow(guesses.length);
        setTimeout(() => setShakeRow(null), 600);
        return;
      }
      submitGuess();
    } else if (/^[A-Za-z]$/.test(key) && current.length < 5) {
      setCurrent((p) => p + key.toUpperCase());
    }
  }, [gameState, current, submitGuess, guesses.length]);

  // Physical keyboard support
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      handleKey(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleKey]);

  const getKeyBg = (key: string): string => {
    if (key === 'ENTER' || key === 'DEL') return 'var(--bg-sunken)';
    const status = usedLetters[key];
    if (status) return getStatusBg(status);
    return 'var(--bg-sunken)';
  };

  const startNewGame = () => {
    window.location.reload(); // Simple reset: reload page
  };

  return (
    <div className="page-container">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary text-sm mb-6 hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Activities
      </button>

      <div className="flex flex-col items-center">
        <h2 className="text-2xl font-bold text-text-primary mb-0.5">🔤 Word Calm</h2>
        <p className="text-text-secondary text-sm mb-6">Guess the positive {answer.length}-letter word in {maxGuesses} tries</p>

        {/* Guess Grid */}
        <div className="space-y-2 mb-6">
          {Array.from({ length: maxGuesses }).map((_, rowIdx) => {
            const guess = guesses[rowIdx];
            const isCurrentRow = rowIdx === guesses.length && gameState === 'playing';
            const isShaking = shakeRow === rowIdx;
            return (
              <motion.div
                key={rowIdx}
                className="flex gap-2"
                animate={isShaking ? { x: [0, -8, 8, -6, 6, -4, 4, 0] } : {}}
                transition={{ duration: 0.5 }}
              >
                {Array.from({ length: 5 }).map((_, colIdx) => {
                  let letter = '';
                  let bg = 'var(--bg-sunken)';
                  let border = 'var(--border)';
                  let textColor = 'var(--text-primary)';

                  if (guess) {
                    letter = guess.word[colIdx];
                    bg = getStatusBg(guess.statuses[colIdx]);
                    border = bg;
                    textColor = '#fff';
                  } else if (isCurrentRow && colIdx < current.length) {
                    letter = current[colIdx];
                    border = 'var(--primary)';
                  }

                  return (
                    <motion.div
                      key={colIdx}
                      initial={false}
                      animate={
                        guess
                          ? {
                              rotateX: [0, -90, 0],
                              backgroundColor: [bg, bg],
                            }
                          : {}
                      }
                      transition={{ delay: colIdx * 0.12, duration: 0.4 }}
                      className="w-12 h-12 flex items-center justify-center rounded-lg border-2 font-bold text-lg select-none"
                      style={{
                        background: bg,
                        borderColor: border,
                        color: textColor,
                        minWidth: 48,
                      }}
                    >
                      {letter}
                    </motion.div>
                  );
                })}
              </motion.div>
            );
          })}
        </div>

        {/* Game Over Banner */}
        <AnimatePresence>
          {gameState !== 'playing' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 text-center mb-6 w-full max-w-xs"
            >
              {gameState === 'won' ? (
                <>
                  <p className="text-2xl mb-1">🎉</p>
                  <p className="font-bold text-text-primary mb-0.5">Wonderful!</p>
                  <p className="text-text-secondary text-sm">You found the word in {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}</p>
                </>
              ) : (
                <>
                  <p className="text-2xl mb-1">💙</p>
                  <p className="font-bold text-text-primary mb-0.5">That's okay!</p>
                  <p className="text-text-secondary text-sm">The word was <strong className="text-text-primary">{answer}</strong></p>
                </>
              )}
              <div className="flex gap-2 justify-center mt-3">
                <button onClick={startNewGame} className="btn-primary text-xs py-2 px-4">Play Again</button>
                <button onClick={onBack} className="btn-secondary text-xs py-2 px-4">Back</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* On-screen Keyboard */}
        {gameState === 'playing' && (
          <div className="space-y-1.5">
            {KEYBOARD_ROWS.map((row, i) => (
              <div key={i} className="flex gap-1 justify-center">
                {row.map((key) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleKey(key)}
                    className="rounded-lg text-xs font-bold select-none transition-colors"
                    style={{
                      background: getKeyBg(key),
                      color: usedLetters[key] ? '#fff' : 'var(--text-primary)',
                      padding: key.length > 1 ? '10px 10px' : '10px 13px',
                      minWidth: key.length > 1 ? 54 : 34,
                      border: '1px solid var(--border)',
                    }}
                  >
                    {key === 'DEL' ? <Delete className="w-4 h-4 mx-auto" /> : key}
                  </motion.button>
                ))}
              </div>
            ))}
          </div>
        )}

        {gameState === 'playing' && (
          <p className="text-text-muted text-xs mt-4 text-center">
            💡 Type with your keyboard or tap the letters above
          </p>
        )}
      </div>
    </div>
  );
}

export default WordCalm;
