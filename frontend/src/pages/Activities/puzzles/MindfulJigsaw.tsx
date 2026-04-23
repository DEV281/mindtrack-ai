import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';

interface Props { onBack: () => void; }

interface PuzzlePiece {
  id: number;
  correctCol: number;
  correctRow: number;
  currentOrder: number; // position in the shuffled array
  color: string;
  placed: boolean;
}

const GRID_SIZE = 3; // 3×3 = 9 pieces (more manageable than 4×4)
const PIECE_SIZE = 88;

// Generate calming gradient colors for puzzle pieces
function generateColors(): string[] {
  const colors: string[] = [];
  const palettes = [
    // Blue-to-purple sweep
    ['hsl(210,55%,38%)', 'hsl(225,50%,42%)', 'hsl(240,48%,46%)',
     'hsl(210,52%,48%)', 'hsl(228,46%,50%)', 'hsl(248,44%,52%)',
     'hsl(200,58%,42%)', 'hsl(220,52%,46%)', 'hsl(260,42%,50%)'],
  ];
  return palettes[0].slice(0, GRID_SIZE * GRID_SIZE);
}

function createPuzzle(): PuzzlePiece[] {
  const colors = generateColors();
  const pieces: PuzzlePiece[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const id = row * GRID_SIZE + col;
      pieces.push({
        id,
        correctCol: col,
        correctRow: row,
        currentOrder: id, // will be shuffled
        color: colors[id],
        placed: false,
      });
    }
  }
  // Shuffle currentOrder using Fisher-Yates
  const orders = pieces.map((_, i) => i);
  for (let i = orders.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orders[i], orders[j]] = [orders[j], orders[i]];
  }
  // Ensure not already solved
  let attempts = 0;
  while (orders.every((o, i) => o === i) && attempts < 10) {
    for (let i = orders.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [orders[i], orders[j]] = [orders[j], orders[i]];
    }
    attempts++;
  }
  return pieces.map((p, i) => ({ ...p, currentOrder: orders[i] }));
}

function MindfulJigsaw({ onBack }: Props): React.ReactElement {
  const [pieces, setPieces] = useState<PuzzlePiece[]>(() => createPuzzle());
  const [selected, setSelected] = useState<number | null>(null); // piece id
  const [moves, setMoves] = useState(0);

  const allPlaced = pieces.every((p) => p.currentOrder === p.id);

  // Click-to-swap mechanic: tap one piece, then tap where you want it placed
  const handleSelect = (id: number) => {
    if (allPlaced) return;
    if (selected === null) {
      setSelected(id);
    } else {
      if (selected === id) {
        setSelected(null);
        return;
      }
      // Swap the currentOrder of the two pieces
      setPieces((prev) => {
        const next = prev.map((p) => ({ ...p }));
        const a = next.find((p) => p.id === selected)!;
        const b = next.find((p) => p.id === id)!;
        const tmp = a.currentOrder;
        a.currentOrder = b.currentOrder;
        b.currentOrder = tmp;
        // Mark placed if correct
        next.forEach((p) => {
          p.placed = p.currentOrder === p.id;
        });
        return next;
      });
      setMoves((m) => m + 1);
      setSelected(null);
    }
  };

  const reset = () => {
    setPieces(createPuzzle());
    setMoves(0);
    setSelected(null);
  };

  // Build grid: for each grid cell (order 0..N), which piece is there?
  const pieceAtOrder = new Map<number, PuzzlePiece>();
  pieces.forEach((p) => pieceAtOrder.set(p.currentOrder, p));

  const placedCount = pieces.filter((p) => p.placed).length;
  const total = GRID_SIZE * GRID_SIZE;

  return (
    <div className="page-container">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary text-sm mb-6 hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Activities
      </button>

      <div className="flex flex-col items-center">
        <h2 className="text-2xl font-bold text-text-primary mb-0.5">🧩 Mindful Jigsaw</h2>
        <p className="text-text-secondary text-sm mb-4">Tap two pieces to swap them into place</p>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-5 glass-card px-4 py-2">
          <span className="text-sm text-text-secondary">Moves: <strong className="text-text-primary">{moves}</strong></span>
          <span className="text-sm text-text-secondary">Placed: <strong className="text-text-primary">{placedCount}/{total}</strong></span>
          <button onClick={reset} className="flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors ml-auto">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        <AnimatePresence mode="wait">
          {allPlaced ? (
            <motion.div
              key="solved"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="text-5xl mb-3">🎨</div>
              <h3 className="text-xl font-bold text-text-primary mb-1">Beautiful work!</h3>
              <p className="text-text-secondary text-sm mb-6">Completed in {moves} moves</p>
              <div className="flex gap-3 justify-center">
                <button onClick={reset} className="btn-primary text-sm py-2.5 px-6">
                  <RotateCcw className="w-4 h-4" /> Play Again
                </button>
                <button onClick={onBack} className="btn-secondary text-sm py-2.5 px-5">Back</button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="puzzle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Reference label */}
              <p className="text-xs text-text-muted text-center mb-2">Numbers show correct position</p>
              
              <div
                className="grid rounded-xl overflow-hidden border"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${GRID_SIZE}, ${PIECE_SIZE}px)`,
                  gridTemplateRows: `repeat(${GRID_SIZE}, ${PIECE_SIZE}px)`,
                  gap: 3,
                  background: 'var(--bg-sunken)',
                  padding: 3,
                  borderColor: 'var(--border)',
                }}
              >
                {Array.from({ length: total }).map((_, order) => {
                  const piece = pieceAtOrder.get(order)!;
                  const isSelected = selected === piece.id;
                  const isPlaced = piece.placed;
                  const correctLabel = piece.id + 1;

                  return (
                    <motion.button
                      key={`${order}-${piece.id}`}
                      onClick={() => !isPlaced && handleSelect(piece.id)}
                      whileHover={!isPlaced ? { scale: 1.03, zIndex: 10 } : {}}
                      whileTap={!isPlaced ? { scale: 0.95 } : {}}
                      animate={{
                        scale: isSelected ? 1.06 : 1,
                        boxShadow: isSelected
                          ? '0 0 0 3px rgba(91,155,213,0.7), 0 4px 12px rgba(0,0,0,0.3)'
                          : isPlaced
                          ? '0 0 0 2px rgba(82,183,130,0.5)'
                          : '0 1px 4px rgba(0,0,0,0.15)',
                      }}
                      transition={{ duration: 0.18 }}
                      style={{
                        width: PIECE_SIZE,
                        height: PIECE_SIZE,
                        background: piece.color,
                        cursor: isPlaced ? 'default' : 'pointer',
                        position: 'relative',
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: isSelected ? 10 : 1,
                      }}
                    >
                      {isPlaced ? (
                        <span style={{ fontSize: 20, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>✓</span>
                      ) : (
                        <span style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.55)',
                          userSelect: 'none',
                        }}>
                          {correctLabel}
                        </span>
                      )}
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          inset: -2,
                          border: '2.5px solid rgba(91,155,213,0.8)',
                          borderRadius: 8,
                          pointerEvents: 'none',
                        }} />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {selected !== null && (
                <p className="text-xs text-primary text-center mt-3 font-medium" style={{ color: 'var(--primary)' }}>
                  ✓ Piece #{selected + 1} selected — tap another to swap
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default MindfulJigsaw;
