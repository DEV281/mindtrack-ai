import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Brain, 
  Activity, 
  Video, 
  Mic, 
  MessageSquare, 
  Shield, 
  ArrowRight,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans selection:bg-accent-primary selection:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-md border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-8 h-8 text-accent-primary" />
            <span className="text-xl font-bold tracking-tight">MindTrack AI</span>
          </div>
          <div className="hidden md:flex space-x-8">
            <a href="#about" className="text-text-secondary hover:text-accent-primary transition-colors">About</a>
            <a href="#features" className="text-text-secondary hover:text-accent-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-text-secondary hover:text-accent-primary transition-colors">How it Works</a>
            <a href="#faq" className="text-text-secondary hover:text-accent-primary transition-colors">FAQ</a>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/login" className="text-text-secondary hover:text-text-primary transition-colors font-medium">Log in</Link>
            <Link to="/register" className="bg-accent-primary text-white px-5 py-2 rounded-full font-medium hover:bg-accent-secondary transition-all transform hover:scale-105 shadow-lg shadow-accent-primary/25">Get Started</Link>
          </div>
        </div>
      </nav>

      <main>
        {/* 1. Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent-primary/20 via-bg-primary to-bg-primary -z-10"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
                Real-Time <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-purple-500">Mental Health</span> Detection using AI
              </h1>
              <p className="text-xl text-text-secondary mb-10 max-w-3xl mx-auto leading-relaxed">
                Your safe space for wellness. Advanced emotion analysis, stress detection, and personalized AI therapy right from your device.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <Link to="/register" className="bg-accent-primary text-white px-8 py-4 rounded-full text-lg font-semibold flex items-center hover:bg-accent-secondary transition-all transform hover:scale-105 shadow-xl shadow-accent-primary/30 w-full sm:w-auto justify-center">
                  Start Your Journey <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <a href="#demo" className="px-8 py-4 rounded-full text-lg font-semibold border-2 border-border-primary hover:border-accent-primary hover:text-accent-primary transition-all w-full sm:w-auto text-center bg-bg-secondary/50 backdrop-blur-sm">
                  See it in Action
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 2. About MindTrack AI */}
        <section id="about" className="py-20 bg-bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6">About MindTrack AI</h2>
                <p className="text-lg text-text-secondary mb-6 leading-relaxed">
                  MindTrack AI is built on the belief that mental health support should be accessible, intelligent, and deeply personal. We leverage cutting-edge artificial intelligence to understand not just what you say, but how you feel.
                </p>
                <ul className="space-y-4">
                  {[
                    'Privacy-first, secure architecture',
                    'Empathetic AI trained on psychological principles',
                    '24/7 availability for whenever you need support'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center text-text-primary">
                      <CheckCircle2 className="w-5 h-5 text-accent-primary mr-3 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div className="aspect-square rounded-full bg-gradient-to-tr from-accent-primary/20 to-purple-500/20 absolute -inset-4 blur-3xl -z-10 animate-pulse"></div>
                <img 
                  src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000&auto=format&fit=crop" 
                  alt="Peaceful meditation and mental wellness concept" 
                  className="rounded-2xl shadow-2xl object-cover w-full h-[400px]"
                  loading="lazy"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* 3. How it Works */}
        <section id="how-it-works" className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How MindTrack AI Works</h2>
              <p className="text-lg text-text-secondary max-w-2xl mx-auto">Seamless integration of multiple AI models to provide a holistic understanding of your mental state.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: <Video className="w-8 h-8" />, title: "Facial Expression Analysis", desc: "Real-time emotion detection through secure, local video processing. We identify subtle micro-expressions indicative of stress or anxiety." },
                { icon: <Mic className="w-8 h-8" />, title: "Voice Tone Analysis", desc: "Advanced acoustic analysis to detect vocal markers of depression, stress, and fatigue without storing your audio." },
                { icon: <Brain className="w-8 h-8" />, title: "Contextual AI Engine", desc: "Our empathetic AI synthesizes your visual, vocal, and textual inputs to provide personalized therapeutic support and insights." }
              ].map((step, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="bg-bg-secondary rounded-2xl p-8 border border-border-primary hover:border-accent-primary/50 transition-colors group"
                >
                  <div className="w-16 h-16 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-text-secondary leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Features */}
        <section id="features" className="py-24 bg-bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features for Your Mind</h2>
              <p className="text-lg text-text-secondary max-w-2xl mx-auto">Everything you need to track, understand, and improve your mental wellbeing in one secure platform.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: <Activity />, title: "Real-Time Tracking", desc: "Monitor your emotional state continuously during sessions." },
                { icon: <MessageSquare />, title: "Empathetic AI Chat", desc: "Converse with an AI trained to listen and support." },
                { icon: <Shield />, title: "100% Private", desc: "Your data is encrypted and never sold. You're in control." },
                { icon: <Brain />, title: "Insightful Reports", desc: "Get actionable insights based on your historical data." }
              ].map((feature, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-bg-primary border border-border-primary shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-accent-primary mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-text-secondary">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Demo / Screenshots */}
        <section id="demo" className="py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-16">Experience the Dashboard</h2>
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative mx-auto max-w-5xl"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent z-10 h-full w-full pointer-events-none rounded-2xl"></div>
              <div className="rounded-2xl border border-border-primary overflow-hidden shadow-2xl bg-bg-secondary p-2">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop" 
                  alt="MindTrack AI Dashboard Interface showing mental health analytics" 
                  className="rounded-xl w-full object-cover shadow-inner opacity-90 hover:opacity-100 transition-opacity"
                  loading="lazy"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* 6. FAQ Section */}
        <section id="faq" className="py-24 bg-bg-secondary/30">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-lg text-text-secondary">Find answers to common questions about MindTrack AI and mental health detection.</p>
            </div>

            <div className="space-y-4">
              {[
                { q: "Is MindTrack AI a replacement for a human therapist?", a: "No, MindTrack AI is designed to be a supplemental tool for mental wellness. While it provides advanced real-time emotion detection and AI-driven support, it is not a substitute for professional medical advice, diagnosis, or treatment." },
                { q: "How does the real-time emotion detection work?", a: "We use on-device processing to analyze facial micro-expressions and vocal intonations via your camera and microphone during live sessions. This data is processed instantly to guide the AI's empathetic responses." },
                { q: "Is my video and audio data recorded or saved?", a: "Absolutely not. We process video and audio streams entirely in real-time. No recordings are ever saved to our servers or databases, ensuring complete privacy." },
                { q: "Can MindTrack AI detect stress and anxiety?", a: "Yes, our multi-modal AI analyzes physiological signals, vocal markers, and text sentiment to identify patterns highly correlated with stress and anxiety." }
              ].map((faq, idx) => (
                <details key={idx} className="group bg-bg-primary border border-border-primary rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between p-6 cursor-pointer font-medium text-lg">
                    {faq.q}
                    <ChevronDown className="w-5 h-5 text-text-secondary group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-6 pb-6 text-text-secondary leading-relaxed border-t border-border-primary/50 pt-4 mt-2">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to prioritize your mental wellbeing?</h2>
            <p className="text-xl text-text-secondary mb-10">Join thousands of users finding their safe space with MindTrack AI.</p>
            <Link to="/register" className="bg-accent-primary text-white px-10 py-4 rounded-full text-xl font-bold hover:bg-accent-secondary transition-all transform hover:scale-105 shadow-2xl shadow-accent-primary/40 inline-block">
              Create Your Free Account
            </Link>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="bg-bg-secondary border-t border-border-primary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Brain className="w-6 h-6 text-accent-primary" />
                <span className="text-xl font-bold tracking-tight">MindTrack AI</span>
              </div>
              <p className="text-text-secondary max-w-sm mb-4">
                Advanced real-time mental health detection and personalized AI therapy. Your safe space for wellness.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-text-secondary">
                <li><a href="#features" className="hover:text-accent-primary transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-accent-primary transition-colors">How it Works</a></li>
                <li><Link to="/login" className="hover:text-accent-primary transition-colors">Log In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-text-secondary">
                <li><Link to="/privacy" className="hover:text-accent-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-accent-primary transition-colors">Terms of Service</Link></li>
                <li><a href="mailto:support@mindtrack-ai.com" className="hover:text-accent-primary transition-colors">Contact Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border-primary pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-text-secondary">
            <p>&copy; {new Date().getFullYear()} MindTrack AI. All rights reserved.</p>
            <p className="mt-2 md:mt-0">Designed with empathy.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
