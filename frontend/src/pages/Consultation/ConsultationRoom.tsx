import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, Clock, Wifi, WifiOff, Settings2, ChevronDown,
  MessageCircle, ClipboardList, MessageSquare, AlertTriangle,
  Volume2, VolumeX,
} from 'lucide-react';
import ChatInputBar from '../../components/ChatInputBar';
import toast from 'react-hot-toast';
import CameraFeed from '../Session/components/CameraFeed';
import WaveformVisual from '../Session/components/WaveformVisual';
import StressMeters from '../Session/components/StressMeters';
import RiskGauge from '../Session/components/RiskGauge';
import { useCamera } from '../../hooks/useCamera';
import { useMicrophone } from '../../hooks/useMicrophone';
import { useSpeechOutput } from '../../hooks/useSpeechOutput';
import useConsultationStore from '../../store/consultationStore';
import type { ConsultationMessage, AssessmentQuestion, StressUpdate } from '../../store/consultationStore';
import { getAccessToken, WS_BASE } from '../../api/client';
import api from '../../api/client';
import VoiceInputButton from '../../components/VoiceInputButton';
import VoiceControls from '../../components/VoiceControls';
import VoiceWaveformInput from '../../components/VoiceWaveformInput';
import VoicePermissionModal, { getVoicePreference } from '../../components/VoicePermissionModal';

const MODE_OPTIONS = [
  { rank: 1, emoji: '✨', label: 'Best', desc: 'Most thorough and careful analysis' },
  { rank: 2, emoji: '⚡', label: 'Better', desc: 'Great balance of speed and accuracy' },
  { rank: 3, emoji: '🌿', label: 'Good', desc: 'Lighter on your device' },
];

const ANSWER_OPTIONS = [
  { value: 0, label: 'Not at all', color: '' },
  { value: 1, label: 'A few days', color: '' },
  { value: 2, label: 'Often', color: '' },
  { value: 3, label: 'Nearly every day', color: '' },
];

function ConsultationRoom(): React.ReactElement {
  const {
    consultationId, isActive, mode, messages, currentQuestion,
    assessmentProgress, stressUpdate, modelRank, duration, isConnected,
    alerts, phq9Score, gad7Score, assessmentComplete, phq9Level, gad7Level,
    startConsultation, stopConsultation, setMode, addMessage,
    setCurrentQuestion, setAssessmentProgress, setStressUpdate,
    setModelRank, setConnected, setAlerts, setAssessmentResult, updateDuration, reset,
  } = useConsultationStore();

  const { videoRef, stream, isReady: cameraReady, error: cameraError, isMirrored, toggleMirror, captureFrame } = useCamera();
  const { analyser, isReady: micReady, error: micError, getTimeDomainData, getFrequencyData } = useMicrophone(stream);

  const {
    speak, stop: stopSpeaking, pause: pauseSpeaking, resume: resumeSpeaking,
    isSpeaking, isPaused, settings: voiceSettings, updateSettings: updateVoiceSettings,
    currentSentence, totalSentences,
  } = useSpeechOutput();

  const [inputText, setInputText] = useState('');
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiMode, setAiMode] = useState('companion');
  const [wsStatus, setWsStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMessageCountRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consultIdRef = useRef<string | null>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const sentenceBufferRef = useRef('');
  const userScrolledUpRef = useRef(false);

  // Camera data ref — mirrors latest stress readings for chat
  const cameraDataRef = useRef<Record<string, unknown>>({
    active: false,
    stress: 0,
    anxiety: 0,
    stability: 100,
    depression_risk: 0,
    overall_risk: 0,
    emotions: { neutral: 50, happy: 25, tense: 10, anxious: 8, sad: 4, fear: 3 },
    voice_amplitude: 0,
    micro_expression_pct: 0,
    confidence: 0,
  });

  const MODE_LABELS: Record<string, { emoji: string; label: string }> = {
    companion: { emoji: '💙', label: 'Listening mode' },
    coach: { emoji: '⚡', label: 'Coach mode' },
    mindfulness: { emoji: '🧘', label: 'Calm mode' },
    motivational: { emoji: '🌟', label: 'Motivation mode' },
    night: { emoji: '🌙', label: 'Night mode' },
    recovery: { emoji: '💜', label: 'Recovery mode' },
    clinical: { emoji: '📋', label: 'Check-in mode' },
  };

  // Format duration
  const formattedDuration = `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')}`;

  // Scroll to bottom of messages
  // Scroll to bottom (respect user scroll)
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Duration timer
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(updateDuration, 1000);
      return () => clearInterval(interval);
    }
  }, [isActive, updateDuration]);

  // Sync stressUpdate into cameraDataRef for sending with messages
  useEffect(() => {
    if (stressUpdate) {
      cameraDataRef.current = {
        active: isActive && cameraReady,
        stress: stressUpdate.stress,
        anxiety: stressUpdate.anxiety,
        stability: stressUpdate.stability,
        depression_risk: stressUpdate.depression_risk,
        overall_risk: stressUpdate.overall_risk,
        emotions: stressUpdate.emotions,
        voice_amplitude: stressUpdate.voice_amplitude,
        micro_expression_pct: stressUpdate.micro_expression_pct,
        confidence: stressUpdate.confidence,
      };
    }
  }, [stressUpdate, isActive, cameraReady]);

  // ---- Voice Mode: auto-speak new AI messages ----
  useEffect(() => {
    if (!voiceModeEnabled || !voiceSettings.autoSpeak) return;
    if (messages.length <= prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
      return;
    }
    const newMessages = messages.slice(prevMessageCountRef.current);
    prevMessageCountRef.current = messages.length;

    for (const msg of newMessages) {
      if (msg.sender === 'ai') {
        speak(msg.message_text);
        break; // speak only the latest AI message
      }
    }
  }, [messages, voiceModeEnabled, voiceSettings.autoSpeak, speak]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopSpeaking();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stopSpeaking]);

  // WebSocket connection
  const connectWS = useCallback((consultId: string) => {
    const token = getAccessToken();
    let url: string;
    if (WS_BASE) {
      // Production: connect directly to Railway backend
      url = `${WS_BASE}/api/consultation/ws/consultation/${consultId}${token ? `?token=${token}` : ''}`;
    } else {
      // Local dev: use Vite proxy via window.location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      url = `${protocol}//${host}/api/consultation/ws/consultation/${consultId}${token ? `?token=${token}` : ''}`;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setWsStatus('connected');
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Handle stress update (can come with stream_end or standalone)
        if (data.stress_update) {
          setStressUpdate(data.stress_update as StressUpdate);
        }
        if (data.alerts && data.alerts.length > 0) {
          setAlerts(data.alerts);
        }
        // Update AI mode indicator
        if (data.mode) {
          setAiMode(data.mode);
        }

        switch (data.type) {
          // --- Typing indicator (brief, before stream starts) ---
          case 'typing': {
            setIsTyping(true);
            break;
          }

          // --- Stream start: create empty AI message ---
          case 'stream_start': {
            setIsTyping(false);
            setIsStreaming(true);
            const msgId = data.message_id || `ai-${Date.now()}`;
            streamingMsgIdRef.current = msgId;
            sentenceBufferRef.current = '';
            const msg: ConsultationMessage = {
              id: msgId,
              sender: 'ai',
              message_text: '',
              timestamp: new Date().toISOString(),
            };
            addMessage(msg);
            break;
          }

          // --- Stream chunk: append text to streaming message ---
          case 'stream_chunk': {
            const chunkMsgId = data.message_id || streamingMsgIdRef.current;
            if (chunkMsgId) {
              useConsultationStore.setState((state) => ({
                messages: state.messages.map((m) =>
                  m.id === chunkMsgId
                    ? { ...m, message_text: m.message_text + (data.text || '') }
                    : m
                ),
              }));
              // TTS: buffer sentences for voice
              if (voiceModeEnabled) {
                sentenceBufferRef.current += (data.text || '');
                const sentences = sentenceBufferRef.current.match(/[^.!?]+[.!?]+/g);
                if (sentences && sentences.length > 0) {
                  const complete = sentences.slice(0, -1);
                  const last = sentences[sentences.length - 1];
                  const isLastComplete = /[.!?]\s*$/.test(last);
                  if (isLastComplete) {
                    sentences.forEach((s) => speak(s.trim()));
                    sentenceBufferRef.current = '';
                  } else {
                    complete.forEach((s) => speak(s.trim()));
                    sentenceBufferRef.current = last;
                  }
                }
              }
              // Auto-scroll during stream
              if (!userScrolledUpRef.current) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }
            }
            break;
          }

          // --- Stream end: finalize message ---
          case 'stream_end': {
            setIsStreaming(false);
            streamingMsgIdRef.current = null;
            // Flush remaining TTS buffer
            if (voiceModeEnabled && sentenceBufferRef.current.trim()) {
              speak(sentenceBufferRef.current.trim());
              sentenceBufferRef.current = '';
            }
            break;
          }

          // --- Assessment & mode messages (unchanged) ---
          case 'mode_switched': {
            if (data.question) {
              setCurrentQuestion(data.question as AssessmentQuestion);
            }
            break;
          }
          case 'assessment_next': {
            if (data.question) {
              setCurrentQuestion(data.question as AssessmentQuestion);
              setAssessmentProgress(data.progress || 0);
            }
            break;
          }
          case 'assessment_complete': {
            setAssessmentResult(
              data.phq9_score, data.phq9_level,
              data.gad7_score, data.gad7_level,
            );
            const reportMsg: ConsultationMessage = {
              id: `report-${Date.now()}`,
              sender: 'ai',
              message_text: data.report,
              timestamp: new Date().toISOString(),
            };
            addMessage(reportMsg);
            setCurrentQuestion(null);
            break;
          }
          case 'model_switched': {
            setModelRank(data.model_rank);
            toast.success(data.message);
            break;
          }
          case 'error': {
            setIsTyping(false);
            setIsStreaming(false);
            if (data.message) {
              addMessage({
                id: `err-${Date.now()}`,
                sender: 'ai',
                message_text: data.message,
                timestamp: new Date().toISOString(),
              });
            }
            break;
          }
          case 'pong':
            break;
        }
      } catch {
        // ignore malformed
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect with exponential backoff
      if (reconnectAttemptsRef.current < 5 && consultIdRef.current) {
        setWsStatus('reconnecting');
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 8000);
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
          if (consultIdRef.current) {
            connectWS(consultIdRef.current);
          }
        }, delay);
      } else if (!consultIdRef.current) {
        setWsStatus('disconnected');
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };
  }, [setConnected, setStressUpdate, setAlerts, addMessage, setCurrentQuestion, setAssessmentProgress, setAssessmentResult, setModelRank, speak, voiceModeEnabled]);

  // Start consultation
  const handleStart = async (): Promise<void> => {
    // Show voice permission modal on first session
    const pref = getVoicePreference();
    if (pref === null) {
      setShowVoiceModal(true);
      return;
    }
    if (pref === 'voice') {
      setVoiceModeEnabled(true);
    }
    await doStart();
  };

  const doStart = async (): Promise<void> => {
    try {
      const { data } = await api.post('/consultation/start', {
        mode: 'live',
        model_rank: modelRank,
      });
      startConsultation(data.consultation_id);
      consultIdRef.current = data.consultation_id;
      reconnectAttemptsRef.current = 0;
      connectWS(data.consultation_id);
    } catch (err) {
      toast.error('Something went wrong — please try again');
    }
  };

  // Handle voice modal choice
  const handleVoiceModalChoice = async (choice: 'voice' | 'text') => {
    setShowVoiceModal(false);
    if (choice === 'voice') {
      setVoiceModeEnabled(true);
    }
    await doStart();
  };

  // Stop consultation
  const handleStop = async (): Promise<void> => {
    consultIdRef.current = null;
    reconnectAttemptsRef.current = 99; // Prevent reconnect
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (consultationId) {
      try {
        await api.post(`/consultation/${consultationId}/end`);
      } catch {
        // ignore
      }
    }
    wsRef.current?.close();
    stopConsultation();
    stopSpeaking();
    setVoiceModeEnabled(false);
    setIsTyping(false);
    setIsStreaming(false);
    setWsStatus('disconnected');
    streamingMsgIdRef.current = null;
    toast.success('Session complete 💙');
  };

  // Send message (updated for ChatInputBar with image support)
  const handleChatSend = (text: string, imageBase64?: string): void => {
    if ((!text.trim() && !imageBase64) || !wsRef.current) return;
    setInputText('');
    setInterimText('');
    setIsVoiceInput(false);

    // Add patient message locally
    const patientMsg: ConsultationMessage = {
      id: `patient-${Date.now()}`,
      sender: 'patient',
      message_text: text || (imageBase64 ? '📷 Shared an image' : ''),
      timestamp: new Date().toISOString(),
      image_url: imageBase64,
    };
    addMessage(patientMsg);

    // Send via WebSocket
    const frame = captureFrame();
    wsRef.current.send(JSON.stringify({
      type: 'message',
      text: text || 'Shared an image',
      frame: frame || undefined,
      input_method: 'text',
      image_base64: imageBase64 || undefined,
      camera_data: cameraDataRef.current,
    }));
  };

  // Legacy handleSend for voice transcript compat
  const handleSend = (inputMethod: 'text' | 'voice' = 'text'): void => {
    handleChatSend(inputText, undefined);
  };

  // Handle voice transcript — immediately send via WebSocket
  const handleVoiceTranscript = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !wsRef.current) return;

    // Add patient message locally
    const patientMsg: ConsultationMessage = {
      id: `patient-${Date.now()}`,
      sender: 'patient',
      message_text: trimmed,
      timestamp: new Date().toISOString(),
    };
    addMessage(patientMsg);

    // Send via WebSocket
    const frame = captureFrame();
    wsRef.current.send(JSON.stringify({
      type: 'message',
      text: trimmed,
      frame: frame || undefined,
      input_method: 'voice',
      camera_data: cameraDataRef.current,
    }));

    setInputText('');
    setInterimText('');
    setIsVoiceInput(false);
  }, [addMessage, captureFrame]);

  const handleInterim = useCallback((text: string) => {
    setInterimText(text);
    setIsVoiceInput(true);
  }, []);

  // Switch mode
  const handleModeSwitch = (newMode: 'live' | 'assessment' | 'free'): void => {
    setMode(newMode);
    wsRef.current?.send(JSON.stringify({
      type: 'switch_mode',
      mode: newMode,
    }));
  };

  // Send assessment answer
  const handleAssessmentAnswer = (value: number): void => {
    if (!currentQuestion) return;
    wsRef.current?.send(JSON.stringify({
      type: 'assessment_answer',
      answer: value,
      question_index: currentQuestion.index,
    }));
    // Add answer locally
    addMessage({
      id: `answer-${Date.now()}`,
      sender: 'patient',
      message_text: `${ANSWER_OPTIONS[value]?.label || 'N/A'}`,
      timestamp: new Date().toISOString(),
      assessment_q_index: currentQuestion.index,
      assessment_answer: value,
    });
  };

  // Switch model
  const handleModelSwitch = (rank: number): void => {
    setShowModelSelect(false);
    wsRef.current?.send(JSON.stringify({
      type: 'switch_model',
      model_rank: rank,
    }));
  };

  // Toggle voice mode
  const toggleVoiceMode = () => {
    const next = !voiceModeEnabled;
    setVoiceModeEnabled(next);
    if (!next) {
      stopSpeaking();
    }
  };

  // Convert stressUpdate to reading-like format for reuse of existing components
  const latestReading = stressUpdate ? {
    timestamp: Date.now(),
    stress: stressUpdate.stress,
    anxiety: stressUpdate.anxiety,
    stability: stressUpdate.stability,
    depression_risk: stressUpdate.depression_risk,
    overall_risk: stressUpdate.overall_risk,
    emotions: stressUpdate.emotions as { neutral: number; happy: number; tense: number; anxious: number; sad: number; fear: number; surprised: number },
    voice_freq: stressUpdate.voice_freq,
    voice_amplitude: stressUpdate.voice_amplitude,
    micro_expression_pct: stressUpdate.micro_expression_pct,
    confidence: stressUpdate.confidence,
    model_rank: modelRank,
    alerts: alerts,
  } : null;

  return (
    <div className="page-container pb-4">
      {/* Voice Permission Modal */}
      <VoicePermissionModal
        isOpen={showVoiceModal}
        onChoose={handleVoiceModalChoice}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Your Wellness Session</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Your personal wellness companion
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelect(!showModelSelect)}
              className="btn-secondary text-sm py-2 px-4"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {MODE_OPTIONS.find(m => m.rank === modelRank)?.emoji || '✨'} {MODE_OPTIONS.find(m => m.rank === modelRank)?.label || 'Best'}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showModelSelect && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 280, background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: 8, zIndex: 50, boxShadow: 'var(--shadow-lg)' }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', padding: '8px 12px' }}>Choose your analysis depth</p>
                {MODE_OPTIONS.map((m) => (
                  <button
                    key={m.rank}
                    onClick={() => handleModelSwitch(m.rank)}
                    style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 12, fontSize: 14, transition: 'background 0.2s', background: modelRank === m.rank ? 'var(--primary-light)' : 'transparent', color: modelRank === m.rank ? 'var(--primary)' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}
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
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#52b788' : 'var(--text-muted)' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-secondary)' }}>{formattedDuration}</span>
          </div>

          {/* Controls */}
          {!isActive ? (
            <button onClick={handleStart} className="btn-primary py-2 px-6">
              <Play className="w-4 h-4" /> Begin Session
            </button>
          ) : (
            <button onClick={handleStop} className="btn-danger py-2 px-6">
              <Square className="w-4 h-4" /> End Session
            </button>
          )}
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* LEFT PANEL — Live Analysis */}
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
          <div className="grid grid-cols-2 gap-4">
            <StressMeters latestReading={latestReading} />
            <RiskGauge latestReading={latestReading} />
          </div>
          <WaveformVisual
            getTimeDomainData={getTimeDomainData}
            getFrequencyData={getFrequencyData}
            isReady={micReady}
            error={micError}
            latestReading={latestReading}
          />
          {/* Removed technical vitals grid */}
        </div>

        {/* RIGHT PANEL — Conversation */}
        <div className="xl:col-span-7">
          <div className="glass-card flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
            {/* Connection Status Bar */}
            <AnimatePresence>
              {wsStatus === 'reconnecting' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="text-center text-xs py-1.5 font-medium"
                  style={{ background: 'rgba(233, 196, 106, 0.15)', color: '#e9c46a', borderBottom: '1px solid rgba(233, 196, 106, 0.2)' }}
                >
                  Reconnecting... 💙
                </motion.div>
              )}
              {wsStatus === 'disconnected' && isActive && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="text-center text-xs py-1.5 font-medium"
                  style={{ background: 'rgba(183, 126, 181, 0.12)', color: '#b77eb5', borderBottom: '1px solid rgba(183, 126, 181, 0.2)' }}
                >
                  Connection lost — trying to reconnect
                </motion.div>
              )}
            </AnimatePresence>
            {/* Mode Tabs + Voice Toggle + Camera Indicator */}
            <div className="flex items-center border-b border-border px-4 pt-3">
              <div className="flex flex-1">
                {[
                  { key: 'live' as const, label: '💬 Chat', icon: MessageCircle },
                  { key: 'assessment' as const, label: '📋 Check-in', icon: ClipboardList },
                  { key: 'free' as const, label: '🎙 Voice', icon: MessageSquare },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => handleModeSwitch(tab.key)}
                      disabled={!isActive}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                        mode === tab.key
                          ? 'border-accent-green text-accent-green'
                          : 'border-transparent text-text-muted hover:text-text-secondary'
                      } disabled:opacity-50`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Camera linked indicator */}
              {isActive && (
                <span
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs mr-2"
                  style={{
                    background: cameraReady ? 'rgba(82, 183, 136, 0.1)' : 'rgba(138, 148, 166, 0.1)',
                    color: cameraReady ? '#52b788' : '#8a94a6',
                    border: `1px solid ${cameraReady ? 'rgba(82, 183, 136, 0.2)' : 'rgba(138, 148, 166, 0.15)'}`,
                  }}
                >
                  <span
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: cameraReady ? '#52b788' : '#8a94a6',
                      ...(cameraReady ? { animation: 'pulse 2s ease-in-out infinite' } : {}),
                    }}
                  />
                  📷 {cameraReady ? 'Reading expressions' : 'Camera offline'}
                </span>
              )}

              {/* Voice Mode Toggle */}
              {isActive && (
                <button
                  onClick={toggleVoiceMode}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ml-2 ${
                    voiceModeEnabled
                      ? 'bg-accent-green/15 text-accent-green border border-accent-green/30'
                      : 'bg-bg-tertiary text-text-muted border border-border hover:text-text-secondary'
                  }`}
                >
                  {voiceModeEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  Voice: {voiceModeEnabled ? 'ON' : 'OFF'}
                </button>
              )}
            </div>

            {/* Voice Active Pill */}
            <AnimatePresence>
              {voiceModeEnabled && isActive && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center justify-center py-2"
                >
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: 'rgba(0,229,160,0.1)',
                      border: '1px solid rgba(0,229,160,0.2)',
                      color: '#00e5a0',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#00e5a0',
                        animation: 'pulse 1.5s ease-in-out infinite',
                      }}
                    />
                    🎙 Voice Mode Active — speak naturally
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Assessment Progress Bar */}
            {mode === 'assessment' && currentQuestion && (
              <div className="px-4 pt-3">
                <div className="flex justify-between items-center text-xs text-text-muted mb-1">
                  <span>Progress</span>
                  <span>{assessmentProgress}/17</span>
                </div>
                <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-accent-green to-accent-cyan rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(assessmentProgress / 17) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!isActive && messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center px-6"
                >
                  <div style={{
                    width: 72, height: 72, borderRadius: 22,
                    background: 'linear-gradient(135deg, var(--primary-light), rgba(82,183,136,0.15))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 20, fontSize: 32,
                  }}>
                    💙
                  </div>
                  <h3 style={{
                    fontFamily: 'Nunito, sans-serif', fontWeight: 900,
                    fontSize: 20, color: 'var(--text-primary)', marginBottom: 8,
                  }}>
                    Welcome to Your Wellness Session
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 320, lineHeight: 1.7, marginBottom: 28 }}>
                    I'm here to listen, support, and guide you. Your camera and microphone help me understand how you're feeling — everything stays private.
                  </p>
                  <button
                    onClick={handleStart}
                    className="btn-primary"
                    style={{ padding: '14px 36px', fontSize: 16, fontWeight: 800 }}
                  >
                    <Play style={{ width: 18, height: 18 }} />
                    Begin Session
                  </button>
                  <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 16, opacity: 0.7 }}>
                    Sessions are private and encrypted 🔒
                  </p>
                </motion.div>
              )}

              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.sender === 'patient'
                          ? 'bg-accent-cyan/10 border border-accent-cyan/20 text-text-primary'
                          : 'bg-accent-green/10 border border-accent-green/20 text-text-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${
                          msg.sender === 'patient' ? 'text-accent-cyan' : 'text-accent-green'
                        }`}>
                          {msg.sender === 'patient' ? 'You' : 'Your Companion'}
                        </span>
                        {msg.sender === 'ai' && (
                          <span className="text-xs" style={{ color: 'var(--text-hint)', opacity: 0.7 }}>
                            {MODE_LABELS[aiMode]?.emoji}
                          </span>
                        )}
                        <span className="text-xs text-text-muted">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {/* Image attachment */}
                      {msg.image_url && (
                        <div className="mb-2">
                          <img
                            src={msg.image_url}
                            alt="Shared"
                            className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.image_url, '_blank')}
                          />
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.message_text}
                        {streamingMsgIdRef.current === msg.id && isStreaming && (
                          <span className="inline-block w-0.5 h-4 bg-accent-green ml-0.5 streaming-cursor" />
                        )}
                      </p>
                      {msg.stress_at_message !== undefined && (
                        <div className="flex gap-3 mt-2 text-xs" style={{ color: 'var(--text-hint)' }}>
                          <span>Wellness: {(100 - (msg.stress_at_message || 0)).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing Indicator — only when NOT streaming */}
              {isTyping && !isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-accent-green/10 border border-accent-green/20 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-accent-green">Your Companion</span>
                      <span className="text-xs" style={{ color: 'var(--text-hint)', opacity: 0.6 }}>
                        {MODE_LABELS[aiMode]?.emoji} {MODE_LABELS[aiMode]?.label}
                      </span>
                    </div>
                    <div className="flex gap-1.5 items-center h-5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-2 h-2 rounded-full bg-accent-green/60"
                          style={{
                            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Assessment Question Card */}
              {mode === 'assessment' && currentQuestion && !assessmentComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 border border-accent-violet/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge-violet text-xs">{currentQuestion.category}</span>
                    <span className="text-xs text-text-muted">Q{currentQuestion.index} of {currentQuestion.total}</span>
                  </div>
                  <p className="text-sm text-text-primary mb-4 font-medium">{currentQuestion.text}</p>

                  {/* Crisis warning for Q9 and Q17 */}
                  {(currentQuestion.index === 9 || currentQuestion.index === 17) && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-semibold">Sensitive Question</span>
                      </div>
                      <p className="text-xs text-text-muted">
                        If you or someone you know is in crisis: National Suicide Prevention Lifeline: 988 |
                        Crisis Text Line: Text HOME to 741741
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {ANSWER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleAssessmentAnswer(opt.value)}
                        className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${opt.color}`}
                      >
                        <span className="font-mono mr-1.5">{opt.value}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Assessment Complete Banner */}
              {assessmentComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-4 border border-accent-green/20"
                >
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#52b788', marginBottom: 8 }}>Check-in Complete 🌟</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div style={{ background: 'var(--bg-raised)', borderRadius: 12, padding: 12 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mood check</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{phq9Score}/27</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{phq9Level}</p>
                    </div>
                    <div style={{ background: 'var(--bg-raised)', borderRadius: 12, padding: 12 }}>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Worry patterns</p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.1rem', fontWeight: 700, color: '#9d8fcc' }}>{gad7Score}/21</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{gad7Level}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Alerts */}
              {alerts.length > 0 && (
                <div className="space-y-2">
                  {alerts.map((alert, i) => (
                    <motion.div
                      key={`alert-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-300">{alert}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-border p-4">
              {/* Voice Controls — shown when AI is speaking */}
              <VoiceControls
                isSpeaking={isSpeaking}
                isPaused={isPaused}
                onPause={pauseSpeaking}
                onResume={resumeSpeaking}
                onStop={stopSpeaking}
                volume={voiceSettings.volume}
                onVolumeChange={(v) => updateVoiceSettings({ volume: v })}
                currentSentence={currentSentence}
                totalSentences={totalSentences}
              />

              {/* Voice Waveform — shown when mic is listening and voice mode on */}
              {voiceModeEnabled && (
                <VoiceWaveformInput
                  analyser={analyser}
                  isActive={isVoiceInput}
                  interimText={interimText}
                />
              )}

              {/* New ChatInputBar with 📎 🎙 📷 support */}
              <ChatInputBar
                onSend={handleChatSend}
                disabled={!isActive || (mode === 'assessment' && !assessmentComplete)}
                isVoiceInput={isVoiceInput}
                onMicClick={() => {
                  // Toggle voice mode
                  setVoiceModeEnabled((v) => !v);
                }}
                voiceActive={voiceModeEnabled}
              />

              {/* Voice input button row */}
              {isActive && (
                <div className="flex items-center gap-3 mt-2 px-4">
                  <VoiceInputButton
                    onTranscript={handleVoiceTranscript}
                    onInterim={handleInterim}
                    disabled={!isActive || (mode === 'assessment' && !assessmentComplete)}
                  />
                  <button
                    onClick={() => setVoiceModeEnabled((v) => !v)}
                    title={voiceModeEnabled ? 'Disable AI voice' : 'Enable AI voice'}
                    className={`py-2 px-3 rounded-xl border text-xs transition-all ${
                      voiceModeEnabled
                        ? 'bg-accent-green/15 border-accent-green/30 text-accent-green'
                        : 'bg-bg-secondary border-border text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {voiceModeEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                  </button>
                  <span className="text-xs text-text-muted">
                    📎 Attach files • 🎤 Speak • 📷 Camera
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsultationRoom;
