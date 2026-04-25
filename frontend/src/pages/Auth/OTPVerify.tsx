import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, ShieldCheck, RotateCcw, AlertCircle } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

function OTPVerify(): React.ReactElement {
  const navigate = useNavigate();
  const { verifyOtp, pendingEmail, isLoading } = useAuthStore();

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Auto-focus first input & load any stored debug OTP
  useEffect(() => {
    if (pendingEmail) {
      inputRefs.current[0]?.focus();
      // Check if registration stored a debug OTP (email delivery failed)
      try {
        const storedOtp = sessionStorage.getItem('mindtrack_debug_otp');
        if (storedOtp) {
          setDebugOtp(storedOtp);
          sessionStorage.removeItem('mindtrack_debug_otp');
        }
      } catch {}
    }
  }, [pendingEmail]);

  const handleChange = (index: number, value: string): void => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (newOtp.every((d) => d !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (code: string): Promise<void> => {
    if (!pendingEmail) return;
    setError(null);
    try {
      await verifyOtp(pendingEmail, code);
      navigate('/dashboard');
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Invalid or expired OTP. Please try again.');
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async (): Promise<void> => {
    if (!pendingEmail) return;
    setIsResending(true);
    setError(null);
    try {
      const { default: api } = await import('../../api/client');
      const response = await api.post('/auth/resend-otp', { email: pendingEmail });
      if (response.data.email_sent === false) {
        if (response.data.debug_otp) {
          setDebugOtp(response.data.debug_otp);
          toast('OTP generated! Use the code shown below.', { icon: '🔑' });
        } else {
          toast.error('OTP generated but email failed to send.');
          setError('Email service is unavailable. Contact the administrator.');
        }
      } else {
        setDebugOtp(null);
        toast.success('New verification code sent!');
      }
      setCountdown(30);
      setCanResend(false);
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch {
      toast.error('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // If no pendingEmail, show a helpful message instead of instant redirect
  if (!pendingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary bg-noise p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="glass-card p-8">
            <AlertCircle className="w-12 h-12 text-accent-amber mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Session Expired</h2>
            <p className="text-text-secondary text-sm mb-6">
              Your verification session has expired. Please register or log in again.
            </p>
            <div className="flex gap-3">
              <Link to="/register" className="btn-primary flex-1">
                Register
              </Link>
              <Link to="/login" className="btn-secondary flex-1">
                Log In
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary bg-noise p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-accent-cyan/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan to-blue-400 shadow-lg shadow-accent-cyan/20 mb-4">
            <ShieldCheck className="w-9 h-9 text-bg-primary" />
          </div>
          <h1 className="text-2xl font-bold">Verify Your Identity</h1>
          <p className="text-text-secondary mt-1.5 text-sm">
            Enter the 6-digit code sent to{' '}
            <span className="text-accent-cyan font-medium">{pendingEmail}</span>
          </p>
        </div>

        {/* OTP Card */}
        <div className="glass-card p-8">
          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl border flex items-center gap-2"
              style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0" />
              <p className="text-xs text-accent-red">{error}</p>
            </motion.div>
          )}
          {/* Debug OTP display — shown when email delivery fails */}
          {debugOtp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-4 rounded-xl border text-center"
              style={{ background: 'rgba(234, 179, 8, 0.08)', borderColor: 'rgba(234, 179, 8, 0.3)' }}
            >
              <p className="text-xs text-yellow-400 mb-2">📧 Email delivery unavailable — use this code:</p>
              <div className="font-mono text-2xl font-bold tracking-[0.4em] text-yellow-300">
                {debugOtp}
              </div>
            </motion.div>
          )}

          {/* OTP Inputs */}
          <div className="flex justify-center gap-3 mb-8">
            {otp.map((digit, index) => (
              <motion.input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`w-12 h-14 text-center text-xl font-mono font-bold 
                  bg-bg-secondary border rounded-xl 
                  focus:outline-none focus:ring-2 transition-all duration-200
                  ${
                    error
                      ? 'border-accent-red/50 focus:ring-accent-red/20'
                      : digit
                        ? 'border-accent-green/50 focus:ring-accent-green/20 text-accent-green'
                        : 'border-border focus:ring-accent-cyan/20 text-text-primary'
                  }`}
              />
            ))}
          </div>

          {/* Verify Button */}
          <button
            onClick={() => handleVerify(otp.join(''))}
            disabled={isLoading || otp.some((d) => !d)}
            className="btn-primary w-full"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Verify Code
              </>
            )}
          </button>

          {/* Resend */}
          <div className="text-center mt-6">
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={isResending}
                className="inline-flex items-center gap-2 text-sm text-accent-green hover:underline font-medium disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                {isResending ? 'Sending...' : 'Resend Code'}
              </button>
            ) : (
              <p className="text-sm text-text-muted">
                Resend code in{' '}
                <span className="font-mono text-accent-cyan">{countdown}s</span>
              </p>
            )}
          </div>
        </div>

        {/* Dev Mode Hint */}
        <div className="mt-4 p-4 rounded-xl border text-center"
          style={{ background: 'rgba(233, 196, 106, 0.08)', borderColor: 'rgba(233, 196, 106, 0.3)' }}
        >
          <p className="text-xs font-bold mb-1" style={{ color: '#e9c46a' }}>
            🔧 Local Dev Mode
          </p>
          <p className="text-xs" style={{ color: '#b08a40' }}>
            OTP is printed to the backend terminal logs.<br />
            Check your terminal for: <strong>[DEV] OTP for ...</strong>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default OTPVerify;
