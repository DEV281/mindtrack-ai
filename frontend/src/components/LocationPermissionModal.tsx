import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { setLocationPref } from '../hooks/useLocation';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

function LocationPermissionModal({ isOpen, onAllow, onDismiss }: LocationPermissionModalProps): React.ReactElement | null {
  const handleAllow = () => {
    setLocationPref('allowed');
    onAllow();
  };

  const handleDismiss = () => {
    setLocationPref('dismissed');
    onDismiss();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md rounded-2xl p-6 relative"
            style={{
              background: '#ffffff',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" style={{ color: '#718096' }} />
            </button>

            {/* Icon */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#e8f0fe' }}
              >
                <MapPin className="w-5 h-5" style={{ color: '#6c9bd2' }} />
              </div>
              <h3
                className="text-lg font-semibold"
                style={{ color: '#2d3748', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                📍 Personalize Your Experience
              </h3>
            </div>

            {/* Benefits */}
            <p className="text-sm mb-4" style={{ color: '#718096', lineHeight: 1.7 }}>
              Allow MindTrack to access your location to:
            </p>
            <div className="space-y-2 mb-5">
              {[
                { emoji: '🌤', text: 'Show local weather on your dashboard' },
                { emoji: '🌍', text: 'Personalize your wellness experience' },
                { emoji: '⏰', text: 'Match content to your local time' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 text-sm" style={{ color: '#2d3748' }}>
                  <span>{item.emoji}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Privacy note */}
            <p className="text-xs mb-5" style={{ color: '#a0aec0', lineHeight: 1.6 }}>
              Your location is never stored on our servers. It is used only on your device.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleAllow}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  background: '#6c9bd2',
                  color: '#ffffff',
                }}
              >
                📍 Allow Location
              </button>
              <button
                onClick={handleDismiss}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-gray-100"
                style={{
                  background: '#f7fafc',
                  color: '#718096',
                  border: '1px solid #e8edf5',
                }}
              >
                Not Now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LocationPermissionModal;
