import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Megaphone, Plus, Trash2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export const TeacherAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchMyAnnouncements();
  }, []);

  const fetchMyAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.getMyAnnouncements();
      setAnnouncements(res.announcements || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load announcements' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });
      const res = await api.postAnnouncement({ title: title.trim(), content: content.trim() });
      setAnnouncements([res.announcement, ...announcements]);
      setTitle('');
      setContent('');
      setMessage({ type: 'success', text: 'Announcement published to student feeds!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to post announcement' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      setDeletingId(id);
      await api.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete announcement');
    } finally {
      setDeletingId(null);
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
            <h1 className="text-2xl font-extrabold text-white">Post Class Announcements</h1>
          </div>
        </div>
      </div>

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

      {/* Post Form */}
      <div className="bg-[#14111f] rounded-3xl p-8 border border-[#383050] shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-purple-400" />
          <span>New Announcement Broadcast</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2">Announcement Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Test Scheduled for Friday"
              className="w-full px-4 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-white text-sm focus:outline-none focus:border-purple-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2">Message Content</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your update or instructions for joined students..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-white text-sm focus:outline-none focus:border-purple-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-colors flex items-center gap-2"
          >
            <Megaphone className="w-4 h-4" />
            <span>{submitting ? 'Publishing...' : 'Publish Announcement'}</span>
          </button>
        </form>
      </div>

      {/* Past Announcements List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-300 font-mono uppercase tracking-wider">
          Your Published Announcements ({announcements.length})
        </h2>

        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">Loading past announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="bg-[#14111f] rounded-3xl p-8 text-center text-xs text-slate-500 border border-[#383050]">
            No announcements published yet. Fill out the form above to broadcast your first announcement.
          </div>
        ) : (
          announcements.map((item) => (
            <div
              key={item._id}
              className="bg-[#14111f] rounded-2xl p-6 border border-[#383050] hover:border-purple-400/50 transition-all space-y-3 flex flex-col justify-between shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-purple-300">{item.title}</h3>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item._id)}
                  disabled={deletingId === item._id}
                  className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-[#1c1729] p-4 rounded-xl border border-[#383050]">
                {item.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
