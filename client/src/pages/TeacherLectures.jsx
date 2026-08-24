import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Video, Plus, Trash2, AlertCircle, CheckCircle2, PlayCircle, ExternalLink } from 'lucide-react';

export const TeacherLectures = () => {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    fetchMyLectures();
  }, []);

  const fetchMyLectures = async () => {
    try {
      setLoading(true);
      const res = await api.getMyLectures();
      setLectures(res.lectures || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load video lectures' });
    } finally {
      setLoading(false);
    }
  };

  const validateVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const isYt = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(url.trim());
    const isDrive = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/.test(url.trim());
    return isYt || isDrive;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !videoUrl.trim()) return;

    if (!validateVideoUrl(videoUrl)) {
      setMessage({
        type: 'error',
        text: 'Invalid video URL. Only YouTube links (youtube.com / youtu.be) and Google Drive preview links are supported.'
      });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });
      const res = await api.postLecture({
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoUrl.trim()
      });
      setLectures([res.lecture, ...lectures]);
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setMessage({ type: 'success', text: 'Recorded video lecture published successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to publish video lecture' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this video lecture?')) return;

    try {
      setDeletingId(id);
      await api.deleteLecture(id);
      setLectures((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete lecture');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-2 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Recorded Video Lectures</h1>
            <p className="text-xs text-slate-400">Publish YouTube or Google Drive video embeds to your joined student feeds</p>
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

      {/* Upload Form */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-rose-400" />
          <span>Publish New Video Lecture</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2">Lecture Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Masterclass: Dynamic Programming & Memoization"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2">Video Link (YouTube or Google Drive Preview)</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://drive.google.com/file/d/.../view"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Supports standard YouTube links, unlisted videos, or Google Drive file preview links.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-2">Description / Notes (Optional)</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of key concepts covered in this recording..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-bold text-sm shadow-md hover:opacity-95 transition-opacity flex items-center gap-2"
          >
            <Video className="w-4 h-4" />
            <span>{submitting ? 'Publishing...' : 'Publish Lecture'}</span>
          </button>
        </form>
      </div>

      {/* Uploaded Lectures List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-300 font-mono uppercase tracking-wider">
          Your Uploaded Video Lectures ({lectures.length})
        </h2>

        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-400">Loading lectures...</div>
        ) : lectures.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center text-xs text-slate-500 border border-slate-800">
            No video lectures published yet. Submit a YouTube or Google Drive link above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lectures.map((item) => (
              <div
                key={item._id}
                className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-rose-500/40 transition-all space-y-4 flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-3">
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                    <iframe
                      src={item.embedUrl}
                      title={item.title}
                      className="w-full h-full border-0 pointer-events-none"
                    />
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-white leading-snug">{item.title}</h3>
                    <button
                      onClick={() => handleDelete(item._id)}
                      disabled={deletingId === item._id}
                      className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors shrink-0"
                      title="Delete Lecture"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-300 line-clamp-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Uploaded {new Date(item.uploadedAt).toLocaleDateString()}</span>
                  <a
                    href={item.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <span>Original Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
