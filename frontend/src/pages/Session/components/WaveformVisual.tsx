import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Music } from 'lucide-react';
import type { AnalysisReading } from '../../../store/sessionStore';

interface WaveformVisualProps {
  getTimeDomainData: () => Uint8Array | null;
  getFrequencyData: () => Uint8Array | null;
  isReady: boolean;
  error: string | null;
  latestReading: AnalysisReading | null;
}

function WaveformVisual({
  getTimeDomainData,
  getFrequencyData,
  isReady,
  error,
  latestReading,
}: WaveformVisualProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (): void => {
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Clear with light background
      ctx.fillStyle = '#f0f4f8';
      ctx.fillRect(0, 0, w, h);

      // Soft grid lines
      ctx.strokeStyle = 'rgba(221,231,239,0.6)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const stressLevel = latestReading?.stress ?? 0;
      // Calm colors: blue when calm, amber when active
      const waveColor = stressLevel < 40 ? '#5b9bd5' : stressLevel < 70 ? '#e8a838' : '#9d8fcc';

      if (isReady) {
        const timeData = getTimeDomainData();
        if (timeData) {
          ctx.strokeStyle = waveColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();

          const sliceWidth = w / timeData.length;
          let x = 0;

          for (let i = 0; i < timeData.length; i++) {
            const v = timeData[i] / 128.0;
            const y = (v * h) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.stroke();

          // Soft glow
          ctx.strokeStyle = `${waveColor}30`;
          ctx.lineWidth = 6;
          ctx.beginPath();
          x = 0;
          for (let i = 0; i < timeData.length; i++) {
            const v = timeData[i] / 128.0;
            const y = (v * h) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.stroke();
        }
      } else {
        const time = Date.now() * 0.002;
        ctx.strokeStyle = `${waveColor}50`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(x * 0.02 + time) * 15 + Math.sin(x * 0.05 + time * 1.5) * 8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [isReady, getTimeDomainData, getFrequencyData, latestReading]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isReady ? (
            <Mic style={{ width: 16, height: 16, color: '#52b788' }} />
          ) : error ? (
            <MicOff style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          ) : (
            <Music style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Your voice</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {isReady ? "I'm listening..." : 'Waiting for microphone'}
        </span>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full" style={{ height: 96 }} />
    </motion.div>
  );
}

export default WaveformVisual;
