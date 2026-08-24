import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Terminal,
  LogOut,
  Award,
  FileUp,
  ListChecks,
  User as UserIcon,
  Users,
  Megaphone,
  Video,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Briefcase
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const linkClass = (path) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-slate-800 text-cyan-400 font-semibold border border-slate-700'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  const renderNavLinks = () => {
    if (!user) return null;

    const role = user.role || 'student';

    if (role === 'student') {
      return (
        <>
          <Link to="/dashboard" className={linkClass('/dashboard')}>
            <ListChecks className="w-4 h-4 text-cyan-400" />
            <span>Tests</span>
          </Link>
          <Link to="/teachers" className={linkClass('/teachers')}>
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Browse Teachers</span>
          </Link>
          <Link to="/announcements" className={linkClass('/announcements')}>
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span>Announcements</span>
          </Link>
          <Link to="/lectures" className={linkClass('/lectures')}>
            <Video className="w-4 h-4 text-rose-400" />
            <span>Lectures</span>
          </Link>
          <Link to="/messages" className={linkClass('/messages')}>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Messages</span>
          </Link>
          <Link to="/leaderboard" className={linkClass('/leaderboard')}>
            <Award className="w-4 h-4 text-yellow-400" />
            <span>Leaderboard</span>
          </Link>
          <Link to="/ai-generate" className={linkClass('/ai-generate')}>
            <FileUp className="w-4 h-4 text-purple-400" />
            <span>AI Generator</span>
          </Link>
          <Link to="/profile" className={linkClass('/profile')}>
            <UserIcon className="w-4 h-4 text-blue-400" />
            <span>Profile</span>
          </Link>
        </>
      );
    }

    if (role === 'teacher') {
      return (
        <>
          <Link to="/teacher/dashboard" className={linkClass('/teacher/dashboard')}>
            <ListChecks className="w-4 h-4 text-cyan-400" />
            <span>Dashboard</span>
          </Link>
          <Link to="/teacher/roster" className={linkClass('/teacher/roster')}>
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Roster</span>
          </Link>
          <Link to="/teacher/announcements" className={linkClass('/teacher/announcements')}>
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span>Announcements</span>
          </Link>
          <Link to="/teacher/lectures" className={linkClass('/teacher/lectures')}>
            <Video className="w-4 h-4 text-rose-400" />
            <span>Lectures</span>
          </Link>
          <Link to="/teacher/tests" className={linkClass('/teacher/tests')}>
            <FileUp className="w-4 h-4 text-purple-400" />
            <span>Manage Tests</span>
          </Link>
          <Link to="/messages" className={linkClass('/messages')}>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Messages</span>
          </Link>
          <Link to="/leaderboard" className={linkClass('/leaderboard')}>
            <Award className="w-4 h-4 text-yellow-400" />
            <span>Leaderboard</span>
          </Link>
          <Link to="/profile" className={linkClass('/profile')}>
            <UserIcon className="w-4 h-4 text-blue-400" />
            <span>Profile</span>
          </Link>
        </>
      );
    }

    if (role === 'admin') {
      return (
        <>
          <Link to="/admin" className={linkClass('/admin')}>
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>Admin Panel</span>
          </Link>
          <Link to="/leaderboard" className={linkClass('/leaderboard')}>
            <Award className="w-4 h-4 text-yellow-400" />
            <span>Leaderboard</span>
          </Link>
          <Link to="/profile" className={linkClass('/profile')}>
            <UserIcon className="w-4 h-4 text-blue-400" />
            <span>Profile</span>
          </Link>
        </>
      );
    }

    return null;
  };

  const getRoleBadge = () => {
    if (!user?.role) return null;
    const role = user.role;

    if (role === 'admin') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-rose-950/80 border border-rose-700 text-rose-300">
          ADMIN
        </span>
      );
    }
    if (role === 'teacher') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-950/80 border border-indigo-700 text-indigo-300">
          TEACHER
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-950/80 border border-cyan-700 text-cyan-300">
        STUDENT
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 glass-panel bg-[#0d1322]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
              AlgoPrep
            </span>
            {getRoleBadge()}
          </div>
        </Link>

        {user ? (
          <nav className="flex items-center gap-1 sm:gap-3 overflow-x-auto py-1">
            {renderNavLinks()}

            <div className="h-4 w-px bg-slate-800 mx-1 shrink-0" />

            <div className="flex items-center gap-2 pl-1 shrink-0">
              <span className="hidden lg:inline-block text-xs font-mono text-slate-400">
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
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/teach-here"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              <span>Teach Here</span>
            </Link>
            <Link
              to="/login"
              className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/20 hover:opacity-95 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
