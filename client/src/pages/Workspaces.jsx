import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Layers,
  Plus,
  BookOpen,
  Calendar,
  FileText,
  Trash2,
  ArrowRight,
  Sparkles,
  Loader2,
  FolderOpen
} from 'lucide-react';

export const Workspaces = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    examDate: ''
  });
  const [error, setError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.getWorkspaces();
      return res.workspaces || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: (newWs) => api.createWorkspace(newWs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setIsModalOpen(false);
      setFormData({ title: '', subject: '', description: '', examDate: '' });
      setError('');
    },
    onError: (err) => {
      setError(err.message || 'Failed to create workspace');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteWorkspace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.subject.trim()) {
      setError('Title and Subject are required');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (e, id, title) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete workspace "${title}" and all its ingested materials?`)) {
      deleteMutation.mutate(id);
    }
  };

  const workspaces = data || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-700 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Workspaces
          </h1>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-all shrink-0 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)]"
        >
          <Plus className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Loading & Empty States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 space-y-3 font-mono">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
          <p className="text-xs">Loading workspaces...</p>
        </div>
      ) : isError ? (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900 text-rose-300 text-xs">
          Failed to load workspaces. Please check your connection and try again.
        </div>
      ) : workspaces.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#121215] border border-zinc-700 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-400">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">No Workspaces Found</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workspace</span>
          </button>
        </div>
      ) : (
        /* Workspace Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workspaces.map((ws) => (
            <Link
              key={ws._id}
              to={`/workspaces/${ws._id}`}
              className="group relative flex flex-col justify-between p-6 rounded-2xl bg-[#121215] border border-zinc-700 hover:border-zinc-500 hover:bg-[#161619] shadow-sm transition-all duration-200"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-900 border border-zinc-700 text-zinc-400 uppercase">
                    {ws.subject}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, ws._id, ws.title)}
                    title="Delete Workspace"
                    className="p-1 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-zinc-200 transition-colors line-clamp-1">
                  {ws.title}
                </h3>

                {ws.description && (
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {ws.description}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3.5 border-t border-zinc-700 flex items-center justify-between text-xs font-mono text-zinc-500">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5" title="Uploaded Materials">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{ws.materialCount || 0} files</span>
                  </div>
                  {ws.chunkCount > 0 && (
                    <div className="flex items-center gap-1.5" title="Indexed Knowledge Chunks">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{ws.chunkCount} chunks</span>
                    </div>
                  )}
                </div>

                <span className="inline-flex items-center gap-1 font-medium text-white group-hover:translate-x-0.5 transition-transform">
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Workspace Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#121215] border border-zinc-700 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-700 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
                  <Layers className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-white">Create Workspace</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Workspace Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operating Systems & Architecture"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Subject / Discipline *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science, GATE, Algorithms"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Focusing on Virtual Memory, Scheduling algorithms, and deadlocks."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Target Exam Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Workspace</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspaces;
