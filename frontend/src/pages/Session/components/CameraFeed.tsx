import { useRef, useEffect, RefObject } from 'react';
import { motion } from 'framer-motion';
import { Camera, CameraOff, FlipHorizontal } from 'lucide-react';
import type { AnalysisReading } from '../../../store/sessionStore';

interface CameraFeedProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  error: string | null;
  isMirrored: boolean;
  toggleMirror: () => void;
  latestReading: AnalysisReading | null;
  modelRank: number;
  isActive: boolean;
}

function CameraFeed({
  videoRef,
  isReady,
  error,
  isMirrored,
  toggleMirror,
  latestReading,
  modelRank,
  isActive,
}: CameraFeedProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  // Canvas HUD overlay — calm style
  useEffect(() => {
    if (!isReady || !canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawOverlay = (): void => {
      const video = videoRef.current;
      if (!video) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // Face bounding box — soft blue
      const faceX = w * 0.25;
      const faceY = h * 0.1;
      const faceW = w * 0.5;
      const faceH = h * 0.7;

      ctx.strokeStyle = 'rgba(91, 155, 213, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      // Corner brackets — soft
      const cornerLen = 24;
      ctx.beginPath();
      ctx.moveTo(faceX, faceY + cornerLen);
      ctx.lineTo(faceX, faceY);
      ctx.lineTo(faceX + cornerLen, faceY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(faceX + faceW - cornerLen, faceY);
      ctx.lineTo(faceX + faceW, faceY);
      ctx.lineTo(faceX + faceW, faceY + cornerLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(faceX, faceY + faceH - cornerLen);
      ctx.lineTo(faceX, faceY + faceH);
      ctx.lineTo(faceX + cornerLen, faceY + faceH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(faceX + faceW - cornerLen, faceY + faceH);
      ctx.lineTo(faceX + faceW, faceY + faceH);
      ctx.lineTo(faceX + faceW, faceY + faceH - cornerLen);
      ctx.stroke();

      // Emotion chip above face — white card style
      if (latestReading) {
        const topEmotion = getTopEmotion(latestReading.emotions as unknown as Record<string, number>);
        ctx.font = 'bold 13px Nunito, sans-serif';
        const emotionLabel = friendlyEmotion(topEmotion.name);
        const textWidth = ctx.measureText(emotionLabel).width;
        const chipX = faceX + (faceW - textWidth - 20) / 2;

        // White chip background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.roundRect(chipX, faceY - 30, textWidth + 20, 24, 12);
        ctx.fill();

        // Colored dot
        ctx.fillStyle = 'rgba(91, 155, 213, 0.8)';
        ctx.beginPath();
        ctx.arc(chipX + 10, faceY - 18, 4, 0, Math.PI * 2);
        ctx.fill();

        // Emotion text
        ctx.fillStyle = '#2c3e50';
        ctx.fillText(emotionLabel, chipX + 18, faceY - 13);
      }

      animFrameRef.current = requestAnimationFrame(drawOverlay);
    };

    animFrameRef.current = requestAnimationFrame(drawOverlay);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isReady, latestReading, videoRef]);

  if (error) {
    return (
      <div
        className="glass-card"
        style={{
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 320,
        }}
      >
        <CameraOff style={{ width: 48, height: 48, color: 'var(--text-muted)', marginBottom: 12 }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center' }}>
          Camera access needed — click allow above
        </p>
        <p style={{ color: 'var(--text-hint)', fontSize: 12, marginTop: 8 }}>
          We'll continue without video for now
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card overflow-hidden relative"
      style={{ borderRadius: 24 }}
    >
      {/* Top Bar — simple, calm */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.7), transparent)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
          Reading your expressions...
        </span>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isActive ? '#52b788' : 'var(--text-muted)',
          }}
        />
      </div>

      {/* Video */}
      <div className="relative" style={{ aspectRatio: '4/3', background: 'var(--bg-sunken)' }}>
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none ${isMirrored ? 'scale-x-[-1]' : ''}`}
        />

        {/* Mirror Toggle */}
        <button
          onClick={toggleMirror}
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            zIndex: 10,
            padding: 8,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          title="Flip camera"
        >
          <FlipHorizontal className="w-4 h-4" />
        </button>

        {/* Loading state */}
        {!isReady && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-sunken)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 8 }}>📷</span>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                Your camera will start when you begin a session
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function getTopEmotion(emotions: Record<string, number>): { name: string; value: number } {
  let topName = 'neutral';
  let topValue = 0;
  for (const [name, value] of Object.entries(emotions)) {
    if (value > topValue) {
      topName = name;
      topValue = value;
    }
  }
  return { name: topName, value: topValue };
}

function friendlyEmotion(emotion: string): string {
  const map: Record<string, string> = {
    neutral: 'Calm',
    happy: 'Happy',
    tense: 'Thoughtful',
    anxious: 'Worried',
    sad: 'Reflective',
    fear: 'Uneasy',
    surprised: 'Surprised',
  };
  return map[emotion.toLowerCase()] || 'Calm';
}

export default CameraFeed;
