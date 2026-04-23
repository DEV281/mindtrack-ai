import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  MessageCircle,
  History,
  FileText,
  Sparkles,
  Settings,
  LogOut,
  Heart,
  Menu,
  X,
  Activity,
  BookHeart,
} from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../../store/authStore';
import CrisisResources from '../../components/CrisisResources';
import TermsConsentModal, { hasAcceptedTerms, markTermsAccepted } from '../../components/TermsConsentModal';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/activities', icon: Sparkles, label: 'Feel Better' },
  { path: '/journal', icon: BookHeart, label: 'Mood Journal' },
  { path: '/session', icon: Activity, label: 'My Session' },
  { path: '/consultation', icon: MessageCircle, label: 'Talk to AI' },
  { path: '/consultation/history', icon: History, label: 'Past Conversations' },
  { path: '/reports', icon: FileText, label: 'My Journey' },
  { path: '/settings', icon: Settings, label: 'My Profile' },
];

function AppLayout(): React.ReactElement {
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ── Terms Consent Gate ──────────────────────────────────────────────────────
  // Use a stable user identifier — falls back to email if id not available
  const userId = user?.id ?? user?.email ?? 'guest'
  const [termsAccepted, setTermsAccepted] = useState<boolean>(
    () => hasAcceptedTerms(userId)
  )

  const handleAccept = () => {
    markTermsAccepted(userId)
    setTermsAccepted(true)
  }

  const handleReject = async () => {
    await logout()
    // Navigation handled by ProtectedRoute redirect
  }
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* ── Terms Consent Modal (blocks entire app until accepted) ── */}
      {!termsAccepted && (
        <TermsConsentModal
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
      {/* Sidebar - Desktop */}
      <aside
        className="hidden lg:flex flex-col w-64 border-r"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--lavender))' }}
          >
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              MindTrack
            </h1>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: -2 }}>AI v4</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path === '/consultation/history' && location.pathname.startsWith('/consultation/history'));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-200"
                style={{
                  borderRadius: '50px',
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <Icon className="w-5 h-5" />
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--primary)' }}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #9d8fcc, #5b9bd5)', flexShrink: 0 }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.name || 'User'}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email || ''}</p>
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Legal Footer */}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              padding: '10px 16px',
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--text-hint)',
            }}
          >
            <a href="/privacy" style={{ color: 'var(--text-hint)', textDecoration: 'none' }}
               onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = 'var(--primary)')}
               onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = 'var(--text-hint)')}>
              Privacy
            </a>
            {' · '}
            <a href="/terms" style={{ color: 'var(--text-hint)', textDecoration: 'none' }}
               onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = 'var(--primary)')}
               onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = 'var(--text-hint)')}>
              Terms
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--lavender))' }}
            >
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>MindTrack</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 border-b p-3 space-y-1"
            style={{
              background: 'white',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all"
                  style={{
                    borderRadius: '50px',
                    background: isActive ? 'var(--primary-light)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  }}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              );
            })}
            <button
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-pill text-sm font-medium w-full"
              style={{ color: 'var(--rose)' }}
            >
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
            <div style={{ padding: '8px 16px', textAlign: 'center', fontSize: 11, color: 'var(--text-hint)' }}>
              <a href="/privacy" style={{ color: 'var(--text-hint)', textDecoration: 'none' }}>Privacy</a>
              {' · '}
              <a href="/terms" style={{ color: 'var(--text-hint)', textDecoration: 'none' }}>Terms</a>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-0 mt-14 lg:mt-0 overflow-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Global crisis help button */}
      <CrisisResources />
    </div>
  );
}

export default AppLayout;
