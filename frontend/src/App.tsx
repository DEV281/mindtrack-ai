import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import OTPVerify from './pages/Auth/OTPVerify';
import ForgotPassword from './pages/Auth/ForgotPassword';

// Main Pages
import Dashboard from './pages/Dashboard/Dashboard';
import LiveSession from './pages/Session/LiveSession';
import Reports from './pages/Reports/Reports';
import ReportDetail from './pages/Reports/ReportDetail';
import ConsultationRoom from './pages/Consultation/ConsultationRoom';
import ConversationHistory from './pages/Consultation/ConversationHistory';
import Settings from './pages/Settings/Settings';
import Activities from './pages/Activities/Activities';
import MoodJournal from './pages/Journal/MoodJournal';
import PrivacyPolicy from './pages/Legal/PrivacyPolicy';
import TermsAndConditions from './pages/Legal/TermsAndConditions';

// Onboarding
import PersonalDetails from './pages/Onboarding/PersonalDetails';
import ComplexityAssessment from './pages/Onboarding/ComplexityAssessment';

// Layout
import AppLayout from './pages/Layout/AppLayout';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: ProtectedRouteProps): React.ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/session" replace />;
  }
  return <>{children}</>;
}

function App(): React.ReactElement {
  const { theme } = useThemeStore();

  // Apply saved theme on initial load
  useEffect(() => {
    if (theme && theme !== 'calm') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Public Auth Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/verify-otp"
          element={<OTPVerify />}
        />
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <PersonalDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment"
          element={
            <ProtectedRoute>
              <ComplexityAssessment />
            </ProtectedRoute>
          }
        />

        {/* Public Legal Routes (no auth required) */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />

        {/* Protected Routes with Layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/session" element={<LiveSession />} />
          <Route path="/consultation" element={<ConsultationRoom />} />
          <Route path="/consultation/history" element={<ConversationHistory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:id" element={<ReportDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/journal" element={<MoodJournal />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/session" replace />} />
        <Route path="*" element={<Navigate to="/session" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
