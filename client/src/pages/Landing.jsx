import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveFileUrl } from '../utils/fileUrl';
import {
  Terminal,
  ArrowRight,
  Sparkles,
  Clock,
  Award,
  CheckCircle2,
  Lock,
  Mail,
  User as UserIcon,
  Users,
  Video,
  MessageSquare,
  Activity,
  ShieldCheck,
  Play,
  FileUp,
  LogIn,
  UserPlus
} from 'lucide-react';

const SAMPLE_PREVIEW_QUESTIONS = [
  {
    id: 1,
    topic: 'Graph Algorithms',
    difficulty: 'Medium',
    prompt: 'What is the time complexity of Dijkstra’s algorithm using a binary min-heap on a graph with V vertices and E edges?',
    options: [
      { label: 'A', text: 'O(V²)' },
      { label: 'B', text: 'O((V + E) log V)' },
      { label: 'C', text: 'O(V · E)' },
      { label: 'D', text: 'O(E log E + V²)' }
    ],
    correctIndex: 1,
    aiInsight: '94th Percentile • Strong in Shortest Paths • Next: Bellman-Ford'
  },
  {
    id: 2,
    topic: 'Dynamic Programming',
    difficulty: 'Hard',
    prompt: 'Which property must a problem satisfy alongside Optimal Substructure to make Dynamic Programming strictly preferable to Divide & Conquer?',
    options: [
      { label: 'A', text: 'Greedy Choice Property' },
      { label: 'B', text: 'Overlapping Subproblems' },
      { label: 'C', text: 'Tail Recursion' },
      { label: 'D', text: 'DAG Topological Ordering' }
    ],
    correctIndex: 1,
    aiInsight: '91st Percentile • Memoization Mastered • Next: Bitmask DP'
  },
  {
    id: 3,
    topic: 'Operating Systems',
    difficulty: 'Medium',
    prompt: 'Which Coffman deadlock condition is invalidated when a system enforces a strict global numbering of all resource types?',
    options: [
      { label: 'A', text: 'Mutual Exclusion' },
      { label: 'B', text: 'Hold and Wait' },
      { label: 'C', text: 'No Preemption' },
      { label: 'D', text: 'Circular Wait' }
    ],
    correctIndex: 3,
    aiInsight: '96th Percentile • Concurrency Ready • Next: Banker’s Algorithm'
  }
];

export const Landing = () => {
  const { user, isAuthenticated, login, signup } = useAuth();
  const navigate = useNavigate();

  // Interactive Mini CBT Preview state
  const [activeQIndex, setActiveQIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({ 0: 1, 1: 1, 2: 3 });
  const [secondsLeft, setSecondsLeft] = useState(29 * 60 + 42);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 60 ? prev - 1 : 29 * 60 + 42));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `00:${m}:${s}`;
  };

  const currentQuestion = SAMPLE_PREVIEW_QUESTIONS[activeQIndex];
  const selectedOpt = selectedOptions[activeQIndex];

  // Auth panel state
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [loginRole, setLoginRole] = useState('student'); // 'student' | 'teacher' | 'admin'

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form submit handlers
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(loginEmail, loginPassword);
      if (loggedUser.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const newUser = await signup(regName, regEmail, regPassword, 'student');
      if (newUser.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else if (newUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);

    const demoEmail =
      loginRole === 'admin'
        ? 'soupalpurkayastha@gmail.com'
        : loginRole === 'teacher'
        ? 'teacher@algoprep.com'
        : 'student@algoprep.com';
    const demoPass = loginRole === 'admin' ? '_algoprep1234' : 'password123';

    try {
      const u = await login(demoEmail, demoPass);
      if (u.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else if (u.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (loginRole === 'student') {
        try {
          const u = await signup('Alex Student', 'student@algoprep.com', 'password123', 'student');
          navigate('/dashboard');
        } catch (signupErr) {
          setError('Demo student login failed');
        }
      } else if (loginRole === 'admin') {
        setError('Demo admin login failed');
      } else {
        setError('Demo teacher login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0a0a0f] text-[#f0eef5] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Main Split-Screen Section */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-2">
        
        {/* LEFT COLUMN: Brand Header + Interactive Mini CBT & AI Preview Window */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Portal Main Title & Feature Badges */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14111f] border border-[#383050] text-[11px] font-mono text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE CBT SIMULATION &amp; AI REVISION ENGINE</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#f0eef5] leading-[1.12]">
              MASTER YOUR SKILLS.{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent block sm:inline">
                ACE YOUR EXAMS.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-[#9f99b0] max-w-2xl leading-relaxed">
              Engineered for computer science students and competitive coders with proctored exam simulations, AI syllabus-to-quiz generation, and classroom collaboration.
            </p>

            {/* Compact Capability Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#14111f] border border-[#383050] text-[11px] font-medium text-slate-300">
                <Video className="w-3.5 h-3.5 text-purple-400" />
                Recorded Lectures
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#14111f] border border-[#383050] text-[11px] font-medium text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                AI Syllabus PDF → Quiz
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#14111f] border border-[#383050] text-[11px] font-medium text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Tab-Switch Proctoring
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#14111f] border border-[#383050] text-[11px] font-medium text-slate-300">
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                Peer &amp; Teacher Chat
              </span>
            </div>
          </div>

          {/* Interactive Mini CBT & AI Preview Window */}
          <div className="relative rounded-2xl bg-[#14111f] border border-[#383050] shadow-2xl overflow-hidden">
            {/* Window Top Bar */}
            <div className="px-4 py-2.5 bg-[#1c1729] border-b border-[#383050] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <span className="text-[11px] font-mono text-[#9f99b0] hidden sm:inline">
                  algoprep-cbt://live-session
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 text-[10px] font-mono font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  Proctored
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#14111f] border border-[#383050] text-indigo-300 text-[11px] font-mono font-bold">
                  <Clock className="w-3 h-3 text-purple-400" />
                  {formatTimer(secondsLeft)}
                </span>
              </div>
            </div>

            {/* Window Body: Interactive Question Switcher & Options */}
            <div className="p-4 sm:p-5 space-y-3.5">
              {/* Question Header & Palette Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-950/90 border border-indigo-800 text-indigo-300 text-[10px] font-mono font-bold uppercase">
                    Q{currentQuestion.id} of 3
                  </span>
                  <span className="text-xs font-bold text-white">
                    {currentQuestion.topic}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1c1729] border border-[#383050] text-purple-300">
                    {currentQuestion.difficulty}
                  </span>
                </div>

                {/* Clickable Mini Question Palette */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-[#9f99b0] mr-1">Palette:</span>
                  {SAMPLE_PREVIEW_QUESTIONS.map((q, idx) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setActiveQIndex(idx)}
                      className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        activeQIndex === idx
                          ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/40'
                          : 'bg-[#1c1729] text-[#9f99b0] border border-[#383050] hover:text-white'
                      }`}
                      title={`Switch to Question ${q.id}`}
                    >
                      {q.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Prompt */}
              <p className="text-xs sm:text-[13px] text-[#f0eef5] font-medium leading-relaxed bg-[#1c1729]/70 p-3 rounded-xl border border-[#383050]/80">
                {currentQuestion.prompt}
              </p>

              {/* 2x2 Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOpt === idx;
                  const isCorrect = idx === currentQuestion.correctIndex;

                  let optionStyle =
                    'bg-[#1c1729] border-[#383050] text-[#9f99b0] hover:border-indigo-500/60 hover:text-[#f0eef5]';
                  if (isSelected && isCorrect) {
                    optionStyle =
                      'bg-emerald-950/40 border-emerald-600/80 text-emerald-200 shadow-sm';
                  } else if (isSelected && !isCorrect) {
                    optionStyle =
                      'bg-rose-950/40 border-rose-700/80 text-rose-200';
                  }

                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        setSelectedOptions((prev) => ({ ...prev, [activeQIndex]: idx }))
                      }
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${optionStyle}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                            isSelected
                              ? isCorrect
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-rose-500 text-white'
                              : 'bg-[#14111f] text-[#9f99b0] border border-[#383050]'
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span className="font-mono text-[11px] truncate">{opt.text}</span>
                      </div>
                      {isSelected && isCorrect && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Window Bottom Bar: Floating AI Revision Insight */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-950/60 via-[#1c1729] to-purple-950/60 border-t border-[#383050] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-indigo-600/30 border border-indigo-500/40 text-indigo-300">
                  <Sparkles className="w-3 h-3" />
                </span>
                <span className="font-semibold text-indigo-300">AI Revision Insight:</span>
                <span className="text-slate-300 font-mono text-[10px] sm:text-[11px]">
                  {currentQuestion.aiInsight}
                </span>
              </div>
              <span className="text-[10px] font-mono text-purple-300 hidden sm:inline">
                Interactive Preview • Click Q1–Q3
              </span>
            </div>
          </div>

        </div>


        {/* RIGHT COLUMN: Combined Auth Panel / Logged-In State Card */}
        <div className="lg:col-span-5">
          <div className="glass-panel max-w-md w-full mx-auto rounded-3xl p-6 sm:p-8 border border-[#383050] bg-[#14111f] shadow-2xl space-y-6">
            
            {isAuthenticated ? (
              /* Logged In Preview Card */
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#1c1729] border border-[#383050] flex items-center justify-center text-purple-300 text-2xl font-extrabold mx-auto shadow-lg">
                  {user?.avatarUrl ? (
                    <img src={resolveFileUrl(user.avatarUrl)} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.name ? user.name[0].toUpperCase() : 'U'}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-white">Welcome back, {user?.name || 'User'}!</h3>
                  <p className="text-xs font-mono text-slate-400">{user?.email}</p>
                  <span className="inline-block mt-2 text-[10px] font-mono px-3 py-1 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800 uppercase font-bold">
                    Role: {user?.role || 'student'}
                  </span>
                </div>

                <Link
                  to={user?.role === 'teacher' ? '/teacher/dashboard' : user?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="w-full py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Go to Assessment Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              /* Inline Auth Switcher (Sign In / Register) */
              <>
                {/* Top Auth Mode Pills */}
                <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#1c1729] border border-[#383050]">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(''); }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      authMode === 'login'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-[#9f99b0] hover:text-[#f0eef5]'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setError(''); }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      authMode === 'register'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-[#9f99b0] hover:text-[#f0eef5]'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </button>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs text-center leading-relaxed">
                    {error}
                  </div>
                )}

                {/* SIGN IN FORM VIEW */}
                {authMode === 'login' && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {/* Role Selector Pills for Login */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9f99b0]">
                        Sign In Portal:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#1c1729] border border-[#383050]">
                        <button
                          type="button"
                          onClick={() => setLoginRole('student')}
                          className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            loginRole === 'student'
                              ? 'bg-[#251e35] text-indigo-400 border border-[#383050]'
                              : 'text-[#9f99b0] hover:text-[#f0eef5]'
                          }`}
                        >
                          Student
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoginRole('teacher')}
                          className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            loginRole === 'teacher'
                              ? 'bg-[#251e35] text-purple-300 border border-[#383050]'
                              : 'text-[#9f99b0] hover:text-[#f0eef5]'
                          }`}
                        >
                          Teacher
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoginRole('admin')}
                          className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            loginRole === 'admin'
                              ? 'bg-[#251e35] text-rose-400 border border-[#383050]'
                              : 'text-[#9f99b0] hover:text-[#f0eef5]'
                          }`}
                        >
                          Admin
                        </button>
                      </div>
                    </div>

                    {/* Email Input */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#9f99b0] mb-1.5">
                        {loginRole === 'admin' ? 'Administrator Email' : loginRole === 'teacher' ? 'Instructor Email' : 'Student Email'}
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#6b6380] absolute left-3.5 top-3.5" />
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder={loginRole === 'admin' ? 'admin@algoprep.com' : loginRole === 'teacher' ? 'teacher@algoprep.com' : 'student@algoprep.com'}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-[#f0eef5] text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#9f99b0] mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#6b6380] absolute left-3.5 top-3.5" />
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-[#f0eef5] text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors flex items-center justify-center gap-2 text-xs"
                    >
                      {loading ? 'Signing in...' : `Sign In to ${loginRole === 'admin' ? 'Admin Panel' : loginRole === 'teacher' ? 'Teacher Portal' : 'Student Workspace'}`}
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* Instant Demo Login CTA */}
                    <div className="pt-3 border-t border-[#383050]">
                      <button
                        type="button"
                        onClick={handleDemoLogin}
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[#1c1729] border border-[#383050] text-purple-400 hover:bg-[#251e35] transition-colors"
                      >
                        {loginRole === 'admin' ? 'Instant Demo Login (Admin)' : loginRole === 'teacher' ? 'Instant Demo Login (Teacher)' : 'Instant Demo Register (Student)'}
                      </button>
                    </div>
                  </form>
                )}

                {/* REGISTER FORM VIEW */}
                {authMode === 'register' && (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#9f99b0] mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-[#6b6380] absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Jane Doe"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-[#f0eef5] text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#9f99b0] mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#6b6380] absolute left-3.5 top-3.5" />
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="jane@example.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-[#f0eef5] text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#9f99b0] mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#6b6380] absolute left-3.5 top-3.5" />
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-[#f0eef5] text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Register Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors flex items-center justify-center gap-2 text-xs"
                    >
                      {loading ? 'Creating Account...' : 'Register Student Account'}
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* Instructor Application Link */}
                    <div className="pt-3 border-t border-[#383050] text-center">
                      <p className="text-[11px] text-[#9f99b0]">
                        Want to teach on AlgoPrep?{' '}
                        <Link to="/teach-here" className="text-purple-400 font-semibold hover:underline">
                          Apply for Instructor Account
                        </Link>
                      </p>
                    </div>
                  </form>
                )}
              </>
            )}

          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="pt-6 border-t border-[#383050] text-center text-xs text-[#6b6380] font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-[#9f99b0]">AlgoPrep CBT Platform</span>
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
