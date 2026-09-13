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
      <div className="bg-[#14111f] rounded-3xl p-8 border border-[#2a2240] flex flex-wrap items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1c1729] border border-[#2a2240] flex items-center justify-center text-purple-300 text-2xl font-extrabold shadow-lg">
            {user?.name ? user.name[0].toUpperCase() : 'T'}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Welcome back, {user?.name || 'Instructor'}</h1>
            <p className="text-xs font-mono text-slate-400 mt-0.5">{user?.email}</p>
            <span className="inline-block mt-2 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#1c1729] text-purple-300 border border-[#2a2240] uppercase">
              Instructor Dashboard
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/teacher/announcements"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Post Announcement</span>
          </Link>
          <Link
            to="/teacher/lectures"
            className="px-4 py-2.5 rounded-xl bg-[#1c1729] hover:bg-[#251e35] text-purple-300 font-bold text-xs border border-[#2a2240] transition-colors flex items-center gap-2"
          >
            <Video className="w-4 h-4 text-purple-400" />
            <span>Upload Lecture</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#14111f] rounded-2xl p-6 border border-[#2a2240] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-bold uppercase">Enrolled Students</span>
            <UserCheck className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{loading ? '...' : stats.rosterCount}</p>
          <Link to="/teacher/roster" className="text-xs font-bold text-purple-400 hover:underline flex items-center gap-1">
            <span>Manage Roster</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-[#14111f] rounded-2xl p-6 border border-[#2a2240] space-y-2">
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

        <div className="bg-[#14111f] rounded-2xl p-6 border border-[#2a2240] space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono font-bold uppercase">Recorded Lectures</span>
            <Video className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{loading ? '...' : stats.lecturesCount}</p>
          <Link to="/teacher/lectures" className="text-xs font-bold text-purple-400 hover:underline flex items-center gap-1">
            <span>Upload Videos</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-[#14111f] rounded-2xl p-6 border border-[#2a2240] space-y-2">
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
      <div className="bg-[#14111f] rounded-3xl p-8 border border-[#2a2240] space-y-6 shadow-xl">
        <h2 className="text-lg font-bold text-white">Teacher Management</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/teacher/roster"
            className="p-6 rounded-2xl bg-[#1c1729] border border-[#2a2240] hover:border-purple-400/50 transition-all space-y-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#14111f] border border-[#2a2240] flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Class Roster</h3>
            <p className="text-xs text-slate-400">View enrolled students and manage class roster.</p>
          </Link>

          <Link
            to="/teacher/announcements"
            className="p-6 rounded-2xl bg-[#1c1729] border border-[#2a2240] hover:border-purple-400/50 transition-all space-y-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#14111f] border border-[#2a2240] flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Megaphone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Announcements</h3>
            <p className="text-xs text-slate-400">Publish updates and reminders to your class feed.</p>
          </Link>

          <Link
            to="/messages"
            className="p-6 rounded-2xl bg-[#1c1729] border border-[#2a2240] hover:border-purple-400/50 transition-all space-y-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#14111f] border border-[#2a2240] flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Student Messaging</h3>
            <p className="text-xs text-slate-400">Direct private messaging with your enrolled students.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};
