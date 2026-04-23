import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, SkipForward, Camera, Upload } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../store/authStore';

const CONCERNS = ['Stress', 'Anxiety', 'Sleep', 'Mood', 'Relationships', 'Work', 'Grief', 'Other'];
const LANGUAGES = ['English', 'Hindi', 'Spanish', 'French', 'Arabic'];

function PersonalDetails(): React.ReactElement {
  const navigate = useNavigate();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [concerns, setConcerns] = useState<string[]>([]);

  // Step 2
  const [wellnessBaseline, setWellnessBaseline] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState('');
  const [anxiousTime, setAnxiousTime] = useState('');

  // Step 3
  const [preferredName, setPreferredName] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifSessions, setNotifSessions] = useState(false);

  const toggleConcern = (c: string) => {
    setConcerns((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const saveAndNext = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (step === 1) {
        if (dob) payload.date_of_birth = dob;
        if (gender) payload.gender = gender;
        if (occupation) payload.occupation = occupation;
        if (concerns.length) payload.concerns = concerns;
      } else if (step === 2) {
        if (wellnessBaseline !== null) payload.wellness_baseline = wellnessBaseline;
        if (sleepQuality) payload.sleep_quality = sleepQuality;
        if (anxiousTime) payload.anxious_time = anxiousTime;
      } else if (step === 3) {
        if (preferredName) payload.preferred_name = preferredName;
        payload.preferred_language = preferredLanguage;
        payload.notification_daily = notifDaily;
        payload.notification_weekly = notifWeekly;
        payload.notification_sessions = notifSessions;
        payload.onboarding_completed = true;
      }
      if (Object.keys(payload).length > 0) {
        await api.patch('/users/me/profile', payload);
      }
    } catch {
      // Non-critical
    } finally {
      setSaving(false);
    }
    if (step < 3) {
      setStep(step + 1);
    } else {
      await fetchProfile();
      navigate('/dashboard');
    }
  };

  const skip = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      try {
        await api.patch('/users/me/profile', { onboarding_skipped: true, onboarding_completed: true });
      } catch { /* noop */ }
      await fetchProfile();
      navigate('/dashboard');
    }
  };

  const wellnessEmojis = [
    { value: 1, emoji: '😔', label: '1' },
    { value: 2, emoji: '😟', label: '2' },
    { value: 3, emoji: '😐', label: '3' },
    { value: 4, emoji: '🙂', label: '4' },
    { value: 5, emoji: '😊', label: '5' },
  ];

  const sleepOptions = [
    { value: 'poor', emoji: '😴', label: 'Poor' },
    { value: 'okay', emoji: '😑', label: 'Okay' },
    { value: 'good', emoji: '😊', label: 'Good' },
    { value: 'great', emoji: '🌟', label: 'Great' },
  ];

  const anxiousOptions = ['Morning', 'Afternoon', 'Evening', 'Night', 'No specific time', "I'm not sure"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary bg-noise p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent-violet/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative"
      >
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: s === step ? 40 : 20,
                background: s <= step ? '#00e5a0' : '#1e2d45',
              }}
            />
          ))}
          <span className="text-xs text-text-muted ml-2">Step {step} of 3</span>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1 */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="glass-card p-8"
            >
              <h2 className="text-xl font-semibold mb-1">Let's personalize your experience 🌱</h2>
              <p className="text-text-secondary text-sm mb-6">You can skip any step — fill in later</p>

              <div className="space-y-4">
                <div>
                  <label className="label-text">Date of Birth</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label-text">Gender (optional)</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="input-field">
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label-text">Occupation (optional)</label>
                  <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Student, Engineer" className="input-field" />
                </div>
                <div>
                  <label className="label-text">What brings you here?</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CONCERNS.map((c) => (
                      <button
                        key={c}
                        onClick={() => toggleConcern(c)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          concerns.includes(c)
                            ? 'bg-accent-green/15 border-accent-green/30 text-accent-green'
                            : 'bg-bg-secondary border-border text-text-secondary hover:border-border-active'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="glass-card p-8"
            >
              <h2 className="text-xl font-semibold mb-1">Quick wellness check-in 💙</h2>
              <p className="text-text-secondary text-sm mb-6">Takes 30 seconds — completely optional</p>

              <div className="space-y-6">
                <div>
                  <label className="label-text">How would you rate your overall wellbeing right now?</label>
                  <div className="flex justify-center gap-4 mt-3">
                    {wellnessEmojis.map((w) => (
                      <button
                        key={w.value}
                        onClick={() => setWellnessBaseline(w.value)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                          wellnessBaseline === w.value
                            ? 'border-accent-green bg-accent-green/10 scale-110'
                            : 'border-border hover:border-border-active'
                        }`}
                      >
                        <span className="text-2xl">{w.emoji}</span>
                        <span className="text-xs text-text-muted">{w.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label-text">How is your sleep lately?</label>
                  <div className="flex gap-2 mt-2">
                    {sleepOptions.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setSleepQuality(s.value)}
                        className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                          sleepQuality === s.value
                            ? 'border-accent-green bg-accent-green/10'
                            : 'border-border hover:border-border-active'
                        }`}
                      >
                        <span className="text-xl">{s.emoji}</span>
                        <span className="text-xs text-text-secondary">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label-text">What time do you usually feel most anxious?</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {anxiousOptions.map((t) => (
                      <button
                        key={t}
                        onClick={() => setAnxiousTime(t)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          anxiousTime === t
                            ? 'bg-accent-green/15 border-accent-green/30 text-accent-green'
                            : 'bg-bg-secondary border-border text-text-secondary hover:border-border-active'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="glass-card p-8"
            >
              <h2 className="text-xl font-semibold mb-1">Almost done! 🎉</h2>
              <p className="text-text-secondary text-sm mb-6">Set up your preferences</p>

              <div className="space-y-4">
                <div>
                  <label className="label-text">Profile Photo (optional)</label>
                  <div className="flex gap-3 mt-1">
                    <button className="btn-secondary text-sm py-2 px-4">
                      <Upload className="w-4 h-4" /> Upload Image
                    </button>
                    <button className="btn-secondary text-sm py-2 px-4">
                      <Camera className="w-4 h-4" /> Take Photo
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label-text">Preferred name (how AI should address you)</label>
                  <input
                    type="text"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    placeholder='e.g. "Alex" or "Dr. Smith"'
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label-text">Preferred language for AI responses</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l}
                        onClick={() => setPreferredLanguage(l)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          preferredLanguage === l
                            ? 'bg-accent-green/15 border-accent-green/30 text-accent-green'
                            : 'bg-bg-secondary border-border text-text-secondary hover:border-border-active'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label-text">Notification preferences</label>
                  <div className="space-y-2 mt-1">
                    {[
                      { label: 'Daily wellness check-in reminder', checked: notifDaily, onChange: setNotifDaily },
                      { label: 'Weekly progress report', checked: notifWeekly, onChange: setNotifWeekly },
                      { label: 'Session reminders', checked: notifSessions, onChange: setNotifSessions },
                    ].map((n) => (
                      <label key={n.label} className="flex items-center gap-3 text-sm text-text-secondary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={n.checked}
                          onChange={(e) => n.onChange(e.target.checked)}
                          className="w-4 h-4 rounded border-border accent-accent-green"
                        />
                        {n.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={skip} className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors">
            <SkipForward className="w-4 h-4" />
            Skip for now
          </button>
          <button
            onClick={saveAndNext}
            disabled={saving}
            className="btn-primary py-2.5 px-6 text-sm"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
            ) : step < 3 ? (
              <>Next <ArrowRight className="w-4 h-4" /></>
            ) : (
              <>Complete Setup <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default PersonalDetails;
