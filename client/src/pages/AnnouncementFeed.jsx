import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Megaphone, Users, ArrowRight, AlertCircle, Clock } from 'lucide-react';

export const AnnouncementFeed = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getStudentAnnouncementsFeed();
      setAnnouncements(res.announcements || []);
    } catch (err) {
      setError(err.message || 'Failed to load announcements feed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-[#14111f] rounded-3xl p-8 border border-[#383050] space-y-2 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1c1729] border border-[#383050] flex items-center justify-center text-purple-400">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Class Announcements</h1>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Loading announcements feed...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-[#14111f] rounded-3xl p-12 text-center space-y-4 shadow-xl border border-[#383050]">
          <div className="w-16 h-16 rounded-2xl bg-[#1c1729] border border-[#383050] flex items-center justify-center text-slate-500 mx-auto">
            <Megaphone className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No Announcements Yet</h3>
          </div>
          <Link
            to="/teachers"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Browse Teachers</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => {
            const teacher = item.teacherId || {};

            return (
              <div
                key={item._id}
                className="bg-[#14111f] rounded-2xl p-6 border border-[#383050] hover:border-purple-400/50 transition-all space-y-4 shadow-lg"
              >
                <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#383050]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#1c1729] border border-[#383050] flex items-center justify-center text-purple-300 text-sm font-bold shrink-0">
                      {teacher.avatarUrl ? (
                        <img src={`/${teacher.avatarUrl}`} alt={teacher.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{teacher.name ? teacher.name[0].toUpperCase() : 'T'}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{teacher.name || 'Instructor'}</h4>
                      <p className="text-[11px] font-mono text-slate-400">{teacher.subjectFocus || 'Teacher'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-[#1c1729] px-3 py-1 rounded-full border border-[#383050]">
                    <Clock className="w-3 h-3 text-purple-400" />
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-purple-300">{item.title}</h3>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">{item.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
