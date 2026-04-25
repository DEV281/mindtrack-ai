import { create } from 'zustand';
import api, { setAccessToken, setRefreshToken } from '../api/client';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string;
  institution: string;
  role: string;
  is_verified: boolean;
  created_at: string;
  // Onboarding fields
  date_of_birth?: string;
  gender?: string;
  occupation?: string;
  concerns?: string[];
  wellness_baseline?: number;
  sleep_quality?: string;
  anxious_time?: string;
  preferred_name?: string;
  profile_photo_url?: string;
  preferred_language?: string;
  onboarding_completed?: boolean;
  onboarding_skipped?: boolean;
  // Complexity
  complexity_profile?: string;
  complexity_score?: number;
  // T&C
  tnc_accepted?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingEmail: string | null;
  requiresOtp: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  demoLogin: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  setUser: (user: User) => void;
  reset: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  institution: string;
}

// Helper to persist/restore pendingEmail across page reloads
const PENDING_EMAIL_KEY = 'mindtrack_pending_email';

const getStoredPendingEmail = (): string | null => {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY);
  } catch {
    return null;
  }
};

const setStoredPendingEmail = (email: string | null): void => {
  try {
    if (email) {
      sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    } else {
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
    }
  } catch {
    // sessionStorage unavailable
  }
};

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  pendingEmail: getStoredPendingEmail(),
  requiresOtp: !!getStoredPendingEmail(),

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.requires_otp) {
        setStoredPendingEmail(email);
        set({ pendingEmail: email, requiresOtp: true, isLoading: false });
        toast.success('OTP sent to your email');
      } else {
        setAccessToken(data.access_token);
        if (data.refresh_token) setRefreshToken(data.refresh_token);
        set({ isAuthenticated: true, isLoading: false });
        await get().fetchProfile();
      }
    } catch (error) {
      set({ isLoading: false });
      const msg =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Login failed';
      toast.error(msg);
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/register', data);
      setStoredPendingEmail(data.email);
      // Store debug OTP if email failed (for display on verify page)
      if (response.data.debug_otp) {
        try { sessionStorage.setItem('mindtrack_debug_otp', response.data.debug_otp); } catch {}
      }
      set({
        pendingEmail: data.email,
        requiresOtp: true,
        isLoading: false,
      });
      if (response.data.email_sent === false) {
        if (response.data.debug_otp) {
          toast('Account created! Use the code shown on the next screen.', { icon: '🔑' });
        } else {
          toast.error('Account created but OTP email failed to send. Use "Resend Code" on the next screen.');
        }
      } else {
        toast.success(response.data.message || 'Registration successful. Check your email for OTP.');
      }
    } catch (error) {
      set({ isLoading: false });
      const msg =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Registration failed';
      toast.error(msg);
      throw error;
    }
  },

  verifyOtp: async (email: string, otp: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp });
      setAccessToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);
      setStoredPendingEmail(null);
      set({
        isAuthenticated: true,
        requiresOtp: false,
        pendingEmail: null,
        isLoading: false,
      });
      await get().fetchProfile();
      toast.success('Verified successfully');
    } catch (error) {
      set({ isLoading: false });
      const msg =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Invalid OTP';
      toast.error(msg);
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    setAccessToken(null);
    setStoredPendingEmail(null);
    set({
      user: null,
      isAuthenticated: false,
      pendingEmail: null,
      requiresOtp: false,
    });
  },

  demoLogin: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', {
        email: 'demo@mindtrack.ai',
        password: 'Demo@1234',
      });
      if (data.requires_otp) {
        const otpData = await api.post('/auth/verify-otp', {
          email: 'demo@mindtrack.ai',
          otp: data.demo_otp || '123456',
        });
        setAccessToken(otpData.data.access_token);
        if (otpData.data.refresh_token) setRefreshToken(otpData.data.refresh_token);
      } else {
        setAccessToken(data.access_token);
        if (data.refresh_token) setRefreshToken(data.refresh_token);
      }
      set({ isAuthenticated: true, isLoading: false });
      await get().fetchProfile();
      toast.success('Welcome to MindTrack AI Demo!');
    } catch {
      // Backend not available — fall back to client-side demo mode
      const demoUser: User = {
        id: 'demo-001',
        email: 'demo@mindtrack.ai',
        name: 'Dr. Demo User',
        institution: 'MindTrack Research Lab',
        role: 'Researcher',
        is_verified: true,
        created_at: '2026-01-15T10:00:00Z',
      };
      setAccessToken('demo-token-mindtrack-2026');
      set({
        user: demoUser,
        isAuthenticated: true,
        isLoading: false,
      });
      toast.success('Welcome to MindTrack AI Demo! (Offline Mode)');
    }
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get<User>('/users/me/profile');
      set({ user: data });
    } catch {
      // Fallback to basic profile
      try {
        const { data } = await api.get<User>('/users/me');
        set({ user: data });
      } catch {
        // Profile fetch failed silently
      }
    }
  },

  setUser: (user: User) => set({ user }),
  reset: () => {
    setStoredPendingEmail(null);
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      pendingEmail: null,
      requiresOtp: false,
    });
  },
}));

export default useAuthStore;
export type { User, AuthState };
