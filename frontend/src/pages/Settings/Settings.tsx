import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Eye,
  EyeOff,
  Lock,
  Volume2,
  Play,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useSpeechOutput } from '../../hooks/useSpeechOutput';
import useThemeStore, { type Theme } from '../../store/themeStore';

function Settings(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState('profile');

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    institution: user?.institution || '',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    newPassword: '',
    confirm: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    highRiskAlerts: true,
    weeklyReports: false,
    sessionReminders: true,
  });

  const [appearance, setAppearance] = useState({
    theme: 'dark',
    fontSize: 'medium',
    animations: true,
  });

  // Voice settings hook
  const {
    speak, stop: stopSpeaking, isSpeaking,
    availableVoices, selectedVoice, setVoice,
    settings: voiceSettings, updateSettings: updateVoiceSettings,
    setRate, setPitch, setVolume: setSpeechVolume,
  } = useSpeechOutput();

  const handleSaveProfile = async (): Promise<void> => {
    try {
      await api.put('/users/me', profile);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    if (passwords.newPassword !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await api.put('/users/me/password', {
        current_password: passwords.current,
        new_password: passwords.newPassword,
      });
      toast.success('Password changed');
      setPasswords({ current: '', newPassword: '', confirm: '' });
    } catch {
      toast.error('Failed to change password');
    }
  };

  const handleTestVoice = (): void => {
    speak(
      'Hello! I am your MindTrack wellness companion. I am here to support you today.',
    );
  };

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'appearance', label: 'Appearance', icon: Palette },
    { key: 'voice', label: 'Voice & Speech', icon: Volume2 },
  ];

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">My Profile</h1>
        <p className="text-text-secondary text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="glass-card p-3 h-fit">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-accent-green/10 text-accent-green'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
              <h2 className="section-title mb-5">Profile Information</h2>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="label-text">Full Name</label>
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text">Email</label>
                  <input
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="input-field"
                    disabled
                  />
                  <p className="text-xs text-text-muted mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="label-text">Institution</label>
                  <input
                    value={profile.institution}
                    onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-3 text-sm text-text-secondary">
                    <span>Role: <span className="badge-violet">{user?.role || 'Researcher'}</span></span>
                    <span>Joined: <span className="text-text-muted font-mono">{user?.created_at?.split('T')[0] || '2026-01-01'}</span></span>
                  </div>
                </div>
                <button onClick={handleSaveProfile} className="btn-primary">
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
              <h2 className="section-title mb-5">Change Password</h2>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="label-text">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      className="input-field pl-11"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-text">New Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text">Confirm New Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="input-field"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPasswords ? 'Hide' : 'Show'} passwords
                </button>
                <button onClick={handleChangePassword} className="btn-primary">
                  <Shield className="w-4 h-4" /> Update Password
                </button>
              </div>
            </motion.div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
              <h2 className="section-title mb-5">Notification Preferences</h2>
              <div className="space-y-4 max-w-lg">
                {[
                  { key: 'emailAlerts' as const, label: 'Email Alerts', desc: 'Receive email notifications for important events' },
                  { key: 'highRiskAlerts' as const, label: 'High Risk Alerts', desc: 'Get notified when a session detects high risk' },
                  { key: 'weeklyReports' as const, label: 'Weekly Reports', desc: 'Receive weekly summary reports via email' },
                  { key: 'sessionReminders' as const, label: 'Session Reminders', desc: 'Reminders for scheduled sessions' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-bg-secondary border border-border">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{item.label}</p>
                      <p className="text-xs text-text-muted">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                      className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                        notifications[item.key] ? 'bg-accent-green' : 'bg-bg-hover'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          notifications[item.key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
              <h2 className="section-title mb-2">Appearance</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                Choose a colour theme that supports your mood.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                {([
                  { id: 'calm', label: 'Calm Blue', emoji: '🌊', primary: '#5b9bd5', bg: '#f0f4f8', desc: 'Serene & focused' },
                  { id: 'midnight', label: 'Midnight', emoji: '🌙', primary: '#7c6fd4', bg: '#12121e', desc: 'Dark & moody' },
                  { id: 'forest', label: 'Forest', emoji: '🌿', primary: '#4a9a6b', bg: '#f0f7f4', desc: 'Earthy & grounded' },
                  { id: 'lavender', label: 'Lavender', emoji: '💜', primary: '#9d8fcc', bg: '#f5f3ff', desc: 'Soft & dreamy' },
                  { id: 'sunrise', label: 'Sunrise', emoji: '🌅', primary: '#e8a838', bg: '#fffdf7', desc: 'Warm & energising' },
                ] as { id: Theme; label: string; emoji: string; primary: string; bg: string; desc: string }[]).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    style={{
                      border: '2px solid',
                      borderColor: theme === t.id ? t.primary : 'var(--border)',
                      borderRadius: 16,
                      padding: '18px 14px',
                      background: t.bg,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'Nunito, sans-serif',
                      transition: 'all 0.2s',
                      boxShadow: theme === t.id ? `0 0 0 3px ${t.primary}33` : 'none',
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{t.emoji}</div>
                    <div style={{
                      width: 32, height: 6, borderRadius: 3, marginBottom: 8,
                      background: t.primary,
                    }} />
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#2c3e50', margin: 0 }}>{t.label}</p>
                    <p style={{ fontSize: 11, color: '#8fa8b8', margin: '3px 0 0' }}>{t.desc}</p>
                  </button>
                ))}
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 18 }}>
                Theme is saved automatically and persists across sessions.
              </p>
            </motion.div>
          )}

          {/* Voice & Speech Tab */}
          {activeTab === 'voice' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6">
              <h2 className="section-title mb-5">🔊 Voice & Speech Settings</h2>
              <div className="space-y-5 max-w-lg">
                {/* AI Voice */}
                <div>
                  <label className="label-text">AI Voice</label>
                  <select
                    value={selectedVoice?.name || ''}
                    onChange={(e) => {
                      const v = availableVoices.find((voice) => voice.name === e.target.value);
                      if (v) setVoice(v);
                    }}
                    className="input-field"
                  >
                    {availableVoices.length === 0 && (
                      <option value="">Loading voices...</option>
                    )}
                    {availableVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speaking Rate */}
                <div>
                  <label className="label-text">
                    Speaking Rate: {voiceSettings.rate.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min={70}
                    max={130}
                    value={Math.round(voiceSettings.rate * 100)}
                    onChange={(e) => setRate(Number(e.target.value) / 100)}
                    className="w-full"
                    style={{ accentColor: '#00e5a0' }}
                  />
                  <div className="flex justify-between text-xs text-text-muted mt-1">
                    <span>0.7 (Slow)</span>
                    <span>1.3 (Fast)</span>
                  </div>
                </div>

                {/* Voice Pitch */}
                <div>
                  <label className="label-text">
                    Voice Pitch: {voiceSettings.pitch.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min={80}
                    max={120}
                    value={Math.round(voiceSettings.pitch * 100)}
                    onChange={(e) => setPitch(Number(e.target.value) / 100)}
                    className="w-full"
                    style={{ accentColor: '#00e5a0' }}
                  />
                  <div className="flex justify-between text-xs text-text-muted mt-1">
                    <span>0.8 (Lower)</span>
                    <span>1.2 (Higher)</span>
                  </div>
                </div>

                {/* Volume */}
                <div>
                  <label className="label-text">
                    Volume: {Math.round(voiceSettings.volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(voiceSettings.volume * 100)}
                    onChange={(e) => setSpeechVolume(Number(e.target.value) / 100)}
                    className="w-full"
                    style={{ accentColor: '#00e5a0' }}
                  />
                  <div className="flex justify-between text-xs text-text-muted mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Auto-speak AI responses */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-bg-secondary border border-border">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Auto-speak AI responses</p>
                    <p className="text-xs text-text-muted">AI will speak all responses out loud</p>
                  </div>
                  <button
                    onClick={() => updateVoiceSettings({ autoSpeak: !voiceSettings.autoSpeak })}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                      voiceSettings.autoSpeak ? 'bg-accent-green' : 'bg-bg-hover'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        voiceSettings.autoSpeak ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Auto-listen after AI speaks */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-bg-secondary border border-border">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Auto-listen after AI speaks</p>
                    <p className="text-xs text-text-muted">Automatically start listening when AI finishes speaking</p>
                  </div>
                  <button
                    onClick={() => updateVoiceSettings({ autoListen: !voiceSettings.autoListen })}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                      voiceSettings.autoListen ? 'bg-accent-green' : 'bg-bg-hover'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        voiceSettings.autoListen ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Speech Language */}
                <div>
                  <label className="label-text">Speech Language</label>
                  <select
                    value={voiceSettings.language}
                    onChange={(e) => updateVoiceSettings({ language: e.target.value })}
                    className="input-field w-48"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="en-AU">English (Australia)</option>
                    <option value="en-IN">English (India)</option>
                  </select>
                </div>

                {/* Test Voice */}
                <button
                  onClick={isSpeaking ? stopSpeaking : handleTestVoice}
                  className={`${isSpeaking ? 'btn-danger' : 'btn-primary'} w-full justify-center`}
                >
                  <Play className="w-4 h-4" />
                  {isSpeaking ? 'Stop Test' : '▶ Test Voice'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
