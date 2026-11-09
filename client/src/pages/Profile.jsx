import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { resolveFileUrl } from '../utils/fileUrl';
import { User, Award, ArrowRight, Camera, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export const Profile = () => {
  const [user, setUser] = useState(api.getStoredUser());
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    subjectFocus: user?.subjectFocus || ''
  });

  useEffect(() => {
    fetchProfileData();
    fetchMyAttempts();
  }, []);

  const fetchProfileData = async () => {
    try {
      const res = await api.getProfile();
      if (res.user) {
        setUser(res.user);
        setFormData({
          name: res.user.name || '',
          bio: res.user.bio || '',
          subjectFocus: res.user.subjectFocus || ''
        });
      }
    } catch (err) {
      // fallback to stored user
    }
  };

  const fetchMyAttempts = async () => {
    try {
      setLoading(true);
      const res = await api.getUserAttempts();
      setAttempts(res.attempts || []);
    } catch (err) {
      // ignore if non-student
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const res = await api.updateProfile(formData);
      setUser(res.user);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);

    try {
      setAvatarUploading(true);
      setMessage({ type: '', text: '' });
      const res = await api.uploadAvatar(fd);
      setUser(res.user);
      setMessage({ type: 'success', text: 'Avatar uploaded successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload avatar' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const avgAccuracy =
    attempts.length > 0
      ? Math.round(attempts.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / attempts.length)
      : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Notifications */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-3 text-xs font-mono border ${
            message.type === 'success'
              ? 'bg-[#18181b] border-[#27272a] text-white'
              : 'bg-[#18181b] border-[#27272a] text-zinc-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Profile Header & Edit Form */}
      <div className="bg-[#121215] rounded-2xl p-6 sm:p-8 border border-zinc-700 space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-zinc-700">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#18181b] border border-zinc-700 flex items-center justify-center text-white text-xl font-bold shadow-sm">
                {user?.avatarUrl ? (
                  <img
                    src={resolveFileUrl(user.avatarUrl)}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{user?.name ? user.name[0].toUpperCase() : 'U'}</span>
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 bg-black/70 rounded-full flex flex-col items-center justify-center text-white text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="w-4 h-4 mb-0.5 text-white" />
                <span>Change</span>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={avatarUploading}
              />
            </div>

            <div>
              <h1 className="text-xl font-bold text-white">{user?.name || 'User Profile'}</h1>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">{user?.email}</p>
              <span className="inline-block mt-2 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#18181b] text-zinc-300 border border-zinc-700 uppercase font-medium">
                {user?.role || 'student'}
              </span>
            </div>
          </div>

          {user?.role === 'student' && (
            <div className="flex items-center gap-3 text-center text-xs font-mono">
              <Link
                to="/dashboard?filter=attempted"
                className="bg-[#18181b] hover:bg-[#27272a] px-4 py-2.5 rounded-xl border border-zinc-700 transition-colors"
              >
                <span className="text-zinc-400 block text-[10px] uppercase font-mono">Attempts</span>
                <span className="text-base font-bold text-white mt-0.5">{attempts.length}</span>
              </Link>
              <div className="bg-[#18181b] px-4 py-2.5 rounded-xl border border-zinc-700">
                <span className="text-zinc-400 block text-[10px] uppercase font-mono">Avg Accuracy</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5">{avgAccuracy}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Profile Information Form */}
        <form onSubmit={handleProfileSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-[#18181b] border border-zinc-700 text-white text-xs font-mono focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Subject Specialization</label>
              <input
                type="text"
                value={formData.subjectFocus}
                onChange={(e) => setFormData({ ...formData, subjectFocus: e.target.value })}
                placeholder="e.g. Data Structures, Algorithms, Systems"
                className="w-full px-3.5 py-2 rounded-xl bg-[#18181b] border border-zinc-700 text-white text-xs font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">Bio</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Study focus or goals..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#18181b] border border-zinc-700 text-white text-xs font-mono focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-semibold font-mono text-xs shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
