import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface Props { onBack: () => void; }

interface SoundTrack {
  id: string;
  title: string;
  emoji: string;
  category: 'music' | 'nature' | 'meditation';
  description: string;
  frequency: number; // Base frequency for Web Audio API generated tone
  waveform: OscillatorType;
}

const TRACKS: SoundTrack[] = [
  // Music
  { id: 'calm-piano', title: 'Gentle Piano', emoji: '🎹', category: 'music', description: 'Soft piano melodies', frequency: 261.63, waveform: 'sine' },
  { id: 'ambient-pad', title: 'Ambient Pad', emoji: '🎶', category: 'music', description: 'Warm ambient tones', frequency: 196, waveform: 'sine' },
  { id: 'soft-guitar', title: 'Soft Guitar', emoji: '🎸', category: 'music', description: 'Gentle acoustic', frequency: 329.63, waveform: 'triangle' },
  // Nature
  { id: 'rain', title: 'Rainfall', emoji: '🌧', category: 'nature', description: 'Gentle rain sounds', frequency: 0, waveform: 'sine' },
  { id: 'ocean', title: 'Ocean Waves', emoji: '🌊', category: 'nature', description: 'Calming ocean', frequency: 0, waveform: 'sine' },
  { id: 'forest', title: 'Forest Birds', emoji: '🌿', category: 'nature', description: 'Birds and rustling leaves', frequency: 0, waveform: 'sine' },
  // Meditation
  { id: 'singing-bowl', title: 'Singing Bowl', emoji: '🔔', category: 'meditation', description: 'Tibetan singing bowls', frequency: 174, waveform: 'sine' },
  { id: 'om-chant', title: 'Om Chant', emoji: '🧘', category: 'meditation', description: 'Soothing om vibrations', frequency: 136.1, waveform: 'sine' },
];

// Web Audio API white noise generator for nature sounds
function createNoise(ctx: AudioContext, gainNode: GainNode): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Filter for different nature sounds
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  source.connect(filter);
  filter.connect(gainNode);
  return source;
}

// Tone generator for melodic sounds
function createTone(ctx: AudioContext, freq: number, waveform: OscillatorType, gainNode: GainNode): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.type = waveform;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  // Add gentle vibrato
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = 5;
  const vibratoGain = ctx.createGain();
  vibratoGain.gain.value = 2;
  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);
  vibrato.start();

  osc.connect(gainNode);
  return osc;
}

function MoodMusic({ onBack }: Props): React.ReactElement {
  const [playing, setPlaying] = useState<Record<string, boolean>>({});
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<'all' | 'music' | 'nature' | 'meditation'>('all');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Record<string, { source: AudioBufferSourceNode | OscillatorNode; gain: GainNode }>>({});

  const initContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const toggleTrack = useCallback((track: SoundTrack) => {
    const isPlaying = playing[track.id];

    if (isPlaying) {
      // Stop
      const existing = sourcesRef.current[track.id];
      if (existing) {
        try {
          existing.source.stop();
          existing.gain.disconnect();
        } catch { /* already stopped */ }
        delete sourcesRef.current[track.id];
      }
      setPlaying((p) => ({ ...p, [track.id]: false }));
    } else {
      // Start
      const ctx = initContext();
      const gainNode = ctx.createGain();
      gainNode.gain.value = (volumes[track.id] ?? 50) / 100 * 0.3;
      gainNode.connect(ctx.destination);

      let source: AudioBufferSourceNode | OscillatorNode;
      if (track.frequency === 0) {
        // Nature sounds — white noise
        source = createNoise(ctx, gainNode);
      } else {
        // Melodic sounds
        source = createTone(ctx, track.frequency, track.waveform, gainNode);
      }

      source.start();
      sourcesRef.current[track.id] = { source, gain: gainNode };
      setPlaying((p) => ({ ...p, [track.id]: true }));
    }
  }, [playing, volumes, initContext]);

  const changeVolume = (trackId: string, vol: number) => {
    setVolumes((v) => ({ ...v, [trackId]: vol }));
    const existing = sourcesRef.current[trackId];
    if (existing) {
      existing.gain.gain.value = vol / 100 * 0.3;
    }
  };

  const stopAll = useCallback(() => {
    Object.entries(sourcesRef.current).forEach(([id, { source, gain }]) => {
      try { source.stop(); gain.disconnect(); } catch { /* noop */ }
    });
    sourcesRef.current = {};
    setPlaying({});
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(sourcesRef.current).forEach(({ source, gain }) => {
        try { source.stop(); gain.disconnect(); } catch { /* noop */ }
      });
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const anyPlaying = Object.values(playing).some(Boolean);

  const filteredTracks = filter === 'all' ? TRACKS : TRACKS.filter((t) => t.category === filter);

  return (
    <div className="page-container">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary text-sm mb-6 hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Activities
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">🎵 Calm Music & Sounds</h2>
          <p className="text-text-secondary text-sm mt-1">Layer multiple sounds together</p>
        </div>
        {anyPlaying && (
          <button onClick={stopAll} className="btn-secondary text-sm py-2 px-4">
            <VolumeX className="w-4 h-4" /> Stop All
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all' as const, label: 'All' },
          { key: 'music' as const, label: '🎵 Music' },
          { key: 'nature' as const, label: '🌿 Nature' },
          { key: 'meditation' as const, label: '🧘 Meditation' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === tab.key
                ? 'bg-accent-green/15 text-accent-green border border-accent-green/30'
                : 'border border-border text-text-secondary hover:border-border-active'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="space-y-3">
        {filteredTracks.map((track) => {
          const isPlaying = playing[track.id];
          const vol = volumes[track.id] ?? 50;
          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-4 transition-all ${isPlaying ? 'border-accent-green/30' : ''}`}
            >
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button
                  onClick={() => toggleTrack(track)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: isPlaying ? 'rgba(82,201,154,0.15)' : 'rgba(108,155,210,0.1)',
                    color: isPlaying ? '#52c99a' : '#6c9bd2',
                  }}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{track.emoji}</span>
                    <h3 className="text-text-primary font-medium text-sm">{track.title}</h3>
                    <span className="text-xs text-text-muted capitalize">{track.category}</span>
                  </div>
                  <p className="text-text-muted text-xs">{track.description}</p>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2 w-32">
                  <Volume2 className="w-3 h-3 text-text-muted" />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={vol}
                    onChange={(e) => changeVolume(track.id, Number(e.target.value))}
                    className="flex-1 h-1 accent-accent-green"
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Playing indicator */}
              {isPlaying && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  className="h-0.5 rounded-full mt-3"
                  style={{ background: 'rgba(82,201,154,0.3)', transformOrigin: 'left' }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      <p className="text-text-muted text-xs text-center mt-6">
        💡 Tip: Layer multiple sounds together for a personalized ambient experience
      </p>
    </div>
  );
}

export default MoodMusic;
