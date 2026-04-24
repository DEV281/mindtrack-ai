import { useState, FormEvent, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Mail, Lock, User, Building2, Eye, EyeOff, ArrowRight, Check, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import TermsModal from './TermsModal';
import PrivacyPolicy from './PrivacyPolicy';

interface FormData {
  name: string;
  email: string;
  institution: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  institution?: string;
  password?: string;
  confirmPassword?: string;
}

function Register(): React.ReactElement {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();

  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    institution: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [tncAccepted, setTncAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const passwordCriteria = useMemo(() => {
    const p = form.password;
    return [
      { label: '8+ characters', met: p.length >= 8 },
      { label: 'Uppercase letter', met: /[A-Z]/.test(p) },
      { label: 'Lowercase letter', met: /[a-z]/.test(p) },
      { label: 'Number', met: /\d/.test(p) },
      { label: 'Special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(p) },
    ];
  }, [form.password]);

  const passwordStrength = useMemo(() => {
    const metCount = passwordCriteria.filter((c) => c.met).length;
    if (metCount <= 1) return { level: 'Weak', color: 'bg-accent-red', width: '20%' };
    if (metCount <= 2) return { level: 'Fair', color: 'bg-accent-orange', width: '40%' };
    if (metCount <= 3) return { level: 'Good', color: 'bg-accent-amber', width: '60%' };
    if (metCount <= 4) return { level: 'Strong', color: 'bg-accent-green', width: '80%' };
    return { level: 'Very Strong', color: 'bg-accent-green', width: '100%' };
  }, [passwordCriteria]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Invalid email';
    if (!form.institution.trim()) newErrors.institution = 'Institution is required';
    if (!form.password) newErrors.password = 'Password is required';
    else if (passwordCriteria.filter((c) => c.met).length < 4)
      newErrors.password = 'Password does not meet strength requirements';
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;
    if (!tncAccepted) {
      toast.error('Please accept the Terms & Conditions to continue');
      return;
    }
    try {
      await register({
        name: form.name,
        email: form.email,
        institution: form.institution,
        password: form.password,
      });
      toast.success('Account created! Please verify with the OTP sent to your email.');
      navigate('/verify-otp');
    } catch (error) {
      // Error is also handled in store but we ensure the user sees something
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (detail) {
        toast.error(detail);
      } else {
        toast.error('Registration failed — please check your details and try again');
      }
    }
  };

  const updateField = (field: keyof FormData, value: string): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary bg-noise p-4 relative overflow-hidden">
      {/* Modals */}
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} onAccept={() => setTncAccepted(true)} />
      <PrivacyPolicy isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent-violet/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-grid-pattern bg-[size:60px_60px] opacity-30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-green to-emerald-400 shadow-lg shadow-accent-green/20 mb-3">
            <Brain className="w-8 h-8 text-bg-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
          <p className="text-text-secondary mt-1 text-sm">Join the MindTrack AI platform</p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="reg-name" className="label-text">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="reg-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Dr. Jane Smith"
                  className={`input-field pl-11 ${errors.name ? 'border-accent-red/50' : ''}`}
                />
              </div>
              {errors.name && <p className="text-accent-red text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="label-text">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="reg-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="you@institution.edu"
                  className={`input-field pl-11 ${errors.email ? 'border-accent-red/50' : ''}`}
                />
              </div>
              {errors.email && <p className="text-accent-red text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Institution */}
            <div>
              <label htmlFor="reg-institution" className="label-text">Institution</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="reg-institution"
                  type="text"
                  value={form.institution}
                  onChange={(e) => updateField('institution', e.target.value)}
                  placeholder="Stanford University"
                  className={`input-field pl-11 ${errors.institution ? 'border-accent-red/50' : ''}`}
                />
              </div>
              {errors.institution && <p className="text-accent-red text-xs mt-1">{errors.institution}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="label-text">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="••••••••"
                  className={`input-field pl-11 pr-11 ${errors.password ? 'border-accent-red/50' : ''}`}
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

              {/* Strength Indicator */}
              {form.password && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: passwordStrength.width }}
                        className={`h-full rounded-full ${passwordStrength.color} transition-all`}
                      />
                    </div>
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                      {passwordStrength.level}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {passwordCriteria.map((criterion) => (
                      <div key={criterion.label} className="flex items-center gap-1.5 text-xs">
                        {criterion.met ? (
                          <Check className="w-3 h-3 text-accent-green" />
                        ) : (
                          <X className="w-3 h-3 text-text-muted" />
                        )}
                        <span className={criterion.met ? 'text-accent-green' : 'text-text-muted'}>
                          {criterion.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm" className="label-text">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="reg-confirm"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  className={`input-field pl-11 ${errors.confirmPassword ? 'border-accent-red/50' : ''}`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-accent-red text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* T&C Checkbox */}
            <div className="flex items-start gap-3 mt-3">
              <input
                type="checkbox"
                id="tnc-checkbox"
                checked={tncAccepted}
                onChange={(e) => setTncAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border accent-accent-green cursor-pointer"
              />
              <label htmlFor="tnc-checkbox" className="text-xs text-text-secondary leading-relaxed cursor-pointer">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-accent-green hover:underline font-medium"
                >
                  Terms & Conditions
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="text-accent-green hover:underline font-medium"
                >
                  Privacy Policy
                </button>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !tncAccepted}
              className="btn-primary w-full mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-green hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default Register;
