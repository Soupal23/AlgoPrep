import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { UserCheck, UserX, MessageSquare, AlertCircle, Clock } from 'lucide-react';

export const TeacherRoster = () => {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchRoster();
  }, []);

  const fetchRoster = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getTeacherRoster();
      setRoster(res.roster || []);
    } catch (err) {
      setError(err.message || 'Failed to load class roster');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!confirm('Are you sure you want to remove this student from your class?')) return;

    setActionLoading((prev) => ({ ...prev, [studentId]: true }));
    try {
      await api.removeStudentFromRoster(studentId);
      setRoster((prev) => prev.filter((item) => item.student._id !== studentId && item.student !== studentId));
    } catch (err) {
      alert(err.message || 'Failed to remove student from roster');
    } finally {
      setActionLoading((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-2 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Class Student Roster</h1>
            <p className="text-xs text-slate-400">Enrolled students participating in your tests, lectures, and announcement feed</p>
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
          <p className="text-xs font-mono text-slate-400">Loading student roster...</p>
        </div>
      ) : roster.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 space-y-2 shadow-xl border border-slate-800">
          <UserCheck className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-base font-bold text-white">No Students Joined Yet</p>
          <p className="text-xs text-slate-500">Students who join your class from the directory will appear here.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono">
                  <th className="p-4">Student</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {roster.map((item) => {
                  const student = item.student || {};
                  const isRemoving = !!actionLoading[student._id];

                  return (
                    <tr key={item._id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-indigo-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {student.avatarUrl ? (
                              <img src={`/${student.avatarUrl}`} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{student.name ? student.name[0].toUpperCase() : 'S'}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{student.name || 'Student'}</span>
                            <span className="text-[10px] font-mono text-slate-400">{student.subjectFocus || 'Student'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-300">{student.email}</td>
                      <td className="p-4 font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate('/messages')}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium border border-slate-700 transition-colors flex items-center gap-1"
                            title="Direct Message"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Message</span>
                          </button>

                          <button
                            onClick={() => handleRemoveStudent(student._id)}
                            disabled={isRemoving}
                            className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-medium border border-rose-800 transition-colors flex items-center gap-1"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>{isRemoving ? 'Removing...' : 'Remove'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
