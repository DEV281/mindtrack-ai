/**
 * VoiceWaveformInput — Real-time frequency-bar visualizer shown while
 * the patient is speaking into the microphone.
 *
 * Renders 32 frequency bars on a canvas, colored green when calm and
 * amber when loud.  Displays the live interim transcript below the bars.
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceWaveformInputProps {
  /** AnalyserNode from useMicrophone hook */
  analyser: AnalyserNode | null;
  /** Whether the mic is actively listening */
  isActive: boolean;
  /** Live interim transcript text */
  interimText: string;
}

const BAR_COUNT = 32;
const CANVAS_HEIGHT = 48;

export function VoiceWaveformInput({
  analyser,
  isActive,
  interimText,
}: VoiceWaveformInputProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive || !analyser) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const binSize = Math.floor(analyser.frequencyBinCount / BAR_COUNT);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width - (BAR_COUNT - 1) * 2) / BAR_COUNT;

      for (let i = 0; i < BAR_COUNT; i++) {
        // Average the frequency bin range for this bar
        let sum = 0;
        for (let j = 0; j < binSize; j++) {
          sum += dataArray[i * binSize + j];
        }
        const avg = sum / binSize;
        const barHeight = Math.max(2, (avg / 255) * height);

        // Color: green when calm (< 128), amber when loud (>= 128)
        const color = avg < 128 ? '#00e5a0' : '#ffb020';
        ctx.fillStyle = color;

        const x = i * (barWidth + 2);
        const y = height - barHeight;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, analyser]);

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = CANVAS_HEIGHT;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            overflow: 'hidden',
            marginBottom: 8,
            borderRadius: 10,
            background: 'rgba(0,229,160,0.04)',
            border: '1px solid rgba(0,229,160,0.1)',
            padding: '8px 12px',
          }}
        >
          <canvas
            ref={canvasRef}
            height={CANVAS_HEIGHT}
            style={{ width: '100%', display: 'block' }}
          />
          {interimText && (
            <p
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.45)',
                fontStyle: 'italic',
                marginTop: 6,
                marginBottom: 0,
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
              }}
            >
              {interimText}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VoiceWaveformInput;
