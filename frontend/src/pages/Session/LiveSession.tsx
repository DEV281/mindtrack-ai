import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Clock, ChevronDown } from 'lucide-react';
import CameraFeed from './components/CameraFeed';
import WaveformVisual from './components/WaveformVisual';
import StressMeters from './components/StressMeters';
import RiskGauge from './components/RiskGauge';
import AIChat from './components/AIChat';
import AlertsPanel from './components/AlertsPanel';
import { useCamera } from '../../hooks/useCamera';
import { useMicrophone } from '../../hooks/useMicrophone';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useSession } from '../../hooks/useSession';
import { useSpeechOutput } from '../../hooks/useSpeechOutput';
import useSessionStore from '../../store/sessionStore';
import toast from 'react-hot-toast';

const MODE_OPTIONS = [
  { rank: 1, emoji: '✨', label: 'Best', desc: 'Our most careful and thorough analysis. Recommended for your sessions.' },
  { rank: 2, emoji: '⚡', label: 'Better', desc: 'A great balance of speed and accuracy. Works well on most devices.' },
  { rank: 3, emoji: '🌿', label: 'Good', desc: 'Lighter on your device. Great if things feel a little slow.' },
];

function LiveSession(): React.ReactElement {
  const { startSession, stopSession, isActive, formattedDuration } = useSession();
  const { videoRef, stream, isReady: cameraReady, error: cameraError, isMirrored, toggleMirror, captureFrame } = useCamera();
  const { isReady: micReady, error: micError, getTimeDomainData, getFrequencyData } = useMicrophone(stream);

  const sessionId = useSessionStore((s) => s.sessionId);
  const latestReading = useSessionStore((s) => s.latestReading);
  const readings = useSessionStore((s) => s.readings);
  const modelRank = useSessionStore((s) => s.modelRank);
  const setModelRank = useSessionStore((s) => s.setModelRank);

  const { isConnected, send } = useWebSocket({ sessionId: isActive ? sessionId : null });

  const { speak, settings: voiceSettings } = useSpeechOutput();

  const [showModelSelect, setShowModelSelect] = useState(false);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAlertTimeRef = useRef(0);
  const sessionAnnouncedRef = useRef(false);

  // Send frames every 2 seconds when active
  useEffect(() => {
    if (isActive && isConnected && cameraReady) {
      frameIntervalRef.current = setInterval(() => {
        const frame = captureFrame();
        if (frame) {
          send({ type: 'frame', data: { video: frame, timestamp: Date.now() } });
        }
      }, 2000);
    }

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [isActive, isConnected, cameraReady, captureFrame, send]);

  // Voice feedback: session start
  useEffect(() => {
    if (isActive && !sessionAnnouncedRef.current && voiceSettings.autoSpeak) {
      sessionAnnouncedRef.current = true;
      const modeLabel = MODE_OPTIONS.find((m) => m.rank === modelRank)?.label || 'Best';
      speak(`Your wellness session has started. ${modeLabel} mode is active. I'm here with you.`);
    }
    if (!isActive) {
      sessionAnnouncedRef.current = false;
    }
  }, [isActive, modelRank, speak, voiceSettings.autoSpeak]);

  // Voice feedback: stress nudges
  useEffect(() => {
    if (!latestReading || !voiceSettings.autoSpeak || !isActive) return;
    const now = Date.now();
    if (now - lastAlertTimeRef.current < 30000) return;

    const stress = latestReading.stress;
    if (stress >= 70) {
      lastAlertTimeRef.current = now;
      speak('I notice you might be feeling tense. Let\'s take a deep breath together.');
    } else if (stress >= 50) {
      lastAlertTimeRef.current = now;
      speak('You seem a little tense. Remember, it\'s okay to take a moment for yourself.');
    }
  }, [latestReading, voiceSettings.autoSpeak, isActive, speak]);

  const handleStart = async (): Promise<void> => {
    await startSession();
  };

  const handleStop = async (): Promise<void> => {
    if (voiceSettings.autoSpeak && readings.length > 0) {
      const avg = readings.reduce((acc, r) => acc + (r.stress || 0), 0) / readings.length;
      const level = avg >= 70 ? 'a tough' : avg >= 40 ? 'a moderate' : 'a calm';
      speak(`Session complete. You had ${level} session. Remember, every session is progress.`);
    }
    await stopSession();
  };

  const handleModeSwitch = (rank: number): void => {
    setModelRank(rank);
    setShowModelSelect(false);
    const mode = MODE_OPTIONS.find((m) => m.rank === rank);
    toast.success(`${mode?.emoji} Switched to ${mode?.label} analysis mode`);
  };

  const activeMode = MODE_OPTIONS.find((m) => m.rank === modelRank) || MODE_OPTIONS[0];

  return (
    <div className="page-container pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Your Wellness Session</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            We're here with you
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelect(!showModelSelect)}
              className="btn-secondary text-sm py-2 px-4"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {activeMode.emoji} {activeMode.label}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showModelSelect && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 8,
                  width: 280,
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: 8,
                  zIndex: 50,
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', padding: '8px 12px' }}>
                  Choose your analysis depth
                </p>
                {MODE_OPTIONS.map((m) => (
                  <button
                    key={m.rank}
                    onClick={() => handleModeSwitch(m.rank)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 12,
                      fontSize: 14,
                      transition: 'background 0.2s',
                      background: modelRank === m.rank ? 'var(--primary-light)' : 'transparent',
                      color: modelRank === m.rank ? 'var(--primary)' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{m.emoji} {m.label}</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 text-sm">
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isConnected ? '#52b788' : 'var(--text-muted)',
              }}
            />
            <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-secondary)' }}>{formattedDuration}</span>
          </div>

          {/* Session Controls */}
          {!isActive ? (
            <button onClick={handleStart} className="btn-primary py-2 px-6">
              <Play className="w-4 h-4" /> Begin My Session
            </button>
          ) : (
            <button onClick={handleStop} className="btn-danger py-2 px-6">
              <Square className="w-4 h-4" /> End Session
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Column: Camera + Waveform */}
        <div className="xl:col-span-5 space-y-4">
          <CameraFeed
            videoRef={videoRef}
            isReady={cameraReady}
            error={cameraError}
            isMirrored={isMirrored}
            toggleMirror={toggleMirror}
            latestReading={latestReading}
            modelRank={modelRank}
            isActive={isActive}
          />
          <WaveformVisual
            getTimeDomainData={getTimeDomainData}
            getFrequencyData={getFrequencyData}
            isReady={micReady}
            error={micError}
            latestReading={latestReading}
          />
        </div>

        {/* Center Column: Meters + Gauge */}
        <div className="xl:col-span-3 space-y-4">
          <StressMeters latestReading={latestReading} />
          <RiskGauge latestReading={latestReading} />
          <AlertsPanel latestReading={latestReading} />
        </div>

        {/* Right Column: AI Chat */}
        <div className="xl:col-span-4">
          <AIChat latestReading={latestReading} isActive={isActive} />
        </div>
      </div>
    </div>
  );
}

export default LiveSession;
