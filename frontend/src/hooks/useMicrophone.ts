import { useEffect, useRef, useState, useCallback } from 'react';

interface UseMicrophoneReturn {
  analyser: AnalyserNode | null;
  audioContext: AudioContext | null;
  isReady: boolean;
  error: string | null;
  getTimeDomainData: () => Uint8Array | null;
  getFrequencyData: () => Uint8Array | null;
  getAudioChunk: () => string | null;
  stop: () => void;
}

export function useMicrophone(stream: MediaStream | null): UseMicrophoneReturn {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setError('No audio tracks available');
      return;
    }

    let ctx: AudioContext | null = null;

    try {
      ctx = new AudioContext({ sampleRate: 16000 });
      const source = ctx.createMediaStreamSource(stream);
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.8;
      source.connect(analyserNode);

      setAudioContext(ctx);
      setAnalyser(analyserNode);
      setIsReady(true);

      // Set up media recorder for audio chunks
      try {
        const recorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
            // Keep only last 5 chunks (~10 seconds of audio)
            if (chunksRef.current.length > 5) {
              chunksRef.current.shift();
            }
          }
        };

        recorder.start(2000); // Record in 2-second intervals
      } catch {
        // MediaRecorder may not be available in all browsers
      }
    } catch (err) {
      setError(
        err instanceof Error ? `Audio error: ${err.message}` : 'Failed to initialize audio'
      );
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (ctx && ctx.state !== 'closed') {
        ctx.close();
      }
    };
  }, [stream]);

  const getTimeDomainData = useCallback((): Uint8Array | null => {
    if (!analyser) return null;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    return data;
  }, [analyser]);

  const getFrequencyData = useCallback((): Uint8Array | null => {
    if (!analyser) return null;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    return data;
  }, [analyser]);

  const getAudioChunk = useCallback((): string | null => {
    if (chunksRef.current.length === 0) return null;

    const latestChunk = chunksRef.current[chunksRef.current.length - 1];
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(latestChunk);
    }) as unknown as string;
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
    }
    setIsReady(false);
    setAnalyser(null);
    setAudioContext(null);
  }, [audioContext]);

  return { analyser, audioContext, isReady, error, getTimeDomainData, getFrequencyData, getAudioChunk, stop };
}

export default useMicrophone;
