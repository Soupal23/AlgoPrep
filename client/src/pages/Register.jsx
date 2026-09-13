import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal, Lock, Mail, User as UserIcon, ArrowRight, Briefcase } from 'lucide-react';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // 'student' | 'teacher'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await signup(name, email, password, role);
      if (user.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else if (user.role === 'admin') {
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

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full rounded-3xl p-8 border border-[#2a2240] bg-[#14111f] shadow-xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#f0eef5]">Create AlgoPrep Account</h2>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm text-center leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Role Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#9f99b0] mb-2">
              I am registering as:
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-[#1c1729] border border-[#2a2240]">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  role === 'student'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-[#9f99b0] hover:text-[#f0eef5]'
                }`}
              >
                Student
              </button>

              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  role === 'teacher'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-[#9f99b0] hover:text-[#f0eef5]'
                }`}
              >
                Teacher Candidate
              </button>
            </div>
            {role === 'teacher' && (
              <p className="text-[11px] text-amber-400 mt-2 bg-amber-950/40 p-2.5 rounded-lg border border-amber-900 leading-normal">
                Teacher registration requires prior approval of an application submitted at{' '}
                <Link to="/teach-here" className="underline font-bold">
                  Teach Here
                </Link>
                .
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#9f99b0] mb-2">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-5 h-5 text-[#6b6380] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1c1729] border border-[#2a2240] text-[#f0eef5] text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#9f99b0] mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-[#6b6380] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1c1729] border border-[#2a2240] text-[#f0eef5] text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#9f99b0] mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-[#6b6380] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#1c1729] border border-[#2a2240] text-[#f0eef5] text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Creating Account...' : 'Register Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#2a2240] text-center space-y-2">
          <p className="text-xs text-[#9f99b0]">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 font-semibold hover:underline">
              Log in
            </Link>
          </p>

          <p className="text-xs text-[#9f99b0]">
            Want to teach on AlgoPrep?{' '}
            <Link to="/teach-here" className="text-purple-400 font-semibold hover:underline">
              Apply via Teach Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
