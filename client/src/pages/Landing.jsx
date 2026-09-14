import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

export const Landing = () => {
  const { user, isAuthenticated, login, signup } = useAuth();
  const navigate = useNavigate();

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
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-6">
        
        {/* LEFT COLUMN: Brand, Portal Intro & 3 Feature Cards */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Portal Main Title */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#f0eef5] leading-[1.15]">
              MASTER YOUR SKILLS.{' '}
              <span className="text-indigo-400 block sm:inline">ACE YOUR EXAMS.</span>
            </h1>

            {/* Sub-tagline */}
            <p className="text-sm sm:text-base text-[#9f99b0] leading-relaxed max-w-2xl font-medium tracking-wide">
              RECORDED LECTURES • AI SYLLABUS • REAL-TIME EXAM SIMULATIONS • PEER MESSAGING
            </p>
            <p className="text-xs text-slate-400 max-w-xl">
              Engineered specifically for computer science students, competitive coders, and learners to master technical skills and excel under real exam conditions.
            </p>
          </div>

          {/* 3 Core Feature Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            
            {/* Feature Card 1 */}
            <div className="bg-[#14111f] rounded-2xl p-5 border border-[#383050] space-y-3 shadow-lg flex flex-col justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#1c1729] border border-[#383050] flex items-center justify-center text-purple-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Deterministic CBT Engine</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  Timed exam simulation with tab-switch proctoring & instant percentile scoring.
                </p>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="bg-[#14111f] rounded-2xl p-5 border border-[#383050] space-y-3 shadow-lg flex flex-col justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#1c1729] border border-[#383050] flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Syllabus Builder</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  Upload PDF course outlines or text notes to create instant custom mock tests.
                </p>
              </div>
            </div>

            {/* Feature Card 3 */}
            <div className="bg-[#14111f] rounded-2xl p-5 border border-[#383050] space-y-3 shadow-lg flex flex-col justify-between">
              <div className="w-9 h-9 rounded-xl bg-[#1c1729] border border-[#383050] flex items-center justify-center text-emerald-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Classroom Hub</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  Teacher-student messaging, class rosters, & recorded lecture video access.
                </p>
              </div>
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
                    <img src={`/${user.avatarUrl}`} alt={user.name} className="w-full h-full object-cover" />
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
