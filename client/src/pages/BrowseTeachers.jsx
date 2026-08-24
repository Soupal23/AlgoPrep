import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Users, UserCheck, Plus, MessageSquare, BookOpen, AlertCircle } from 'lucide-react';

export const BrowseTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [joinedTeacherIds, setJoinedTeacherIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [tRes, mRes] = await Promise.all([api.getTeachers(), api.getMyTeachers()]);

      setTeachers(tRes.teachers || []);

      const joinedIds = new Set(
        (mRes.teachers || []).map((m) => m.teacher._id || m.teacher)
      );
      setJoinedTeacherIds(joinedIds);
    } catch (err) {
      setError(err.message || 'Failed to load teachers directory');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJoin = async (teacherId) => {
    const isJoined = joinedTeacherIds.has(teacherId);
    setActionLoading((prev) => ({ ...prev, [teacherId]: true }));

    try {
      if (isJoined) {
        await api.leaveClass(teacherId);
        setJoinedTeacherIds((prev) => {
          const next = new Set(prev);
          next.delete(teacherId);
          return next;
        });
      } else {
        await api.joinClass(teacherId);
        setJoinedTeacherIds((prev) => new Set(prev).add(teacherId));
      }
    } catch (err) {
      alert(err.message || 'Failed to update class membership');
    } finally {
      setActionLoading((prev) => ({ ...prev, [teacherId]: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-2 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Teacher Directory</h1>
            <p className="text-xs text-slate-400">Browse verified instructors, join classes, and access exclusive tests & lectures</p>
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
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Loading teacher directory...</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 space-y-2">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-base font-bold text-white">No Teachers Available Yet</p>
          <p className="text-xs text-slate-500">Approved teachers will appear here once they complete registration.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((t) => {
            const isJoined = joinedTeacherIds.has(t._id);
            const isLoadingThis = !!actionLoading[t._id];

            return (
              <div
                key={t._id}
                className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-6 shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0">
                      {t.avatarUrl ? (
                        <img src={`/${t.avatarUrl}`} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{t.name ? t.name[0].toUpperCase() : 'T'}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-white truncate">{t.name}</h3>
                      <p className="text-xs font-mono text-slate-400 truncate">{t.email}</p>
                      {t.subjectFocus && (
                        <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {t.subjectFocus}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                    {t.bio || 'No bio provided.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleToggleJoin(t._id)}
                    disabled={isLoadingThis}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md ${
                      isJoined
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-800'
                        : 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:opacity-95'
                    }`}
                  >
                    {isJoined ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Joined ✓ (Leave)</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Join Class</span>
                      </>
                    )}
                  </button>

                  {isJoined && (
                    <button
                      onClick={() => navigate(`/messages?teacherId=${t._id}`)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors"
                      title="Send Message"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
