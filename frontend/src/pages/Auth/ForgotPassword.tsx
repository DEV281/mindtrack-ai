import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, KeyRound, Shield } from 'lucide-react';
import api from '../../api/client';
import toast from 'react-hot-toast';

type Step = 'email' | 'otp' | 'reset';

function ForgotPassword(): React.ReactElement {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Request OTP
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Reset code sent to your email');
      setStep('otp');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to send reset code. Please check your email.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!otp || otp.length !== 6) newErrors.otp = 'Please enter the 6-digit code';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      await api.post('/auth/verify-reset-otp', { email, otp });
      toast.success('Code verified!');
      setStep('reset');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Invalid or expired code';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!newPassword) newErrors.password = 'Password is required';
    else if (newPassword.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(newPassword)) newErrors.password = 'Password must contain at least one uppercase letter';
    else if (!/[0-9]/.test(newPassword)) newErrors.password = 'Password must contain at least one digit';
    if (newPassword !== confirmPassword) newErrors.confirm = 'Passwords do not match';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, new_password: newPassword });
      toast.success('Password reset successfully! Please log in.');
      navigate('/login');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to reset password';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const stepInfo = {
    email: {
      title: 'Forgot Password',
      subtitle: 'Enter your email and we\'ll send you a reset code',
      icon: <Mail className="w-7 h-7 text-bg-primary" />,
    },
    otp: {
      title: 'Check Your Email',
      subtitle: `We sent a 6-digit code to ${email}`,
      icon: <KeyRound className="w-7 h-7 text-bg-primary" />,
    },
    reset: {
      title: 'Create New Password',
      subtitle: 'Choose a strong new password for your account',
      icon: <Shield className="w-7 h-7 text-bg-primary" />,
    },
  };

  const info = stepInfo[step];

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary bg-noise p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-cyan/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-green to-emerald-400 shadow-lg shadow-accent-green/20 mb-4">
            <Brain className="w-9 h-9 text-bg-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Mind<span className="text-gradient-green">Track</span> AI
          </h1>
          <p className="text-text-secondary mt-1.5 text-sm">Mental Wellness Support Platform</p>
        </div>

        <div className="glass-card p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {(['email', 'otp', 'reset'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{
                    background: step === s
                      ? 'linear-gradient(135deg, #52c99a, #38b279)'
                      : (['email', 'otp', 'reset'] as Step[]).indexOf(step) > i
                      ? 'rgba(82,201,154,0.3)'
                      : 'rgba(100,116,139,0.2)',
                    color: step === s || (['email', 'otp', 'reset'] as Step[]).indexOf(step) > i
                      ? '#fff'
                      : 'var(--text-muted)',
                  }}
                >
                  {(['email', 'otp', 'reset'] as Step[]).indexOf(step) > i ? '✓' : i + 1}
                </div>
                {i < 2 && (
                  <div
                    className="w-8 h-0.5 mx-1 transition-all duration-500"
                    style={{
                      background: (['email', 'otp', 'reset'] as Step[]).indexOf(step) > i
                        ? 'rgba(82,201,154,0.5)'
                        : 'var(--border)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Dynamic icon + heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-xl font-semibold mb-1">{info.title}</h2>
              <p className="text-text-secondary text-sm mb-6">{info.subtitle}</p>

              {/* Email step */}
              {step === 'email' && (
                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="fp-email" className="label-text">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        id="fp-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={`input-field pl-11 ${errors.email ? 'border-accent-red/50 focus:border-accent-red' : ''}`}
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                    {errors.email && <p className="text-accent-red text-xs mt-1">{errors.email}</p>}
                  </div>

                  <button type="submit" disabled={isLoading} className="btn-primary w-full">
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
                    ) : (
                      <>Send Reset Code <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              )}

              {/* OTP step */}
              {step === 'otp' && (
                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="fp-otp" className="label-text">6-Digit Code</label>
                    <input
                      id="fp-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className={`input-field text-center text-2xl tracking-[0.5em] font-mono ${errors.otp ? 'border-accent-red/50' : ''}`}
                      autoFocus
                    />
                    {errors.otp && <p className="text-accent-red text-xs mt-1">{errors.otp}</p>}
                    <p className="text-text-muted text-xs mt-2">Check your email inbox and spam folder</p>
                  </div>

                  <button type="submit" disabled={isLoading || otp.length !== 6} className="btn-primary w-full">
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
                    ) : (
                      <>Verify Code <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>

                  <button
                    type="button"
                    className="w-full text-center text-sm text-text-secondary hover:text-accent-green transition-colors"
                    onClick={async () => {
                      try {
                        await api.post('/auth/forgot-password', { email });
                        toast.success('Code resent!');
                      } catch {
                        toast.error('Could not resend code');
                      }
                    }}
                  >
                    Didn't receive the code? Resend
                  </button>
                </form>
              )}

              {/* Reset password step */}
              {step === 'reset' && (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="fp-new-password" className="label-text">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        id="fp-new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 chars, 1 uppercase, 1 digit"
                        className={`input-field pl-11 pr-11 ${errors.password ? 'border-accent-red/50' : ''}`}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-accent-red text-xs mt-1">{errors.password}</p>}
                  </div>

                  <div>
                    <label htmlFor="fp-confirm-password" className="label-text">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        id="fp-confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your new password"
                        className={`input-field pl-11 pr-11 ${errors.confirm ? 'border-accent-red/50' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirm && <p className="text-accent-red text-xs mt-1">{errors.confirm}</p>}
                  </div>

                  <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
                    ) : (
                      <>Reset Password <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Back to login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent-green transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ForgotPassword;
