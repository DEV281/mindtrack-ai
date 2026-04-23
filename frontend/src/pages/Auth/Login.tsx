import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Mail, Lock, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import TermsModal from './TermsModal';

function Login(): React.ReactElement {
  const navigate = useNavigate();
  const { login, demoLogin, isLoading, requiresOtp } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showTerms, setShowTerms] = useState(false);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await login(email, password);
      if (requiresOtp || useAuthStore.getState().requiresOtp) {
        navigate('/verify-otp');
      } else {
        navigate('/dashboard');
      }
    } catch {
      // Error handled in store
    }
  };

  const handleDemoLogin = async (): Promise<void> => {
    try {
      await demoLogin();
      navigate('/dashboard');
    } catch {
      // Error handled in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary bg-noise p-4 relative overflow-hidden">
      {/* Terms Modal */}
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />

      {/* Background Effects */}
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
          <p className="text-text-secondary mt-1.5 text-sm">
            Mental Wellness Support Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold mb-6">Welcome back</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="label-text">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@institution.edu"
                  className={`input-field pl-11 ${errors.email ? 'border-accent-red/50 focus:border-accent-red' : ''}`}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-accent-red text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="label-text">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`input-field pl-11 pr-11 ${errors.password ? 'border-accent-red/50 focus:border-accent-red' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-accent-red text-xs mt-1">{errors.password}</p>
              )}
              <div className="text-right mt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs text-text-secondary hover:text-accent-green transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-muted text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Demo Login */}
          <button
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="btn-secondary w-full group"
          >
            <Zap className="w-4 h-4 text-accent-amber group-hover:text-accent-amber" />
            Demo Login
          </button>

          {/* Google OAuth */}
          <a
            href="/api/auth/google"
            className="btn-secondary w-full mt-3 text-center"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </a>

          {/* Register Link */}
          <p className="text-center text-sm text-text-secondary mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-green hover:underline font-medium">
              Create one
            </Link>
          </p>

          {/* T&C Footer Link */}
          <p className="text-center text-xs text-text-muted mt-4">
            By logging in you agree to our{' '}
            <button
              onClick={() => setShowTerms(true)}
              className="text-text-secondary hover:text-accent-green hover:underline transition-colors"
            >
              Terms & Conditions
            </button>
          </p>
        </div>

        {/* Dev Mode Banner */}
        <div className="mt-4 p-3 rounded-xl bg-accent-amber/5 border border-accent-amber/20 text-center">
          <p className="text-xs text-accent-amber font-medium">
            🔧 Dev Mode — Demo: demo@mindtrack.ai / Demo@1234
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
