import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';

interface Props { onBack: () => void; }

const EMOJIS = ['🌸', '🌿', '🦋', '🌊', '☀️', '🌙', '⭐', '🌺', '🍀', '🌈'];

interface Card { id: number; emoji: string; matched: boolean; flipped: boolean; }

function createDeck(pairs: number): Card[] {
  const selected = EMOJIS.slice(0, pairs);
  const deck = selected.flatMap((emoji, i) => [
    { id: i * 2, emoji, matched: false, flipped: false },
    { id: i * 2 + 1, emoji, matched: false, flipped: false },
  ]);
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

type Difficulty = 'easy' | 'medium' | 'hard';
const DIFFICULTY: Record<Difficulty, { cols: number; pairs: number; label: string }> = {
  easy:   { cols: 4, pairs: 6,  label: '😊 Easy (4×3)'   },
  medium: { cols: 4, pairs: 8,  label: '🎯 Medium (4×4)' },
  hard:   { cols: 5, pairs: 10, label: '🔥 Hard (5×4)'   },
};

function MemoryMatch({ onBack }: Props): React.ReactElement {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  // Lock flipping while checking a pair
  const [isChecking, setIsChecking] = useState(false);

  const startGame = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    setCards(createDeck(DIFFICULTY[diff].pairs));
    setFlippedIds([]);
    setMoves(0);
    setStartTime(Date.now());
    setElapsed(0);
    setGameOver(false);
    setStarted(true);
    setIsChecking(false);
  }, []);

  // Timer
  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [started, gameOver, startTime]);

  // Check game over
  useEffect(() => {
    if (started && cards.length > 0 && cards.every((c) => c.matched)) {
      setGameOver(true);
    }
  }, [cards, started]);

  const handleFlip = useCallback((id: number) => {
    if (isChecking) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;
    // Don't allow flipping a 3rd card
    if (flippedIds.length >= 2) return;

    const newCards = cards.map((c) => c.id === id ? { ...c, flipped: true } : c);
    setCards(newCards);
    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setIsChecking(true);
      const [first, second] = newFlipped.map((fid) => newCards.find((c) => c.id === fid)!);
      if (first.emoji === second.emoji) {
        // Match!
        setTimeout(() => {
          setCards((prev) => prev.map((c) => c.emoji === first.emoji ? { ...c, matched: true, flipped: true } : c));
          setFlippedIds([]);
          setIsChecking(false);
        }, 400);
      } else {
        // No match — flip back after delay
        setTimeout(() => {
          setCards((prev) => prev.map((c) => newFlipped.includes(c.id) ? { ...c, flipped: false } : c));
          setFlippedIds([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  }, [cards, flippedIds, isChecking]);

  const { cols } = DIFFICULTY[difficulty];
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const matchedCount = cards.filter((c) => c.matched).length / 2;
  const totalPairs = DIFFICULTY[difficulty].pairs;

  if (!started) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="flex items-center gap-2 text-text-secondary text-sm mb-6 hover:text-text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Activities
        </button>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center"
          style={{ minHeight: '50vh' }}
        >
          <div className="text-6xl mb-4">🃏</div>
          <h2 className="text-2xl font-bold text-text-primary mb-1">Memory Card Match</h2>
          <p className="text-text-secondary text-sm mb-8">Match the wellness emoji pairs to win!</p>
          <div className="flex flex-col sm:flex-row gap-3">
            {(Object.entries(DIFFICULTY) as [Difficulty, typeof DIFFICULTY[Difficulty]][]).map(([key, val]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => startGame(key)}
                className="btn-primary text-sm py-3 px-6"
              >
                {val.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary text-sm mb-4 hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Activities
      </button>

      <AnimatePresence mode="wait">
        {gameOver ? (
          <motion.div
            key="game-over"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Wonderful!</h2>
            <p className="text-text-secondary mb-1">You matched all {totalPairs} pairs!</p>
            <p className="text-text-muted text-sm mb-8">{moves} moves · {formatTime(elapsed)}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => startGame(difficulty)} className="btn-primary text-sm py-2.5 px-6">
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
              <button onClick={() => setStarted(false)} className="btn-secondary text-sm py-2.5 px-6">
                Change Difficulty
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats bar */}
            <div className="flex items-center justify-between mb-5 glass-card px-4 py-2.5">
              <span className="text-sm text-text-secondary">Moves: <strong className="text-text-primary">{moves}</strong></span>
              <span className="text-sm text-text-secondary">
                Pairs: <strong className="text-text-primary">{matchedCount}/{totalPairs}</strong>
              </span>
              <span className="text-sm font-mono text-text-secondary">{formatTime(elapsed)}</span>
              <button
                onClick={() => startGame(difficulty)}
                className="text-text-muted hover:text-text-secondary transition-colors"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Card grid */}
            <div
              className="grid gap-3 mx-auto"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: cols * 88 }}
            >
              {cards.map((card) => (
                <motion.button
                  key={card.id}
                  onClick={() => handleFlip(card.id)}
                  whileHover={!card.matched && !card.flipped && !isChecking ? { scale: 1.04 } : {}}
                  whileTap={!card.matched && !card.flipped && !isChecking ? { scale: 0.93 } : {}}
                  animate={{
                    rotateY: card.flipped || card.matched ? 180 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className="aspect-square rounded-xl border flex items-center justify-center text-2xl relative"
                  style={{
                    background: card.matched
                      ? 'rgba(82,183,130,0.15)'
                      : card.flipped
                      ? 'rgba(91,155,213,0.12)'
                      : 'var(--bg-sunken)',
                    borderColor: card.matched
                      ? 'rgba(82,183,130,0.4)'
                      : card.flipped
                      ? 'rgba(91,155,213,0.3)'
                      : 'var(--border)',
                    boxShadow: card.matched ? '0 0 12px rgba(82,183,130,0.2)' : 'none',
                    cursor: card.matched || (isChecking && !card.flipped) ? 'default' : 'pointer',
                    minHeight: 64,
                  }}
                >
                  <motion.span
                    animate={{ opacity: card.flipped || card.matched ? 1 : 0, rotateY: card.flipped || card.matched ? 180 : 0 }}
                    transition={{ duration: 0.15, delay: 0.15 }}
                    style={{ display: 'inline-block' }}
                  >
                    {card.flipped || card.matched ? card.emoji : ''}
                  </motion.span>
                  {!card.flipped && !card.matched && (
                    <span style={{ position: 'absolute', fontSize: '1.4rem' }}>❓</span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MemoryMatch;
