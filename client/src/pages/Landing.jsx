import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveFileUrl } from '../utils/fileUrl';
import { Logo } from '../components/Logo';
import {
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  Play,
  LogIn,
  UserPlus
} from 'lucide-react';

export const Landing = () => {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();

  // Auth panel state
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [loginRole, setLoginRole] = useState('student'); // 'student' | 'admin'

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
      if (loggedUser.role === 'admin') {
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
      await signup(regName, regEmail, regPassword);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await login('student@algoprep.com', 'password123');
      navigate('/dashboard');
    } catch (err) {
      try {
        await signup('Alex Student', 'student@algoprep.com', 'password123');
        navigate('/dashboard');
      } catch (signupErr) {
        setError('Demo student login failed. Please register or sign in with your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#09090b] text-[#fafafa] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Centered Auth Card Container */}
      <div className="flex-1 flex flex-col items-center justify-center py-8">
        
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <Logo variant="full" size="xl" className="h-16 sm:h-20" linkTo={null} />
        </div>

        {/* Auth Card */}
        <div className="w-full max-w-md rounded-2xl bg-[#121215] border border-zinc-700 shadow-xl p-6 sm:p-8">
          {user ? (
            /* Logged-In User Quick Access */
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#18181b] border border-zinc-700 flex items-center justify-center text-white text-xl font-bold mx-auto shadow-sm">
                {user?.avatarUrl ? (
                  <img src={resolveFileUrl(user.avatarUrl)} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.name ? user.name[0].toUpperCase() : 'U'}</span>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Welcome back, {user?.name || 'User'}</h3>
                <p className="text-xs font-mono text-zinc-400">{user?.email}</p>
                <span className="inline-block mt-2 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#18181b] text-zinc-300 border border-zinc-700 uppercase font-medium">
                  {user?.role || 'student'}
                </span>
              </div>

              <Link
                to={user?.role === 'admin' ? '/admin' : '/dashboard'}
                className="w-full py-2.5 rounded-full font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all flex items-center justify-center gap-2 text-xs"
              >
                <span>Go to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* Auth Form (Sign In / Register) */
            <div className="space-y-5">
              {/* Top Auth Mode Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-full bg-[#18181b] border border-zinc-700">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setError(''); }}
                  className={`py-1.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    authMode === 'login'
                      ? 'bg-amber-500 text-black font-semibold shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setError(''); }}
                  className={`py-1.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    authMode === 'register'
                      ? 'bg-amber-500 text-black font-semibold shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-3 rounded-xl bg-[#18181b] border border-zinc-700 text-zinc-300 text-xs text-center leading-relaxed font-mono">
                  {error}
                </div>
              )}

              {/* SIGN IN FORM */}
              {authMode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Role Selector */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-full bg-[#18181b] border border-zinc-700">
                      <button
                        type="button"
                        onClick={() => setLoginRole('student')}
                        className={`py-1.5 rounded-full text-xs font-semibold font-mono transition-all ${
                          loginRole === 'student'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginRole('admin')}
                        className={`py-1.5 rounded-full text-xs font-semibold font-mono transition-all ${
                          loginRole === 'admin'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Admin
                      </button>
                    </div>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder={loginRole === 'admin' ? 'admin@algoprep.com' : 'student@algoprep.com'}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#18181b] border border-zinc-700 text-white text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#18181b] border border-zinc-700 text-white text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-full font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    {loading ? 'Signing in...' : `Sign In to ${loginRole === 'admin' ? 'Admin Panel' : 'Workspace'}`}
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Demo Login CTA */}
                  {loginRole === 'student' && (
                    <div className="pt-2 border-t border-zinc-700">
                      <button
                        type="button"
                        onClick={handleDemoLogin}
                        disabled={loading}
                        className="w-full py-2 rounded-full text-xs font-mono text-zinc-300 bg-[#18181b] border border-zinc-700 hover:bg-[#27272a] transition-colors cursor-pointer"
                      >
                        Demo Student Login
                      </button>
                    </div>
                  )}
                </form>
              )}

              {/* REGISTER FORM */}
              {authMode === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Alex Student"
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#18181b] border border-zinc-700 text-white text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="alex@example.com"
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#18181b] border border-zinc-700 text-white text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#18181b] border border-zinc-700 text-white text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Register Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-full font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    {loading ? 'Creating Account...' : 'Register Student Account'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-6 border-t border-zinc-700 text-center text-xs text-zinc-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo variant="icon" size="xs" linkTo={null} />
            <span className="font-semibold text-white">AlgoPrep</span>
          </div>
          <div>
            <span>&copy; {new Date().getFullYear()} AlgoPrep</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
