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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#383050] pb-6">
        <div>
          <div className="flex items-center gap-2.5 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>AlgoPrep v2 AI Workspaces</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f0eef5] tracking-tight">
            Study Workspaces
          </h1>
          <p className="text-sm text-[#9f99b0] mt-1">
            Create structured workspaces for your subjects, upload course materials, and generate AI-tailored study plans.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Loading & Empty States */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm font-medium">Loading your workspaces...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-800 text-rose-300 text-sm">
          Failed to load workspaces. Please check your connection and try again.
        </div>
      ) : workspaces.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#14111f] border border-[#383050] text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-800 flex items-center justify-center mx-auto text-indigo-400">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">No Workspaces Yet</h2>
          <p className="text-sm text-[#9f99b0]">
            Create your first workspace to start uploading syllabus documents, notes, slides, and generating grounded study roadmaps.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Workspace</span>
          </button>
        </div>
      ) : (
        /* Workspace Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workspaces.map((ws) => (
            <Link
              key={ws._id}
              to={`/workspaces/${ws._id}`}
              className="group relative flex flex-col justify-between p-6 rounded-2xl bg-[#14111f] border border-[#383050] hover:border-indigo-500/50 hover:bg-[#181426] transition-all duration-200 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-950/70 border border-indigo-800 text-indigo-300">
                    {ws.subject}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, ws._id, ws.title)}
                    title="Delete Workspace"
                    className="p-1.5 rounded-lg text-[#9f99b0] hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {ws.title}
                </h3>

                {ws.description && (
                  <p className="text-xs text-[#9f99b0] line-clamp-2">
                    {ws.description}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[#251e35] flex items-center justify-between text-xs text-[#9f99b0]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5" title="Uploaded Materials">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{ws.materialCount || 0} files</span>
                  </div>
                  {ws.chunkCount > 0 && (
                    <div className="flex items-center gap-1.5" title="Indexed Knowledge Chunks">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>{ws.chunkCount} chunks</span>
                    </div>
                  )}
                </div>

                <span className="inline-flex items-center gap-1 font-semibold text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                  Enter <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Workspace Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#14111f] border border-[#383050] p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#251e35] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-white">Create New Workspace</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9f99b0] mb-1.5">
                  Workspace Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operating Systems & Architecture"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9f99b0] mb-1.5">
                  Subject / Discipline *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science, GATE, Semester 5"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9f99b0] mb-1.5">
                  Description / Goals (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Focusing on Virtual Memory, Scheduling algorithms, and deadlocks before midterms."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9f99b0] mb-1.5">
                  Target Exam Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#1c1729] border border-[#383050] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer shadow-md"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
