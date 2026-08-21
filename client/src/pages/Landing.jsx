import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Terminal,
  ArrowRight,
  Sparkles,
  Clock,
  Award,
  CheckCircle2,
  BrainCircuit,
  Cpu,
  Network,
  Database,
  Code,
  BookOpen,
  Play,
  FileUp,
  LogIn,
  UserPlus,
  BarChart3
} from 'lucide-react';

export const Landing = () => {
  const { isAuthenticated } = useAuth();
  const [selectedDemoOption, setSelectedDemoOption] = useState(1);
  const [demoAnswered, setDemoAnswered] = useState(false);

  const topics = [
    {
      name: 'Operating Systems',
      icon: Cpu,
      color: 'from-cyan-500 to-blue-500',
      badge: 'Processes • Memory • Semaphores',
      desc: 'Master CPU scheduling, deadlock prevention, paging, virtual memory, and kernel synchronization mechanisms.'
    },
    {
      name: 'Computer Networks',
      icon: Network,
      color: 'from-indigo-500 to-purple-500',
      badge: 'OSI • TCP/IP • Routing',
      desc: 'Conquer protocol layers, socket programming, subnetting calculations, HTTP/2, and security protocols.'
    },
    {
      name: 'Database Management',
      icon: Database,
      color: 'from-amber-500 to-orange-500',
      badge: 'SQL • Normalization • ACID',
      desc: 'Practice complex SQL queries, B-Tree indexes, transaction isolation levels, and relational algebra.'
    },
    {
      name: 'Data Structures & Algorithms',
      icon: Code,
      color: 'from-emerald-500 to-teal-500',
      badge: 'Trees • Graphs • DP',
      desc: 'Test your algorithmic efficiency, asymptotic analysis, dynamic programming, and tree traversals.'
    },
    {
      name: 'Object-Oriented Programming',
      icon: BookOpen,
      color: 'from-purple-500 to-pink-500',
      badge: 'Encapsulation • Polymorphism',
      desc: 'Solidify object modeling concepts, inheritance hierarchies, design patterns, and interface contracts.'
    }
  ];

  const features = [
    {
      icon: Clock,
      title: 'Simulated CBT Exam Engine',
      desc: 'Experience real-time countdown timers, section locks, question flagging, and instant auto-submission just like actual GATE & tech recruitment tests.',
      color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800'
    },
    {
      icon: BrainCircuit,
      title: 'AI Syllabus Generator',
      desc: 'Paste any course syllabus or custom topic prompt. Our AI instantly parses and generates balanced, high-yield multiple choice questions.',
      color: 'text-purple-400 bg-purple-950/60 border-purple-800'
    },
    {
      icon: BarChart3,
      title: 'In-Depth Score Analytics',
      desc: 'Receive immediate detailed analysis of accuracy rates, speed per question, topic weaknesses, and percentile performance benchmarks.',
      color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
    },
    {
      icon: Award,
      title: 'Global Peer Leaderboard',
      desc: 'Compete against candidates worldwide. Track percentile standings across specific subjects and climb the overall AlgoPrep rankings.',
      color: 'text-amber-400 bg-amber-950/60 border-amber-800'
    }
  ];

  return (
    <div className="relative overflow-hidden bg-[#090d16] text-slate-100 min-h-screen">
      {/* Background Decorative Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-cyan-500/15 via-indigo-500/10 to-purple-500/15 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-cyan-600/10 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute top-[70%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 blur-[160px] pointer-events-none rounded-full" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-400 text-xs font-mono shadow-lg shadow-cyan-500/10 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>AI-POWERED COMPUTER BASED TESTING ENGINE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-slate-400">v2.0</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
            Master Computer Science Exams with{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
              Real CBT Simulation
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal max-w-2xl mx-auto">
            AlgoPrep provides simulated computer-based assessments for Core CS topics like OS, Networks, DBMS, DSA & OOP. AI-generate custom tests from any syllabus & track rank accuracy in real-time.
          </p>

          {/* Call-To-Action Button Group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold bg-gradient-to-r from-cyan-600 via-teal-500 to-indigo-600 text-white shadow-xl shadow-cyan-600/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 text-base"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Go to Tests Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold bg-gradient-to-r from-cyan-600 via-teal-500 to-indigo-600 text-white shadow-xl shadow-cyan-600/30 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 text-base"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold glass-panel text-slate-200 hover:text-white border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all flex items-center justify-center gap-2 text-base"
                >
                  <LogIn className="w-5 h-5 text-cyan-400" />
                  <span>Sign In to Account</span>
                </Link>
              </>
            )}
          </div>

          {/* Quick Metrics / Stats Pill bar */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center max-w-2xl mx-auto">
            <div className="glass-card p-3 rounded-xl border border-slate-800/80">
              <div className="text-xl font-extrabold text-cyan-400">100%</div>
              <div className="text-xs text-slate-400 font-mono">Timed CBT Interface</div>
            </div>
            <div className="glass-card p-3 rounded-xl border border-slate-800/80">
              <div className="text-xl font-extrabold text-indigo-400">Instant</div>
              <div className="text-xs text-slate-400 font-mono">Score Breakdown</div>
            </div>
            <div className="glass-card p-3 rounded-xl border border-slate-800/80">
              <div className="text-xl font-extrabold text-purple-400">AI Powered</div>
              <div className="text-xs text-slate-400 font-mono">Syllabus Parser</div>
            </div>
            <div className="glass-card p-3 rounded-xl border border-slate-800/80">
              <div className="text-xl font-extrabold text-emerald-400">Real-Time</div>
              <div className="text-xs text-slate-400 font-mono">Peer Leaderboard</div>
            </div>
          </div>
        </div>

        {/* Interactive CBT Mock Test Visual Preview */}
        <div className="mt-14 relative max-w-4xl mx-auto">
          {/* Decorative Outer Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-100 transition duration-1000" />

          <div className="relative glass-panel rounded-3xl border border-slate-700/80 p-6 md:p-8 shadow-2xl shadow-cyan-950/40">
            {/* Mock Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block">Active CBT Assessment</span>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Operating Systems — Synchronization & Concurrency</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">Mock Mode</span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 font-mono text-cyan-400 text-sm">
                  <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>29:45 remaining</span>
                </div>
                <div className="text-xs font-mono text-slate-400 hidden sm:block">
                  Question <span className="text-white font-bold">04</span> / 20
                </div>
              </div>
            </div>

            {/* Mock Question Body */}
            <div className="py-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono text-xs font-bold">Q4</span>
                <p className="text-sm md:text-base font-medium text-slate-200 leading-relaxed">
                  Which synchronization primitive relies on hardware atomic instructions like test-and-set to prevent race conditions in process execution?
                </p>
              </div>

              {/* Interactive Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { id: 0, letter: 'A', text: 'Counting Semaphore' },
                  { id: 1, letter: 'B', text: 'Mutex Lock (Spinlock)' },
                  { id: 2, letter: 'C', text: 'Condition Variable' },
                  { id: 3, letter: 'D', text: 'Message Queue' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectedDemoOption(opt.id);
                      setDemoAnswered(true);
                    }}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      selectedDemoOption === opt.id
                        ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center border transition-colors ${
                        selectedDemoOption === opt.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {opt.letter}
                    </span>
                    <span className="text-xs md:text-sm font-medium">{opt.text}</span>
                    {selectedDemoOption === opt.id && (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Mock Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-mono">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>{demoAnswered ? 'Choice selected • Ready for submission' : 'Click an option to try the interactive preview'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono">Flag for Review</span>
                <span className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white font-semibold flex items-center gap-1.5 shadow-sm">
                  <span>Save & Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="relative py-16 bg-slate-950/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">ENGINEERED FOR CS EXCELLENCE</span>
            <h2 className="text-3xl font-extrabold text-white">Everything You Need for CBT Prep</h2>
            <p className="text-sm text-slate-400">Designed to mirror real online computer-based examination conditions with deep performance diagnostics.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${feat.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-400">
                      {feat.desc}
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center text-xs text-cyan-400 font-mono group-hover:translate-x-1 transition-transform">
                    <span>Explore feature</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Topic Explorer Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400">TARGETED CORE CURRICULUM</span>
          <h2 className="text-3xl font-extrabold text-white">Covering All Essential CS Subjects</h2>
          <p className="text-sm text-slate-400">Practice subject-specific test suites with standard difficulty distributions.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topics.map((t, i) => {
            const Icon = t.icon;
            return (
              <div
                key={i}
                className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-6 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${t.color} flex items-center justify-center text-white shadow-md`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {t.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {t.name}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {t.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Multiple Mock Sets</span>
                  </span>
                  <Link
                    to={isAuthenticated ? '/dashboard' : '/login'}
                    className="text-cyan-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Practice</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Special AI Generator Card */}
          <div className="glass-panel p-6 rounded-2xl border border-purple-800/60 bg-gradient-to-br from-purple-950/40 to-indigo-950/30 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
                  <FileUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  Custom AI Feature
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">AI Custom Test Builder</h3>
              <p className="text-xs text-purple-200/80 leading-relaxed">
                Have a unique syllabus or custom exam criteria? Paste topic notes or syllabus text to generate a tailored CBT test instantly.
              </p>
            </div>

            <Link
              to={isAuthenticated ? '/ai-generate' : '/register'}
              className="w-full py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-xs text-center flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Try AI Generator</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3-Step Process Walkthrough */}
      <section className="py-16 bg-slate-950/80 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-teal-400">HOW ALGOPREP WORKS</span>
            <h2 className="text-3xl font-extrabold text-white">Three Steps to CS Exam Mastery</h2>
            <p className="text-sm text-slate-400">A streamlined workflow designed to simulate real exam pressure and build long-term retention.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 relative">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono text-base font-extrabold flex items-center justify-center">
                01
              </div>
              <h3 className="text-base font-bold text-white">Select Subject or AI Generator</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose from pre-built standard computer science test modules or paste a custom topic into the AI prompt generator.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400 font-mono text-base font-extrabold flex items-center justify-center">
                02
              </div>
              <h3 className="text-base font-bold text-white">Take Timed CBT Exam</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Complete questions under realistic exam constraints with live countdown timer, review flags, and section navigation.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono text-base font-extrabold flex items-center justify-center">
                03
              </div>
              <h3 className="text-base font-bold text-white">Analyze & Climb Leaderboard</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Get an instant breakdown of correct vs incorrect answers, view explanations, and see where you rank among peers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative glass-panel rounded-3xl border border-slate-700 p-8 sm:p-12 overflow-hidden text-center max-w-4xl mx-auto shadow-2xl shadow-cyan-950/30">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative space-y-6 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/30">
              <Terminal className="w-7 h-7 text-white" />
            </div>

            <h2 className="text-3xl font-black text-white">Ready to Test Your Computer Science Skills?</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Join students and engineering candidates using AlgoPrep to practice CBT exams, generate custom tests, and boost assessment confidence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/30 hover:opacity-95 transition-opacity"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/30 hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                  >
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-300">AlgoPrep CBT Platform</span>
            <span>• Built for CS Prep</span>
          </div>
          <div>
            <span>&copy; {new Date().getFullYear()} AlgoPrep. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
