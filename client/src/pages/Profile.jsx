import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { User, Award, ArrowRight, ExternalLink, Camera, Save, CheckCircle2, AlertCircle } from 'lucide-react';

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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Notifications */}
      {message.text && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Profile Header & Edit Form */}
      <div className="bg-[#14111f] rounded-3xl p-8 border border-[#2a2240] space-y-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-[#2a2240]">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#1c1729] border border-[#2a2240] flex items-center justify-center text-purple-300 text-3xl font-extrabold shadow-lg">
                {user?.avatarUrl ? (
                  <img
                    src={`/${user.avatarUrl}`}
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
                className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="w-5 h-5 mb-1" />
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
              <h1 className="text-2xl font-extrabold text-white">{user?.name || 'User Profile'}</h1>
              <p className="text-xs font-mono text-slate-400 mt-0.5">{user?.email}</p>
              <span className="inline-block mt-2 text-[10px] font-mono px-3 py-1 rounded-full bg-[#1c1729] text-purple-300 border border-[#2a2240] uppercase">
                Role: {user?.role || 'student'}
              </span>
            </div>
          </div>

          {user?.role === 'student' && (
            <div className="flex items-center gap-6 text-center text-xs font-mono">
              <div className="bg-[#1c1729] px-4 py-3 rounded-2xl border border-[#2a2240]">
                <span className="text-slate-500 block">Total Attempted</span>
                <span className="text-lg font-extrabold text-white">{attempts.length}</span>
              </div>
              <div className="bg-[#1c1729] px-4 py-3 rounded-2xl border border-[#2a2240]">
                <span className="text-slate-500 block">Average Accuracy</span>
                <span className="text-lg font-extrabold text-emerald-400">{avgAccuracy}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Profile Information Form */}
        <form onSubmit={handleProfileSave} className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            <span>Personal Information</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1c1729] border border-[#2a2240] text-white text-sm focus:outline-none focus:border-purple-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2">Subject Specialization / Focus</label>
              <input
                type="text"
                value={formData.subjectFocus}
                onChange={(e) => setFormData({ ...formData, subjectFocus: e.target.value })}
                placeholder="e.g. Data Structures, Algorithms, Systems"
                className="w-full px-4 py-2.5 rounded-xl bg-[#1c1729] border border-[#2a2240] text-white text-sm focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2">Bio / Description</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about your background, interests, or teaching goals..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#1c1729] border border-[#2a2240] text-white text-sm focus:outline-none focus:border-purple-400"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm shadow-md transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>

      {/* Attempted Tests Section (Student view) */}
      {user?.role === 'student' && (
        <div className="bg-[#14111f] rounded-3xl p-8 border border-[#2a2240] space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2a2240] pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <span>Attempted Tests History</span>
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-slate-400">Loading attempt history...</p>
            </div>
          ) : attempts.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <p className="text-slate-400 text-sm">You have not completed any test attempts yet.</p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm shadow-md transition-colors"
              >
                <span>Explore Available Tests</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attempts.map((att) => {
                const testTitle = att.testId?.title || 'CS Test Attempt';
                const testTopic = att.testId?.topic || 'Computer Science';

                return (
                  <div
                    key={att._id}
                    className="bg-[#1c1729] rounded-2xl p-6 border border-[#2a2240] hover:border-purple-400/40 transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#14111f] text-purple-300 border border-[#2a2240]">
                          {testTopic}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : 'Completed'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mt-2">{testTitle}</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-[#14111f] p-3 rounded-xl border border-[#2a2240]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Score</span>
                        <span className="text-emerald-400 font-bold text-sm">
                          {att.score} / {att.maxScore}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Accuracy</span>
                        <span className="text-purple-400 font-bold text-sm">{att.accuracy}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Time</span>
                        <span className="text-amber-400 font-bold text-sm">
                          {Math.floor((att.totalTimeSpentSeconds || 0) / 60)}m
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/results/${att._id}`}
                      className="w-full py-2.5 rounded-xl bg-[#14111f] hover:bg-[#251e35] text-purple-300 text-xs font-bold border border-[#2a2240] transition-colors flex items-center justify-center gap-2"
                    >
                      <span>View Scorecard & Review</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
