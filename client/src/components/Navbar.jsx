import React, { useState } from 'react';
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
  Briefcase,
  Menu,
  X
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  // Vertical link class for Sidebar
  const verticalLinkClass = (path) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
      isActive(path)
        ? 'bg-[#251e35] text-indigo-400 border border-[#383050] shadow-sm font-bold'
        : 'text-[#9f99b0] hover:text-[#f0eef5] hover:bg-[#1c1729]'
    }`;

  const renderNavLinks = () => {
    if (!user) return null;

    const role = user.role || 'student';

    if (role === 'student') {
      return (
        <div className="space-y-1">
          <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/dashboard')}>
            <ListChecks className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Dashboard Tests</span>
          </Link>
          <Link to="/teachers" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/teachers')}>
            <Users className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Browse Teachers</span>
          </Link>
          <Link to="/announcements" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/announcements')}>
            <Megaphone className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Announcements</span>
          </Link>
          <Link to="/lectures" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/lectures')}>
            <Video className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Recorded Lectures</span>
          </Link>
          <Link to="/messages" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/messages')}>
            <MessageSquare className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Messages</span>
          </Link>
          <Link to="/ai-generate" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/ai-generate')}>
            <FileUp className="w-4 h-4 text-purple-400 shrink-0" />
            <span>AI Quiz Generator</span>
          </Link>
          <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/profile')}>
            <UserIcon className="w-4 h-4 text-purple-400 shrink-0" />
            <span>My Profile</span>
          </Link>
        </div>
      );
    }

    if (role === 'teacher') {
      return (
        <div className="space-y-1">
          <Link to="/teacher/dashboard" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/teacher/dashboard')}>
            <ListChecks className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Teacher Dashboard</span>
          </Link>
          <Link to="/teacher/roster" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/teacher/roster')}>
            <UserCheck className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Class Roster</span>
          </Link>
          <Link to="/teacher/announcements" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/teacher/announcements')}>
            <Megaphone className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Announcements</span>
          </Link>
          <Link to="/teacher/lectures" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/teacher/lectures')}>
            <Video className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Manage Lectures</span>
          </Link>
          <Link to="/teacher/tests" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/teacher/tests')}>
            <FileUp className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Manage Tests</span>
          </Link>
          <Link to="/messages" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/messages')}>
            <MessageSquare className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Messages</span>
          </Link>
          <Link to="/leaderboard" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/leaderboard')}>
            <Award className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Leaderboard</span>
          </Link>
          <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/profile')}>
            <UserIcon className="w-4 h-4 text-purple-400 shrink-0" />
            <span>My Profile</span>
          </Link>
        </div>
      );
    }

    if (role === 'admin') {
      return (
        <div className="space-y-1">
          <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/admin')}>
            <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Admin Moderation</span>
          </Link>
          <Link to="/messages" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/messages')}>
            <MessageSquare className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Platform Messages</span>
          </Link>
          <Link to="/leaderboard" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/leaderboard')}>
            <Award className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Leaderboards</span>
          </Link>
          <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className={verticalLinkClass('/profile')}>
            <UserIcon className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Admin Profile</span>
          </Link>
        </div>
      );
    }

    return null;
  };

  const getRoleBadge = () => {
    if (!user?.role) return null;
    const role = user.role;

    if (role === 'admin') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950/80 border border-rose-800 text-rose-300 uppercase">
          ADMIN
        </span>
      );
    }
    if (role === 'teacher') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950/80 border border-purple-800 text-purple-300 uppercase">
          TEACHER
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950/80 border border-indigo-800 text-indigo-400 uppercase">
        STUDENT
      </span>
    );
  };

  // If user is unauthenticated, render top header bar for landing/public pages
  if (!user) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-[#383050] bg-[#14111f]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-indigo-400">
              AlgoPrep
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/teach-here"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-purple-400 hover:text-purple-300 px-3.5 py-2 rounded-xl bg-[#1c1729] border border-[#383050] transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              <span>Teach Here</span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // If user is authenticated, render the vertical left sidebar (plus mobile overlay header)
  return (
    <>
      {/* Mobile Top Navigation Header (< md screens) */}
      <div className="md:hidden sticky top-0 z-40 w-full border-b border-[#383050] bg-[#14111f]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-base text-indigo-400">AlgoPrep</span>
          {getRoleBadge()}
        </Link>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-slate-300 bg-[#1c1729] border border-[#383050]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Fixed Left Vertical Sidebar (hidden on mobile unless opened) */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#14111f] border-r border-[#383050] flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Sidebar Brand Header */}
        <div className="p-5 border-b border-[#383050] space-y-3">
          <div className="flex items-center justify-between">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md">
                <Terminal className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-indigo-400 block leading-none">
                  AlgoPrep
                </span>
                <span className="text-[10px] font-mono text-[#9f99b0] uppercase tracking-wider mt-1 block">
                  CBT Assessment
                </span>
              </div>
            </Link>

            {/* Mobile close icon */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">PORTAL ROLE:</span>
            {getRoleBadge()}
          </div>
        </div>

        {/* Middle Vertical Links Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <span className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#6b6380] block mb-2">
              Navigation Menu
            </span>
            {renderNavLinks()}
          </div>
        </div>

        {/* Bottom Profile & Logout Tile */}
        <div className="p-4 border-t border-[#383050] bg-[#1c1729]/60">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 min-w-0 flex-1 group"
            >
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#14111f] border border-[#383050] flex items-center justify-center text-purple-300 text-xs font-bold shrink-0">
                {user?.avatarUrl ? (
                  <img src={`/${user.avatarUrl}`} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.name ? user.name[0].toUpperCase() : 'U'}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors">
                  {user?.name || 'User'}
                </p>
                <p className="text-[10px] font-mono text-slate-400 truncate">{user?.email}</p>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-[#9f99b0] hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900 transition-all shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop overlay for mobile drawer */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        />
      )}
    </>
  );
};

export default Navbar;
