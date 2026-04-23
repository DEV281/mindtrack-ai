import { useEffect, useRef, useState, useCallback } from 'react';

interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  isReady: boolean;
  error: string | null;
  isMirrored: boolean;
  toggleMirror: () => void;
  captureFrame: () => string | null;
  stop: () => void;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { facingMode = 'user', width = 640, height = 480 } = options;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState(true);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startCamera = async (): Promise<void> => {
      try {
        // Single getUserMedia call for both video and audio (critical for Chrome)
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: width }, height: { ideal: height } },
          audio: true,
        });

        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            setIsReady(true);
          };
        }
      } catch (err) {
        const message =
          err instanceof DOMException
            ? err.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access.'
              : err.name === 'NotFoundError'
                ? 'No camera found. Please connect a camera.'
                : `Camera error: ${err.message}`
            : 'Failed to access camera';
        setError(message);
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, width, height]);

  const toggleMirror = useCallback(() => {
    setIsMirrored((prev) => !prev);
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !isReady) return null;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7).split(',')[1]; // base64 without prefix
  }, [isReady, isMirrored]);

  const stop = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsReady(false);
    }
  }, [stream]);

  return { videoRef, stream, isReady, error, isMirrored, toggleMirror, captureFrame, stop };
}

export default useCamera;
