import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paperclip, Mic, Camera, Send, X, Image, FileText } from 'lucide-react';

interface ChatInputBarProps {
  onSend: (text: string, imageBase64?: string) => void;
  disabled?: boolean;
  isVoiceInput?: boolean;
  onMicClick?: () => void;
  voiceActive?: boolean;
}

function ChatInputBar({
  onSend,
  disabled = false,
  isVoiceInput = false,
  onMicClick,
  voiceActive = false,
}: ChatInputBarProps): React.ReactElement {
  const [text, setText] = useState('');
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; base64: string; type: string } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleSend = () => {
    if (disabled || (!text.trim() && !attachment)) return;
    onSend(text.trim(), attachment?.base64);
    setText('');
    setAttachment(null);
  };

  const handleFile = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('File must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAttachment({
        name: file.name,
        base64,
        type: file.type.startsWith('image/') ? 'image' : 'document',
      });
    };
    reader.readAsDataURL(file);
    setShowUploadMenu(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const openCamera = async () => {
    setShowCamera(true);
    setShowUploadMenu(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      setAttachment({ name: 'Camera photo', base64, type: 'image' });
    }
    closeCamera();
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  return (
    <>
      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={closeCamera}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative bg-bg-card rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <video ref={videoRef} className="w-[480px] h-[360px] object-cover" autoPlay playsInline muted />
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                <button onClick={capturePhoto} className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center">
                  <Camera className="w-6 h-6 text-gray-800" />
                </button>
                <button onClick={closeCamera} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment preview */}
      <AnimatePresence>
        {attachment && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-3 px-4 py-2 mx-4 mb-2 rounded-xl bg-bg-secondary border border-border"
          >
            {attachment.type === 'image' ? (
              <img src={attachment.base64} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-bg-tertiary flex items-center justify-center">
                <FileText className="w-5 h-5 text-text-muted" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-primary truncate">{attachment.name}</p>
              <p className="text-xs text-text-muted capitalize">{attachment.type}</p>
            </div>
            <button onClick={() => setAttachment(null)} className="p-1 rounded hover:bg-bg-hover text-text-muted">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="flex items-end gap-2 px-4 relative">
        {/* Upload menu */}
        <div className="relative">
          <button
            onClick={() => setShowUploadMenu(!showUploadMenu)}
            className="p-3 rounded-xl hover:bg-bg-hover text-text-muted hover:text-text-secondary transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showUploadMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-14 left-0 bg-bg-card border border-border rounded-xl shadow-lg p-2 z-20 min-w-[180px]"
              >
                <button
                  onClick={openCamera}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-hover text-sm text-text-secondary transition-colors"
                >
                  <Camera className="w-4 h-4" /> Take Photo
                </button>
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/*';
                      fileInputRef.current.click();
                    }
                    setShowUploadMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-hover text-sm text-text-secondary transition-colors"
                >
                  <Image className="w-4 h-4" /> Upload Image
                </button>
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = '.pdf,.doc,.docx,.txt';
                      fileInputRef.current.click();
                    }
                    setShowUploadMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-hover text-sm text-text-secondary transition-colors"
                >
                  <FileText className="w-4 h-4" /> Upload Document
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Text input */}
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isVoiceInput ? 'Listening...' : 'Share what\'s on your mind...'}
            disabled={disabled}
            rows={1}
            className="input-field w-full resize-none min-h-[44px] max-h-[120px] py-3"
            style={{ overflow: 'auto' }}
          />
        </div>

        {/* Mic */}
        <button
          onClick={onMicClick}
          className={`p-3 rounded-xl transition-colors ${
            voiceActive
              ? 'bg-accent-green/20 text-accent-green'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
          }`}
          title="Voice input"
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !attachment)}
          className="btn-primary py-3 px-4"
        >
          <Send className="w-4 h-4" />
        </button>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput} />
      </div>
    </>
  );
}

export default ChatInputBar;
