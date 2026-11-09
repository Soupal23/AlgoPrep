import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveFileUrl } from '../utils/fileUrl';
import {
  Terminal,
  LogOut,
  User as UserIcon,
  ShieldCheck,
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

  // Horizontal topbar link class (LeetCode style)
  const navLinkClass = (path) =>
    `relative h-full flex items-center px-3.5 text-xs sm:text-sm transition-colors cursor-pointer select-none ${
      isActive(path)
        ? 'text-white font-medium after:absolute after:bottom-0 after:left-3.5 after:right-3.5 after:h-[2px] after:bg-white'
        : 'text-zinc-400 hover:text-white'
    }`;

  const renderNavLinks = () => {
    if (!user) return null;

    const isAdmin = user.role === 'admin';

    return (
      <nav className="hidden md:flex items-center h-full space-x-1">
        <Link to="/workspaces" className={navLinkClass('/workspaces')}>
          Workspaces
        </Link>
        <Link to="/dashboard" className={navLinkClass('/dashboard')}>
          Practice Tests
        </Link>
        <Link to="/ai-generate" className={navLinkClass('/ai-generate')}>
          Quick Quiz
        </Link>
        {isAdmin && (
          <Link to="/admin" className={navLinkClass('/admin')}>
            Admin Users
          </Link>
        )}
      </nav>
    );
  };

  const getRoleBadge = () => {
    if (!user?.role) return null;
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase">
        {user.role}
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full h-12 bg-[#09090b] border-b border-[#27272a] select-none">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-4">
        
        {/* Left: Brand Logo + Navigation Links */}
        <div className="flex items-center gap-6 h-full">
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white group-hover:border-zinc-500 transition-colors">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">
              AlgoPrep
            </span>
          </Link>

          {/* Desktop Horizontal Nav Links */}
          {renderNavLinks()}
        </div>

        {/* Right: Actions, Badges, Profile & Logout */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Role badge */}
              <div className="hidden sm:block">
                {getRoleBadge()}
              </div>

              {/* Profile Avatar & Name */}
              <Link
                to="/profile"
                className="flex items-center gap-2 p-1 rounded-full hover:bg-zinc-900 transition-colors group"
                title="My Profile"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-zinc-500 flex items-center justify-center text-zinc-300 text-xs font-medium transition-colors">
                  {user?.avatarUrl ? (
                    <img src={resolveFileUrl(user.avatarUrl)} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.name ? user.name[0].toUpperCase() : 'U'}</span>
                  )}
                </div>
                <span className="text-xs text-zinc-400 group-hover:text-white transition-colors hidden md:inline font-medium">
                  {user?.name || 'User'}
                </span>
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Menu Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 rounded-md text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-md transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-semibold text-black px-3.5 py-1.5 rounded-full bg-white hover:bg-zinc-200 transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown (< md screens) */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-b border-[#27272a] bg-[#09090b] px-4 py-3 space-y-1 shadow-xl">
          <Link
            to="/workspaces"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md text-xs font-medium ${
              isActive('/workspaces') ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Workspaces
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md text-xs font-medium ${
              isActive('/dashboard') ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Practice Tests
          </Link>
          <Link
            to="/ai-generate"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md text-xs font-medium ${
              isActive('/ai-generate') ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Quick Quiz
          </Link>
          <Link
            to="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md text-xs font-medium ${
              isActive('/profile') ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            My Profile
          </Link>
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-xs font-medium ${
                isActive('/admin') ? 'bg-zinc-900 text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Admin Users
            </Link>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
