import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FileUp, Plus, Clock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const TeacherTests = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: 'Algorithms',
    timeLimitMinutes: 30,
    validFrom: '',
    validUntil: '',
    questions: [
      {
        questionText: 'What is the time complexity of binary search on a sorted array?',
        options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'],
        correctOptionIndex: 1,
        explanation: 'Binary search divides the search space in half at each step.'
      }
    ]
  });

  useEffect(() => {
    fetchMyTests();
  }, []);

  const fetchMyTests = async () => {
    try {
      setLoading(true);
      const res = await api.getTests();
      const myTests = (res.tests || []).filter(
        (t) => t.teacherId === user?.id || t.teacherId?._id === user?.id
      );
      setTests(myTests);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load teacher tests' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      setSubmitting(true);
      setMessage({ type: '', text: '' });

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        topic: formData.topic.trim(),
        timeLimitMinutes: Number(formData.timeLimitMinutes),
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
        questions: formData.questions
      };

      const res = await api.createTeacherTest(payload);
      setTests([res.test, ...tests]);
      setShowCreateModal(false);
      setMessage({ type: 'success', text: 'Teacher-owned test created successfully!' });
    } catch (err) {
      alert(err.message || 'Failed to create test');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 flex flex-wrap items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-700 flex items-center justify-center text-purple-400">
            <FileUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Manage Teacher Tests</h1>
            <p className="text-xs text-slate-400">Create time-limited CBT assessments restricted to your enrolled class roster</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/ai-generate"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs border border-purple-900/50 flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>AI Syllabus Generator</span>
          </Link>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition-opacity flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Test</span>
          </button>
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

      {/* Tests Table / Cards */}
      {loading ? (
        <div className="p-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Loading custom tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400 space-y-4 shadow-xl border border-slate-800">
          <FileUp className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Custom Tests Created</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create a custom test manually or use the AI Syllabus Generator to generate a full CBT test.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Test</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map((t) => (
            <div
              key={t._id}
              className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-purple-500/40 transition-all space-y-4 flex flex-col justify-between shadow-lg"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                    {t.topic || 'General CS'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{t.timeLimitMinutes} Mins</span>
                </div>

                <h3 className="text-lg font-bold text-white">{t.title}</h3>
                {t.description && <p className="text-xs text-slate-300">{t.description}</p>}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-[11px] font-mono text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Valid From:</span>
                  <span className="text-slate-300">
                    {t.validFrom ? new Date(t.validFrom).toLocaleString() : 'Immediate'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Valid Until:</span>
                  <span className="text-amber-400">
                    {t.validUntil ? new Date(t.validUntil).toLocaleString() : 'No expiry'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                  <span className="text-slate-500">Questions:</span>
                  <span className="text-cyan-400 font-bold">{t.totalQuestions || t.questions?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full rounded-3xl p-6 border border-slate-800 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <span>Create Time-Limited Teacher Test</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white text-xs font-mono">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Test Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. CS101 Quiz 1: Sorting & Searching"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Topic</label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Time Limit (Mins)</label>
                  <input
                    type="number"
                    value={formData.timeLimitMinutes}
                    onChange={(e) => setFormData({ ...formData, timeLimitMinutes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Valid From (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Valid Until (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-md hover:opacity-95 transition-opacity"
              >
                {submitting ? 'Creating Test...' : 'Save & Publish Test'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
