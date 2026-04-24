import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Brain, Activity, Video, Mic, MessageSquare, Shield,
  ArrowRight, CheckCircle2, ChevronDown, Sparkles,
  Heart, Lock, BarChart3, Menu, X
} from 'lucide-react';

/* ── animation helpers ── */
const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.12 } } };

/* ── data ── */
const steps = [
  { icon: Video, title: 'Facial Expression Analysis', desc: 'On-device micro-expression detection identifies stress and anxiety patterns through your camera — securely and privately.' },
  { icon: Mic, title: 'Voice Tone Analysis', desc: 'Acoustic AI detects vocal markers of fatigue, depression, and stress without ever storing your audio recordings.' },
  { icon: Brain, title: 'Contextual AI Engine', desc: 'Our empathetic AI synthesizes visual, vocal, and textual cues to deliver deeply personalised therapeutic support.' },
];

const features = [
  { icon: Activity, title: 'Real-Time Tracking', desc: 'Continuous emotional state monitoring during live sessions with instant visual feedback.' },
  { icon: MessageSquare, title: 'Empathetic AI Chat', desc: 'Converse with an AI trained on psychological frameworks to listen, understand, and support.' },
  { icon: Lock, title: 'Complete Privacy', desc: 'End-to-end encryption. Zero data selling. You own and control every piece of your data.' },
  { icon: BarChart3, title: 'Insightful Reports', desc: 'Weekly and monthly analytics reveal trends, triggers, and progress in your mental health journey.' },
  { icon: Heart, title: 'Mood Journal', desc: 'Daily guided journaling with AI-powered sentiment analysis to track your emotional patterns.' },
  { icon: Sparkles, title: 'Wellness Activities', desc: 'Breathing exercises, mindfulness games, and gratitude practices curated for your state of mind.' },
];

const faqs = [
  { q: 'Is MindTrack AI a replacement for a therapist?', a: 'No. MindTrack AI is a supplemental wellness tool. It provides AI-driven support but is not a substitute for professional medical advice, diagnosis, or treatment.' },
  { q: 'How does real-time emotion detection work?', a: 'We use on-device processing to analyse facial micro-expressions and vocal intonations during live sessions. Data is processed instantly and never recorded.' },
  { q: 'Is my video and audio data saved?', a: 'Never. All streams are processed in real-time on your device. No recordings are saved to any server, ensuring complete privacy.' },
  { q: 'Can MindTrack AI detect stress and anxiety?', a: 'Yes. Our multi-modal AI analyses physiological signals, vocal markers, and text sentiment to identify patterns correlated with stress and anxiety.' },
  { q: 'Is MindTrack AI free to use?', a: 'Yes, the core platform is completely free. We believe mental health support should be accessible to everyone.' },
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b" style={{ background: 'rgba(240,244,248,0.85)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--lavender))' }}>
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>MindTrack AI</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {['About', 'How it Works', 'Features', 'FAQ'].map(t => (
              <a key={t} href={`#${t.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-medium transition-colors hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>{t}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold px-5 py-2 rounded-pill transition-all hover:opacity-80" style={{ color: 'var(--primary-dark)' }}>Log in</Link>
            <Link to="/register" className="btn-primary text-sm !py-2 !px-6">Get Started <ArrowRight className="w-4 h-4" /></Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden px-5 pb-5 flex flex-col gap-3" style={{ background: 'var(--bg-surface)' }}>
            {['About', 'How it Works', 'Features', 'FAQ'].map(t => (
              <a key={t} href={`#${t.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setMobileOpen(false)} className="py-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t}</a>
            ))}
            <Link to="/login" className="py-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}>Log in</Link>
            <Link to="/register" className="btn-primary text-sm text-center !py-2.5">Get Started</Link>
          </div>
        )}
      </nav>

      <main>
        {/* ─── Hero ─── */}
        <section className="relative pt-36 pb-24 lg:pt-48 lg:pb-36 overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-20 -left-32 w-96 h-96 rounded-full opacity-30 blur-3xl animate-breathe" style={{ background: 'var(--primary-light)' }} />
          <div className="absolute bottom-10 -right-24 w-80 h-80 rounded-full opacity-20 blur-3xl animate-breathe" style={{ background: 'var(--lavender-light)', animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl" style={{ background: 'var(--primary)' }} />

          <div className="relative max-w-4xl mx-auto px-5 text-center">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.div variants={fade} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-8" style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)' }}>
                <Sparkles className="w-3.5 h-3.5" /> AI-Powered Mental Wellness
              </motion.div>

              <motion.h1 variants={fade} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6" style={{ color: 'var(--text-primary)' }}>
                Your Mind{' '}
                <span className="gradient-text">Deserves</span>
                <br />Gentle Care
              </motion.h1>

              <motion.p variants={fade} className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Advanced emotion analysis, stress detection, and personalised AI therapy — all in a safe, private space designed around your wellbeing.
              </motion.p>

              <motion.div variants={fade} className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/register" className="btn-primary text-base !py-3.5 !px-8">
                  Start Your Journey <ArrowRight className="w-5 h-5" />
                </Link>
                <a href="#how-it-works" className="btn-ghost text-base !py-3.5 !px-8">
                  See How it Works
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ─── About ─── */}
        <section id="about" className="py-20 lg:py-28">
          <div className="max-w-6xl mx-auto px-5">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
                <motion.p variants={fade} className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--primary)' }}>About MindTrack AI</motion.p>
                <motion.h2 variants={fade} className="text-3xl lg:text-4xl font-bold tracking-tight mb-6">Built on empathy,{' '}<span className="gradient-text">powered by AI</span></motion.h2>
                <motion.p variants={fade} className="text-base leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
                  We believe mental health support should be accessible, intelligent, and deeply personal. MindTrack AI leverages cutting-edge artificial intelligence to understand not just what you say, but how you truly feel.
                </motion.p>
                <motion.ul variants={stagger} className="space-y-4">
                  {['Privacy-first, encrypted architecture', 'Empathetic AI trained on psychological frameworks', '24/7 availability — whenever you need support'].map((item, i) => (
                    <motion.li key={i} variants={fade} className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--green)' }} />
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="relative">
                <div className="absolute -inset-6 rounded-full opacity-20 blur-3xl" style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--lavender-light))' }} />
                <img src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000&auto=format&fit=crop" alt="Peaceful meditation and mental wellness" className="relative rounded-3xl shadow-calm-lg w-full h-[400px] object-cover" loading="lazy" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── How it Works ─── */}
        <section id="how-it-works" className="py-20 lg:py-28" style={{ background: 'var(--bg-surface)' }}>
          <div className="max-w-6xl mx-auto px-5">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
              <motion.p variants={fade} className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--primary)' }}>How it Works</motion.p>
              <motion.h2 variants={fade} className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">Three layers of{' '}<span className="gradient-text">intelligent care</span></motion.h2>
              <motion.p variants={fade} className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>Multiple AI models work together to build a holistic understanding of your emotional state.</motion.p>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid md:grid-cols-3 gap-6">
              {steps.map((s, i) => (
                <motion.div key={i} variants={fade} className="glass-card-hover p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    <s.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-3">{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section id="features" className="py-20 lg:py-28">
          <div className="max-w-6xl mx-auto px-5">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
              <motion.p variants={fade} className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--primary)' }}>Features</motion.p>
              <motion.h2 variants={fade} className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">Everything your mind{' '}<span className="gradient-text">needs</span></motion.h2>
              <motion.p variants={fade} className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>A complete toolkit to track, understand, and nurture your mental wellbeing.</motion.p>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <motion.div key={i} variants={fade} className="glass-card-hover p-7">
                  <div className="w-11 h-11 rounded-xl mb-5 flex items-center justify-center" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold mb-2">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── Demo ─── */}
        <section id="demo" className="py-20 lg:py-28" style={{ background: 'var(--bg-surface)' }}>
          <div className="max-w-5xl mx-auto px-5 text-center">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.p variants={fade} className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--primary)' }}>Preview</motion.p>
              <motion.h2 variants={fade} className="text-3xl lg:text-4xl font-bold tracking-tight mb-12">Experience the{' '}<span className="gradient-text">dashboard</span></motion.h2>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent z-10 pointer-events-none" />
              <div className="glass-card p-2 sm:p-3">
                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop" alt="MindTrack AI Dashboard showing mental health analytics and emotion tracking" className="rounded-2xl w-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-500" loading="lazy" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section id="faq" className="py-20 lg:py-28">
          <div className="max-w-2xl mx-auto px-5">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
              <motion.p variants={fade} className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--primary)' }}>FAQ</motion.p>
              <motion.h2 variants={fade} className="text-3xl font-bold tracking-tight mb-4">Common{' '}<span className="gradient-text">questions</span></motion.h2>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger} className="space-y-3">
              {faqs.map((f, i) => (
                <motion.details key={i} variants={fade} className="group glass-card overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between p-5 cursor-pointer text-sm font-semibold select-none">
                    {f.q}
                    <ChevronDown className="w-4 h-4 flex-shrink-0 ml-4 transition-transform group-open:rotate-180" style={{ color: 'var(--text-muted)' }} />
                  </summary>
                  <div className="px-5 pb-5 text-sm leading-relaxed -mt-1" style={{ color: 'var(--text-secondary)' }}>{f.a}</div>
                </motion.details>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="py-20 lg:py-28" style={{ background: 'var(--bg-surface)' }}>
          <div className="max-w-3xl mx-auto px-5 text-center">
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
              <motion.h2 variants={fade} className="text-3xl lg:text-4xl font-bold tracking-tight mb-5">Ready to prioritise your{' '}<span className="gradient-text">wellbeing</span>?</motion.h2>
              <motion.p variants={fade} className="text-base mb-10" style={{ color: 'var(--text-secondary)' }}>Join people finding their safe space with MindTrack AI. It's free, private, and always here for you.</motion.p>
              <motion.div variants={fade}>
                <Link to="/register" className="btn-primary text-lg !py-4 !px-10">Create Your Free Account</Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t py-12" style={{ borderColor: 'var(--border)', background: 'var(--bg-base)' }}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--lavender))' }}>
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold tracking-tight">MindTrack AI</span>
              </div>
              <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Real-time mental health detection and personalised AI therapy. Your safe space for wellness.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--text-muted)' }}>Product</h4>
              <ul className="space-y-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><a href="#features" className="hover:opacity-70 transition-opacity">Features</a></li>
                <li><a href="#how-it-works" className="hover:opacity-70 transition-opacity">How it Works</a></li>
                <li><Link to="/login" className="hover:opacity-70 transition-opacity">Log In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--text-muted)' }}>Legal</h4>
              <ul className="space-y-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><Link to="/privacy" className="hover:opacity-70 transition-opacity">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:opacity-70 transition-opacity">Terms of Service</Link></li>
                <li><a href="mailto:support@mindtrack-ai.com" className="hover:opacity-70 transition-opacity">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <p>&copy; {new Date().getFullYear()} MindTrack AI. All rights reserved.</p>
            <p className="mt-2 md:mt-0">Designed with empathy ♡</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
