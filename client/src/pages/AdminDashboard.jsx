import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ShieldCheck,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  AlertCircle,
  Search,
  UserX,
  UserCheck
} from 'lucide-react';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'users'

  // Applications state
  const [applications, setApplications] = useState([]);
  const [appFilter, setAppFilter] = useState('pending');
  const [loadingApps, setLoadingApps] = useState(true);

  // Users state
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    } else {
      fetchUsers();
    }
  }, [activeTab, appFilter, userRoleFilter, userStatusFilter]);

  const fetchApplications = async () => {
    try {
      setLoadingApps(true);
      setError('');
      const res = await api.getTeacherApplications(appFilter);
      setApplications(res.applications || []);
    } catch (err) {
      setError(err.message || 'Failed to load teacher applications');
    } finally {
      setLoadingApps(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setError('');
      const params = {};
      if (userRoleFilter) params.role = userRoleFilter;
      if (userStatusFilter) params.isActive = userStatusFilter === 'active';

      const res = await api.getAdminUsers(params);
      setUsers(res.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load user directory');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleApplicationStatus = async (id, status) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await api.updateTeacherApplicationStatus(id, status);
      fetchApplications();
    } catch (err) {
      alert(err.message || 'Failed to update application status');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleUserStatusToggle = async (id, currentStatus) => {
    const nextStatus = !currentStatus;
    const actionLabel = nextStatus ? 'reactivate' : 'soft-deactivate';
    if (!confirm(`Are you sure you want to ${actionLabel} this user account?`)) return;

    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await api.updateUserStatus(id, nextStatus);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update user status');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 flex flex-wrap items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Platform Administration Panel</h1>
            <p className="text-xs text-slate-400">Manage candidate teacher applications and moderate platform user access</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'applications'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Teacher Applications</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'users' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Directory Moderation</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* APPLICATIONS TAB */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          {/* Applications Filter Toolbar */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-300 font-mono uppercase tracking-wider">
              Candidate Applications ({applications.length})
            </h2>

            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              {['pending', 'approved', 'rejected', ''].map((st) => (
                <button
                  key={st}
                  onClick={() => setAppFilter(st)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                    appFilter === st ? 'bg-slate-800 text-rose-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st || 'All'}
                </button>
              ))}
            </div>
          </div>

          {loadingApps ? (
            <div className="p-16 text-center text-xs font-mono text-slate-400">Loading candidate applications...</div>
          ) : applications.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 border border-slate-800">
              No teacher applications found for status "{appFilter || 'all'}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {applications.map((app) => {
                const isUpdating = !!actionLoading[app._id];

                return (
                  <div
                    key={app._id}
                    className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-rose-500/40 transition-all space-y-4 flex flex-col justify-between shadow-lg"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-white">{app.name}</h3>
                          <p className="text-xs font-mono text-slate-400">{app.email}</p>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase ${
                            app.status === 'approved'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : app.status === 'rejected'
                              ? 'bg-rose-950 text-rose-400 border-rose-800'
                              : 'bg-amber-950 text-amber-400 border-amber-800'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-slate-500 block">Subject Specialization</span>
                        <span className="text-xs font-bold text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-900 inline-block">
                          {app.subjectFocus || 'Computer Science'}
                        </span>
                      </div>

                      {app.bio && (
                        <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                          {app.bio}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 space-y-3">
                      {app.resumeUrl && (
                        <a
                          href={`/${app.resumeUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 flex items-center justify-center gap-2 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-rose-400" />
                          <span>View / Download Resume</span>
                        </a>
                      )}

                      {app.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApplicationStatus(app._id, 'approved')}
                            disabled={isUpdating}
                            className="flex-1 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold text-xs border border-emerald-800 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve Teacher</span>
                          </button>

                          <button
                            onClick={() => handleApplicationStatus(app._id, 'rejected')}
                            disabled={isUpdating}
                            className="flex-1 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-xs border border-rose-800 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Directory Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-300 font-mono uppercase tracking-wider">
              Platform User Directory ({users.length})
            </h2>

            <div className="flex items-center gap-4 text-xs font-mono">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none"
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deactivated Only</option>
              </select>
            </div>
          </div>

          {loadingUsers ? (
            <div className="p-16 text-center text-xs font-mono text-slate-400">Loading user directory...</div>
          ) : users.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 border border-slate-800">
              No platform users found matching current filters.
            </div>
          ) : (
            <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono">
                      <th className="p-4">User</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Joined Date</th>
                      <th className="p-4 text-right">Moderation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {users.map((u) => {
                      const isUpdating = !!actionLoading[u._id];

                      return (
                        <tr key={u._id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {u.avatarUrl ? (
                                  <img src={`/${u.avatarUrl}`} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{u.name ? u.name[0].toUpperCase() : 'U'}</span>
                                )}
                              </div>
                              <span className="font-bold text-white">{u.name}</span>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-slate-300">{u.email}</td>
                          <td className="p-4 font-mono">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                                u.role === 'admin'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : u.role === 'teacher'
                                  ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                                  : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 font-mono">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                                u.isActive
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {u.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-slate-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleUserStatusToggle(u._id, u.isActive)}
                                disabled={isUpdating}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ml-auto ${
                                  u.isActive
                                    ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800'
                                    : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                                }`}
                              >
                                {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                <span>{u.isActive ? 'Deactivate' : 'Reactivate'}</span>
                              </button>
                            )}
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
      )}
    </div>
  );
};
