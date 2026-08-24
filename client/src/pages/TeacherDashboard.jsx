import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, Megaphone, Video, FileUp, MessageSquare, Plus, ArrowRight, UserCheck } from 'lucide-react';

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    rosterCount: 0,
    announcementsCount: 0,
    lecturesCount: 0,
    testsCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [rRes, aRes, lRes, tRes] = await Promise.all([
        api.getTeacherRoster(),
        api.getMyAnnouncements(),
        api.getMyLectures(),
        api.getTests()
      ]);

      const myTests = (tRes.tests || []).filter((t) => t.teacherId === user?.id || t.teacherId?._id === user?.id);

      setStats({
        rosterCount: rRes.roster?.length || 0,
        announcementsCount: aRes.announcements?.length || 0,
        lecturesCount: lRes.lectures?.length || 0,
        testsCount: myTests.length
      });
    } catch (err) {
      // fallback metrics
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 flex flex-wrap items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-extrabold shadow-lg shadow-indigo-600/30">
            {user?.name ? user.name[0].toUpperCase() : 'T'}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Welcome back, {user?.name || 'Instructor'}</h1>
            <p className="text-xs font-mono text-slate-400 mt-0.5">{user?.email}</p>
            <span className="inline-block mt-2 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase">
              Instructor Dashboard
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/teacher/announcements"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-opacity flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Post Announcement</span>
          </Link>
          <Link
            to="/teacher/lectures"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors flex items-center gap-2"
          >
            <Video className="w-4 h-4 text-rose-400" />
            <span>Upload Lecture</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-bold uppercase">Enrolled Students</span>
            <UserCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{loading ? '...' : stats.rosterCount}</p>
          <Link to="/teacher/roster" className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1">
            <span>Manage Roster</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-bold uppercase">Announcements</span>
            <Megaphone className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{loading ? '...' : stats.announcementsCount}</p>
          <Link to="/teacher/announcements" className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1">
            <span>View & Post</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-bold uppercase">Recorded Lectures</span>
            <Video className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{loading ? '...' : stats.lecturesCount}</p>
          <Link to="/teacher/lectures" className="text-xs font-bold text-rose-400 hover:underline flex items-center gap-1">
            <span>Upload Videos</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-bold uppercase">Custom Tests</span>
            <FileUp className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{loading ? '...' : stats.testsCount}</p>
          <Link to="/teacher/tests" className="text-xs font-bold text-purple-400 hover:underline flex items-center gap-1">
            <span>Create & Manage</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6 shadow-xl">
        <h2 className="text-lg font-bold text-white">Teacher Quick Management</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/teacher/roster"
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Class Roster</h3>
            <p className="text-xs text-slate-400">View enrolled students in your classes and manage membership privileges.</p>
          </Link>

          <Link
            to="/teacher/announcements"
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Megaphone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Announcements</h3>
            <p className="text-xs text-slate-400">Publish updates, deadline reminders, and instructions to your enrolled feed.</p>
          </Link>

          <Link
            to="/messages"
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Student Messaging</h3>
            <p className="text-xs text-slate-400">Engage in direct 1-on-1 private messaging with your enrolled students.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};
