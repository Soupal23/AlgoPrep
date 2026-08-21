import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal, LogOut, Award, FileUp, ListChecks, User as UserIcon } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
              AlgoPrep
            </span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 font-mono">
              CBT Engine
            </span>
          </div>
        </Link>

        {user ? (
          <nav className="flex items-center gap-2 sm:gap-6">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <ListChecks className="w-4 h-4 text-cyan-400" />
              <span>Tests</span>
            </Link>

            <Link
              to="/ai-generate"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <FileUp className="w-4 h-4 text-purple-400" />
              <span>AI Generator</span>
            </Link>

            <Link
              to="/leaderboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Leaderboard</span>
            </Link>

            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <UserIcon className="w-4 h-4 text-indigo-400" />
              <span>My Attempts</span>
            </Link>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <div className="flex items-center gap-3 pl-2">
              <span className="hidden sm:inline-block text-xs font-mono text-slate-400">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </nav>
        ) : (
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/20 hover:opacity-95 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
