import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { resolveFileUrl } from '../utils/fileUrl';
import {
  ShieldCheck,
  Users,
  Search,
  UserX,
  UserCheck
} from 'lucide-react';

export const AdminDashboard = () => {
  // Users state
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [userRoleFilter, userStatusFilter]);

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
      <div className="bg-[#14111f] rounded-3xl p-8 border border-[#383050] flex flex-wrap items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1c1729] border border-[#383050] flex items-center justify-center text-purple-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Platform Administration Panel</h1>
            <p className="text-xs text-[#9f99b0] font-mono mt-1">User directory and account status management</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
          {error}
        </div>
      )}

      {/* USERS DIRECTORY */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Platform User Directory ({users.length})</span>
          </h2>

          <div className="flex items-center gap-4 text-xs font-mono">
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#1c1729] border border-[#383050] text-white focus:outline-none focus:border-purple-400"
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={userStatusFilter}
              onChange={(e) => setUserStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#1c1729] border border-[#383050] text-white focus:outline-none focus:border-purple-400"
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
          <div className="bg-[#14111f] rounded-3xl p-12 text-center text-slate-400 border border-[#383050]">
            No platform users found matching current filters.
          </div>
        ) : (
          <div className="bg-[#14111f] rounded-3xl border border-[#383050] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#383050] bg-[#1c1729] text-slate-400 font-mono">
                    <th className="p-4">User</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Joined Date</th>
                    <th className="p-4 text-right">Moderation Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#383050]/60">
                  {users.map((u) => {
                    const isUpdating = !!actionLoading[u._id];

                    return (
                      <tr key={u._id} className="hover:bg-[#1c1729]/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#1c1729] border border-[#383050] flex items-center justify-center text-purple-300 text-xs font-bold shrink-0">
                              {u.avatarUrl ? (
                                <img src={resolveFileUrl(u.avatarUrl)} alt={u.name} className="w-full h-full object-cover" />
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
                                ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                                : 'bg-[#1c1729] text-slate-300 border border-[#383050]'
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
                                : 'bg-[#1c1729] text-slate-400 border border-[#383050]'
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
    </div>
  );
};

export default AdminDashboard;
