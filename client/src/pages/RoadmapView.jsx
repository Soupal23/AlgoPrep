import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Compass,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  FileCheck2,
  ChevronRight,
  Layers,
  AlertCircle,
  Loader2,
  Award
} from 'lucide-react';

export const RoadmapView = () => {
  const { id: workspaceId } = useParams();
  const queryClient = useQueryClient();

  const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);
  const [regenSettings, setRegenSettings] = useState({
    days: 7,
    hoursPerDay: 2,
    level: 'intermediate'
  });
  const [regenJobId, setRegenJobId] = useState(null);
  const [regenProgress, setRegenProgress] = useState(null);
  const [regenError, setRegenError] = useState('');

  // 1. Fetch Workspace & Roadmap
  const {
    data: workspaceData,
    isLoading: isWsLoading
  } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      const res = await api.getWorkspaceById(workspaceId);
      return res.workspace;
    }
  });

  const {
    data: roadmapData,
    isLoading: isRoadmapLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['roadmap', workspaceId],
    queryFn: async () => {
      const res = await api.getRoadmap(workspaceId);
      return res.roadmap;
    }
  });

  // 2. Day Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ dayId, status }) => api.updateDayStatus(dayId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap', workspaceId] });
    }
  });

  // 3. SSE Stream for Roadmap Regeneration
  const subscribeToJobStream = (jobId) => {
    const token = localStorage.getItem('algoprep_access_token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const sseUrl = `${apiBase}/jobs/${jobId}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setRegenProgress(payload);

        if (payload.status === 'completed' || payload.status === 'failed') {
          eventSource.close();
          refetch();
          setTimeout(() => {
            setIsRegenModalOpen(false);
            setRegenJobId(null);
            setRegenProgress(null);
          }, 1500);
        }
      } catch (e) {}
    };

    eventSource.onerror = () => {
      eventSource.close();
    };
  };

  const handleRegenerate = async (e) => {
    e.preventDefault();
    if (!roadmapData?._id) return;

    setRegenError('');
    try {
      const res = await api.regenerateRoadmap(roadmapData._id, regenSettings);
      if (res.jobId) {
        setRegenJobId(res.jobId);
        subscribeToJobStream(res.jobId);
      }
    } catch (err) {
      setRegenError(err.message || 'Failed to trigger roadmap regeneration');
    }
  };

  if (isWsLoading || isRoadmapLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm font-medium">Loading your study roadmap...</p>
      </div>
    );
  }

  if (isError || !roadmapData) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link to={`/workspaces/${workspaceId}`} className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Workspace
        </Link>
        <div className="p-8 rounded-3xl bg-[#14111f] border border-[#383050] text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800 flex items-center justify-center mx-auto text-indigo-400">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">No Roadmap Found Yet</h2>
          <p className="text-sm text-[#9f99b0] max-w-md mx-auto">
            You have not generated a roadmap for this workspace yet. Head back to your workspace to configure and create one!
          </p>
          <Link
            to={`/workspaces/${workspaceId}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            Go to Workspace Setup
          </Link>
        </div>
      </div>
    );
  }

  const days = roadmapData.days || [];
  const completedDays = days.filter(d => d.status === 'completed').length;
  const progressPct = days.length > 0 ? Math.round((completedDays / days.length) * 100) : 0;
  const regensLeft = Math.max(3 - (roadmapData.regenerateCount || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-[#9f99b0]">
        <Link to="/workspaces" className="hover:text-white transition-colors">
          Workspaces
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/workspaces/${workspaceId}`} className="hover:text-white transition-colors truncate max-w-xs">
          {workspaceData?.title || 'Workspace'}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white">Day-Wise Roadmap</span>
      </div>

      {/* Top Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#14111f] border border-[#383050] space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-950/80 border border-indigo-800 text-indigo-300 uppercase tracking-wide">
                {workspaceData?.subject || 'Curriculum Plan'}
              </span>
              <span className="px-2.5 py-1 rounded-xl text-xs text-purple-300 bg-purple-950/60 border border-purple-800/80">
                {days.length} Days Sprint
              </span>
              <span className="px-2.5 py-1 rounded-xl text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-800/80 capitalize">
                {roadmapData.settings?.level || 'Intermediate'} Level
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f0eef5] tracking-tight">
              {workspaceData?.title}: Study Roadmap
            </h1>

            <p className="text-sm text-[#9f99b0] max-w-2xl leading-relaxed">
              Paced, grounded daily preparation schedule designed from your uploaded syllabus and notes.
            </p>
          </div>

          {/* Action CTA */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsRegenModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1c1729] hover:bg-[#251e35] border border-[#383050] text-slate-300 hover:text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Re-plan ({regensLeft} left)</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Summary Stats */}
        <div className="pt-4 border-t border-[#251e35] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#9f99b0]">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Overall Roadmap Progress:</span>
              <span className="font-bold text-white">{completedDays} of {days.length} Days Completed</span>
            </div>
            <span className="font-mono font-bold text-indigo-400">{progressPct}%</span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-[#1c1729] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Days Timeline View */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Daily Schedule Timeline</span>
          </h2>
          <span className="text-xs text-[#9f99b0]">
            Complete each day to automatically unlock the next session
          </span>
        </div>

        <div className="space-y-4">
          {days.map((day) => {
            const isCompleted = day.status === 'completed';
            const isLocked = day.status === 'locked';
            const isAvailable = day.status === 'available' || day.status === 'in_progress';

            const typeColor =
              day.type === 'mock'
                ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                : day.type === 'revision'
                ? 'bg-purple-950/70 border-purple-800 text-purple-300'
                : 'bg-indigo-950/70 border-indigo-800 text-indigo-300';

            return (
              <div
                key={day._id}
                className={`relative p-5 sm:p-6 rounded-3xl border transition-all duration-200 ${
                  isCompleted
                    ? 'bg-[#14111f]/90 border-emerald-900/60 shadow-sm'
                    : isAvailable
                    ? 'bg-[#181426] border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20'
                    : 'bg-[#120f1c]/60 border-[#2b243d] opacity-75'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Left: Day Badge & Info */}
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#1c1729] border border-[#383050] text-white">
                        Day {day.dayNumber}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border uppercase tracking-wider ${typeColor}`}>
                        {day.type === 'mock' ? 'Mock Exam' : day.type}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-[#9f99b0]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>~{day.estMinutes} mins</span>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {day.title}
                    </h3>

                    {/* Objectives */}
                    {day.objectives?.length > 0 && (
                      <ul className="space-y-1 text-xs text-[#9f99b0]">
                        {day.objectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-indigo-400 mt-0.5">•</span>
                            <span className="line-clamp-2">{obj}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Topic Chips */}
                    {day.topicKeys?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {day.topicKeys.map((key, i) => {
                          const topicMeta = roadmapData.topics?.find(t => t.key === key);
                          return (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#1c1729] border border-[#383050] text-slate-300 flex items-center gap-1.5"
                            >
                              <span>{topicMeta?.title || key}</span>
                              {topicMeta?.difficulty && (
                                <span className={`text-[9px] font-mono uppercase ${
                                  topicMeta.difficulty === 'hard'
                                    ? 'text-rose-400'
                                    : topicMeta.difficulty === 'medium'
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}>
                                  [{topicMeta.difficulty[0]}]
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right: Status Pill & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 self-end md:self-center shrink-0">
                    {isCompleted ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                          <CheckCircle2 className="w-4 h-4" /> Completed
                        </span>
                        <button
                          onClick={() => updateStatusMutation.mutate({ dayId: day._id, status: 'available' })}
                          className="text-[11px] text-[#9f99b0] hover:text-white underline cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    ) : isAvailable ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            alert(`Day ${day.dayNumber} study module (RAG Notes, Curated Resources & CBT Quiz) will be wired in Phase 5!`);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Study Day</span>
                        </button>
                        <button
                          onClick={() => updateStatusMutation.mutate({ dayId: day._id, status: 'completed' })}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c1729] hover:bg-[#251e35] border border-[#383050] text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Mark Done</span>
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1c1729] border border-[#383050] text-slate-500">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Regeneration Modal */}
      {isRegenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#14111f] border border-[#383050] p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#251e35] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white">Re-plan Study Roadmap</h2>
              </div>
              <button
                onClick={() => setIsRegenModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {regenError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {regenError}
              </div>
            )}

            {regenJobId ? (
              <div className="space-y-4 py-4 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {regenProgress?.stage || 'Re-analyzing syllabus & materials...'}
                  </h3>
                  <p className="text-xs text-[#9f99b0] mt-1">
                    Generating refreshed pedagogical plan...
                  </p>
                </div>
                {regenProgress?.progress && (
                  <div className="w-full h-2 rounded-full bg-[#1c1729] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                      style={{ width: `${regenProgress.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleRegenerate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9f99b0] mb-1.5">
                    Total Preparation Days
                  </label>
                  <select
                    value={regenSettings.days}
                    onChange={(e) => setRegenSettings({ ...regenSettings, days: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={5}>5 Days (Crash Sprint)</option>
                    <option value={7}>7 Days (Standard Week)</option>
                    <option value={10}>10 Days (Comprehensive)</option>
                    <option value={14}>14 Days (In-Depth Mastery)</option>
                    <option value={21}>21 Days (Semester Pace)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9f99b0] mb-1.5">
                    Daily Study Commitment
                  </label>
                  <select
                    value={regenSettings.hoursPerDay}
                    onChange={(e) => setRegenSettings({ ...regenSettings, hoursPerDay: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>1 hour / day</option>
                    <option value={2}>2 hours / day (Recommended)</option>
                    <option value={3}>3 hours / day</option>
                    <option value={4}>4+ hours / day (Intensive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9f99b0] mb-1.5">
                    Target Difficulty Level
                  </label>
                  <select
                    value={regenSettings.level}
                    onChange={(e) => setRegenSettings({ ...regenSettings, level: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1729] border border-[#383050] text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="beginner">Beginner (Foundational explanations)</option>
                    <option value="intermediate">Intermediate (Standard college curriculum)</option>
                    <option value="advanced">Advanced (Deep theoretical rigor)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRegenModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#1c1729] border border-[#383050] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={regensLeft <= 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all cursor-pointer shadow-md"
                  >
                    <span>Generate New Plan</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapView;
