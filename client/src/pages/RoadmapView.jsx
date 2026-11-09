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

  // 1.1 Fetch Dynamic Re-planning Changes (Phase 8)
  const {
    data: changesData
  } = useQuery({
    queryKey: ['roadmap-changes', roadmapData?._id],
    queryFn: async () => {
      if (!roadmapData?._id) return null;
      try {
        const res = await api.getRoadmapChanges(roadmapData._id);
        return res;
      } catch (e) {
        return null;
      }
    },
    enabled: !!roadmapData?._id,
    retry: false
  });

  // 2. Day Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ dayId, status }) => api.updateDayStatus(dayId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap', workspaceId] });
    }
  });

  // 3. SSE Stream for Roadmap Regeneration
  const subscribeToJobStream = async (jobId) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    let sseUrl;
    try {
      const ticketRes = await api.getJobStreamTicket(jobId);
      sseUrl = `${apiBase}/jobs/${jobId}/stream?ticket=${encodeURIComponent(ticketRes.ticket)}`;
    } catch {
      const token = localStorage.getItem('algoprep_access_token');
      sseUrl = `${apiBase}/jobs/${jobId}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    }

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
        <p className="text-xs font-mono text-zinc-400">Loading study roadmap...</p>
      </div>
    );
  }

  if (isError || !roadmapData) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Link to={`/workspaces/${workspaceId}`} className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Workspace
        </Link>
        <div className="p-8 rounded-2xl bg-[#121215] border border-zinc-700 text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-300">
            <Compass className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-white">No Roadmap Found</h2>
          <Link
            to={`/workspaces/${workspaceId}`}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors"
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
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
        <Link to="/workspaces" className="hover:text-white transition-colors">
          Workspaces
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
        <Link to={`/workspaces/${workspaceId}`} className="hover:text-white transition-colors truncate max-w-xs">
          {workspaceData?.title || 'Workspace'}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
        <span className="text-white">Roadmap</span>
      </div>

      {/* Top Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#121215] border border-zinc-700 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-zinc-900 border border-zinc-700 text-zinc-300 uppercase">
                {workspaceData?.subject || 'Curriculum Plan'}
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-700">
                {days.length} Days
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-700 capitalize">
                {roadmapData.settings?.level || 'Intermediate'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {workspaceData?.title}: Study Roadmap
            </h1>
          </div>

          {/* Action CTA */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsRegenModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-plan ({regensLeft} left)</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Summary Stats */}
        <div className="pt-4 border-t border-zinc-700 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-zinc-400">
              <Award className="w-4 h-4 text-white" />
              <span>Progress:</span>
              <span className="font-semibold text-white">{completedDays} of {days.length} Days Completed</span>
            </div>
            <span className="font-mono font-bold text-white">{progressPct}%</span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Plan Updated Dynamic Re-planning Banner (Phase 8) */}
      {(roadmapData.version > 1 || (changesData?.changeLog?.length > 0)) && (
        <div className="p-5 sm:p-6 rounded-2xl bg-[#121215] border border-zinc-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Dynamic Re-planning Active</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-700 text-zinc-300">
                  Plan v{roadmapData.version || changesData?.version || 2}
                </span>
              </div>
            </div>

            {changesData?.changeLog?.length > 0 && (
              <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                Last updated {new Date(changesData.changeLog[changesData.changeLog.length - 1].at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {changesData?.changeLog?.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-700">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                Recent Re-planning Log
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {changesData.changeLog.slice(-4).reverse().map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200">
                        v{entry.version}
                      </span>
                      <span className="text-white font-medium">{entry.change}</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">{entry.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Days Timeline View */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span>Schedule</span>
          </h2>
        </div>

        <div className="space-y-3">
          {days.map((day) => {
            const isCompleted = day.status === 'completed';
            const isLocked = day.status === 'locked';
            const isAvailable = day.status === 'available' || day.status === 'in_progress';

            return (
              <div
                key={day._id}
                className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 ${
                  isCompleted
                    ? 'bg-[#121215] border-zinc-700'
                    : isAvailable
                    ? 'bg-[#18181b] border-zinc-700'
                    : 'bg-[#0d0d0f] border-zinc-900/80 opacity-60'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Left: Day Badge & Info */}
                  <div className="space-y-2.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-zinc-900 border border-zinc-700 text-white">
                        Day {day.dayNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-zinc-700 text-zinc-400 uppercase">
                        {day.type === 'mock' ? 'Mock Exam' : day.type}
                      </span>
                      {day.type === 'revision' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-700 text-zinc-300">
                          Adaptive Review
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-xs text-zinc-500 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>~{day.estMinutes}m</span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight">
                      {day.title}
                    </h3>

                    {/* Objectives */}
                    {day.objectives?.length > 0 && (
                      <ul className="space-y-1 text-xs text-zinc-400">
                        {day.objectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-zinc-600 mt-0.5">•</span>
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
                              className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-900 border border-zinc-700 text-zinc-400 flex items-center gap-1.5"
                            >
                              <span>{topicMeta?.title || key}</span>
                              {topicMeta?.difficulty && (
                                <span className="text-[10px] font-mono uppercase text-zinc-500">
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
                  <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center shrink-0">
                    {isCompleted ? (
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/workspaces/${workspaceId}/days/${day._id}`}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Review Notes</span>
                        </Link>
                        <button
                          onClick={() => updateStatusMutation.mutate({ dayId: day._id, status: 'available' })}
                          className="text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    ) : isAvailable ? (
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/workspaces/${workspaceId}/days/${day._id}`}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Study Day</span>
                        </Link>
                        <button
                          onClick={() => updateStatusMutation.mutate({ dayId: day._id, status: 'completed' })}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Done</span>
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-700 text-zinc-600">
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
          <div className="w-full max-w-md rounded-2xl bg-[#121215] border border-zinc-700 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-700 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-white">Re-plan Study Roadmap</h2>
              </div>
              <button
                onClick={() => setIsRegenModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {regenError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-300 text-xs">
                {regenError}
              </div>
            )}

            {regenJobId ? (
              <div className="space-y-4 py-4 text-center">
                <Loader2 className="w-7 h-7 animate-spin text-white mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {regenProgress?.stage || 'Generating schedule...'}
                  </h3>
                </div>
                {regenProgress?.progress && (
                  <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300 rounded-full"
                      style={{ width: `${regenProgress.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleRegenerate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Total Preparation Days
                  </label>
                  <select
                    value={regenSettings.days}
                    onChange={(e) => setRegenSettings({ ...regenSettings, days: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-zinc-500"
                  >
                    <option value={5}>5 Days</option>
                    <option value={7}>7 Days</option>
                    <option value={10}>10 Days</option>
                    <option value={14}>14 Days</option>
                    <option value={21}>21 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Daily Study Commitment
                  </label>
                  <select
                    value={regenSettings.hoursPerDay}
                    onChange={(e) => setRegenSettings({ ...regenSettings, hoursPerDay: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-zinc-500"
                  >
                    <option value={1}>1 hour / day</option>
                    <option value={2}>2 hours / day</option>
                    <option value={3}>3 hours / day</option>
                    <option value={4}>4+ hours / day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Target Difficulty Level
                  </label>
                  <select
                    value={regenSettings.level}
                    onChange={(e) => setRegenSettings({ ...regenSettings, level: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-zinc-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRegenModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={regensLeft <= 0}
                    className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold text-black bg-white hover:bg-zinc-200 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <span>Generate Plan</span>
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
