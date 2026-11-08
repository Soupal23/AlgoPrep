import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { api } from '../services/api';
import { AITutorDrawer } from '../components/chat/AITutorDrawer';
import {
  BookOpen,
  FileText,
  Sparkles,
  Clock,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Lightbulb,
  Check,
  Bookmark,
  Calendar,
  Video,
  ClipboardList,
  ThumbsUp,
  ThumbsDown,
  CheckSquare,
  Square,
  PlayCircle,
  GraduationCap,
  Globe,
  Book,
  Award,
  Play
} from 'lucide-react';

export const DayView = () => {
  const { workspaceId, dayId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Active top tab: 'notes' | 'resources' | 'test'
  const [activeTab, setActiveTab] = useState('notes');

  // Interactive flashcard deck state
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Selected citation for inspection modal/drawer
  const [activeCitation, setActiveCitation] = useState(null);

  // Live SSE Job tracking for notes generation
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobProgress, setJobProgress] = useState(null);

  // 1. Fetch Day Details
  const {
    data: dayData,
    isLoading: isDayLoading,
    error: dayError,
    refetch: refetchDay
  } = useQuery({
    queryKey: ['day', dayId],
    queryFn: async () => {
      const res = await api.getDay(dayId);
      return res.day;
    },
    enabled: !!dayId
  });

  // 2. Fetch or Trigger Day Notes
  const {
    data: notesData,
    isLoading: isNotesLoading,
    error: notesError,
    refetch: refetchNotes
  } = useQuery({
    queryKey: ['dayNotes', dayId],
    queryFn: async () => {
      const res = await api.getDayNotes(dayId);
      if (res.status === 'generating' && res.jobId) {
        setActiveJobId(res.jobId);
        subscribeToJobStream(res.jobId);
        return null;
      }
      return res.notes;
    },
    enabled: !!dayId,
    retry: 1
  });

  // 3. Fetch or Trigger Day Curated Resources (Phase 6)
  const {
    data: resourcesData,
    isLoading: isResourcesLoading,
    error: resourcesError,
    refetch: refetchResources
  } = useQuery({
    queryKey: ['dayResources', dayId],
    queryFn: async () => {
      const res = await api.getDayResources(dayId);
      if (res.status === 'generating' && res.jobId) {
        setActiveJobId(res.jobId);
        subscribeToJobStream(res.jobId);
        return [];
      }
      return res.resources || [];
    },
    enabled: !!dayId && activeTab === 'resources',
    retry: 1
  });

  // 4. Fetch or Trigger Day CBT Diagnostic Test (Phase 7)
  const {
    data: dayTestData,
    isLoading: isTestLoading,
    error: testError,
    refetch: refetchTest
  } = useQuery({
    queryKey: ['dayTest', dayId],
    queryFn: async () => {
      const res = await api.getDayTest(dayId);
      if (res.status === 'generating' && res.jobId) {
        setActiveJobId(res.jobId);
        subscribeToJobStream(res.jobId);
        return null;
      }
      return res.test || null;
    },
    enabled: !!dayId && activeTab === 'test',
    retry: 1
  });

  // Query past attempts for this test
  const {
    data: userAttempts = [],
    refetch: refetchAttempts
  } = useQuery({
    queryKey: ['testAttempts', dayTestData?._id],
    queryFn: async () => {
      const res = await api.getUserAttempts();
      const list = res?.attempts || [];
      return list.filter((a) => (a.testId?._id || a.testId) === dayTestData?._id);
    },
    enabled: !!dayTestData?._id && activeTab === 'test'
  });

  // Generate / Regenerate Test Mutation (Phase 7)
  const generateTestMutation = useMutation({
    mutationFn: () => api.getDayTest(dayId, true),
    onSuccess: (res) => {
      if (res.test) {
        queryClient.setQueryData(['dayTest', dayId], res.test);
        queryClient.invalidateQueries({ queryKey: ['testAttempts', res.test._id] });
      }
    }
  });

  // 4. Mark Day Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ status }) => api.updateDayStatus(dayId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day', dayId] });
      queryClient.invalidateQueries({ queryKey: ['roadmap', workspaceId] });
    }
  });

  // 5. Mark Notes Read Mutation
  const markReadMutation = useMutation({
    mutationFn: () => api.markNotesRead(dayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dayNotes', dayId] });
      queryClient.invalidateQueries({ queryKey: ['day', dayId] });
      queryClient.invalidateQueries({ queryKey: ['roadmap', workspaceId] });
    }
  });

  // 6. Force Regenerate Notes Mutation
  const regenerateMutation = useMutation({
    mutationFn: () => api.regenerateDayNotes(dayId),
    onSuccess: (res) => {
      if (res.jobId) {
        setActiveJobId(res.jobId);
        subscribeToJobStream(res.jobId);
      } else if (res.notes) {
        queryClient.setQueryData(['dayNotes', dayId], res.notes);
      }
    }
  });

  // 7. Force Regenerate Resources Mutation (Phase 6)
  const regenerateResourcesMutation = useMutation({
    mutationFn: () => api.regenerateDayResources(dayId),
    onSuccess: (res) => {
      if (res.jobId) {
        setActiveJobId(res.jobId);
        subscribeToJobStream(res.jobId);
      } else if (res.resources) {
        queryClient.setQueryData(['dayResources', dayId], res.resources);
      }
    }
  });

  // 8. Resource Feedback Mutation (Phase 6)
  const feedbackMutation = useMutation({
    mutationFn: ({ dayResourceId, helpful, watched }) =>
      api.saveResourceFeedback(dayResourceId, { helpful, watched }),
    onSuccess: (res) => {
      queryClient.setQueryData(['dayResources', dayId], (old = []) => {
        return old.map((item) =>
          item._id === res.dayResource._id
            ? { ...item, feedback: res.dayResource.feedback }
            : item
        );
      });
    }
  });

  // 9. SSE Listener for Live Generation Progress (Notes & Resources)
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
        setJobProgress(payload);

        if (payload.status === 'completed' || payload.status === 'failed') {
          eventSource.close();
          setActiveJobId(null);
          setJobProgress(null);
          refetchNotes();
          refetchResources();
          refetchTest();
          refetchAttempts();
          refetchDay();
        }
      } catch (err) {
        console.error('SSE JSON error', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };
  };

  if (isDayLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm font-medium">Loading session material...</p>
      </div>
    );
  }

  if (dayError || !dayData) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="p-6 rounded-3xl bg-rose-950/40 border border-rose-800 text-rose-300 space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>Could not load Day Session</span>
          </h2>
          <p className="text-sm text-rose-200/80">
            {dayError?.message || 'This day does not exist or you lack permission to view it.'}
          </p>
          <Link
            to={workspaceId ? `/workspaces/${workspaceId}/roadmap` : '/workspaces'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1c1729] hover:bg-[#251e35] text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Roadmap
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = dayData.status === 'completed';
  const isGenerating = activeJobId || isNotesLoading || (dayData.content?.notesStatus === 'pending' && !notesData);
  const flashcards = notesData?.flashcards || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={`/workspaces/${dayData.workspaceId}/roadmap`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#9f99b0] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400" />
          <span>Back to Study Roadmap</span>
        </Link>

        {/* Status Actions */}
        <div className="flex items-center gap-2.5">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-950/80 border border-emerald-800 text-emerald-300">
              <CheckCircle2 className="w-4 h-4" /> Completed
            </span>
          ) : (
            <button
              onClick={() => updateStatusMutation.mutate({ status: 'completed' })}
              disabled={updateStatusMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Day Completed</span>
            </button>
          )}

          <button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending || !!activeJobId}
            title="Regenerate Grounded Notes"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c1729] hover:bg-[#251e35] border border-[#383050] text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-indigo-400 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Regenerate Notes</span>
          </button>
        </div>
      </div>

      {/* Main Day Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#383050] bg-[#14111f] shadow-xl space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-600/30 border border-indigo-500/50 text-indigo-300">
            DAY {dayData.dayNumber}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider bg-[#1c1729] border border-[#383050] text-purple-300">
            {dayData.type} SESSION
          </span>
          <div className="flex items-center gap-1 text-xs text-[#9f99b0] ml-auto">
            <Clock className="w-3.5 h-3.5" />
            <span>Target: ~{dayData.estMinutes} mins</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[#f0eef5] tracking-tight">
          {dayData.title}
        </h1>

        {/* Objectives Checklist */}
        {dayData.objectives?.length > 0 && (
          <div className="pt-2 border-t border-[#251e35] space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
              Target Learning Objectives:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#9f99b0]">
              {dayData.objectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-2 bg-[#1c1729]/60 p-2.5 rounded-xl border border-[#2b243d]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{obj}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Tabs Header (Notes | Resources | Test) */}
      <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#14111f] border border-[#383050]">
        <button
          onClick={() => setActiveTab('notes')}
          className={`py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'notes'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-[#9f99b0] hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Grounded Notes</span>
        </button>

        <button
          onClick={() => setActiveTab('resources')}
          className={`py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'resources'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-[#9f99b0] hover:text-white'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Curated Resources</span>
          <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] bg-purple-950 border border-purple-800 text-purple-300">P6</span>
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'test'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-[#9f99b0] hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Daily Quiz</span>
          <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] bg-amber-950 border border-amber-800 text-amber-300">P7</span>
        </button>
      </div>

      {/* TAB 1: GROUNDED NOTES VIEW (Phase 5) */}
      {activeTab === 'notes' && (
        <div className="space-y-8">
          {/* Generation Progress Banner */}
          {isGenerating && (
            <div className="p-6 rounded-3xl bg-[#1c1729] border border-indigo-500/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                  <span>Synthesizing Grounded Notes from Course Materials...</span>
                </div>
                <span className="font-mono text-xs font-bold text-indigo-400">
                  {jobProgress?.progress || 35}%
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-[#14111f] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                  style={{ width: `${jobProgress?.progress || 35}%` }}
                />
              </div>

              <p className="text-xs text-[#9f99b0] font-mono">
                {jobProgress?.stage || 'Cross-referencing textbook passages, extracting citations and equations...'}
              </p>
            </div>
          )}

          {/* Render Grounded Notes Content */}
          {notesData && (
            <>
              {/* Quick Summary / Key Takeaways Callout */}
              {notesData.keyPoints?.length > 0 && (
                <div className="p-6 rounded-3xl bg-[#14111f] border border-emerald-900/60 shadow-lg space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    <span>High-Yield Key Takeaways</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
                    {notesData.keyPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-[#1c1729]/80 p-3 rounded-2xl border border-[#2b243d]">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note Sections */}
              <div className="space-y-6">
                {notesData.sections?.map((section, idx) => (
                  <article
                    key={idx}
                    className="p-6 sm:p-8 rounded-3xl bg-[#14111f] border border-[#383050] shadow-xl space-y-5"
                  >
                    {/* Section Top Header & Beyond Materials Alert */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#251e35]">
                      <div className="space-y-1">
                        <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider">
                          Module {idx + 1}
                        </span>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                          {section.heading}
                        </h2>
                      </div>

                      {section.isBeyondMaterials && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-amber-950/60 border border-amber-800 text-amber-300">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Supplemented Theory (Beyond Materials)</span>
                        </span>
                      )}
                    </div>

                    {/* Markdown Body */}
                    <div className="prose prose-invert prose-indigo max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed space-y-4">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-bold text-indigo-200 mt-4 mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-semibold text-white mt-3 mb-1.5">{children}</h3>,
                          p: ({ children }) => <p className="leading-relaxed mb-3">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-3">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-3">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          code: ({ inline, children }) =>
                            inline ? (
                              <code className="px-1.5 py-0.5 rounded bg-[#1c1729] border border-[#383050] font-mono text-indigo-300 text-[12px]">
                                {children}
                              </code>
                            ) : (
                              <pre className="p-4 rounded-2xl bg-[#0a0a0f] border border-[#2b243d] overflow-x-auto text-[12px] font-mono text-indigo-200">
                                <code>{children}</code>
                              </pre>
                            ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 italic bg-[#1c1729]/50 rounded-r-xl text-slate-300 my-3">
                              {children}
                            </blockquote>
                          )
                        }}
                      >
                        {section.markdown}
                      </ReactMarkdown>
                    </div>

                    {/* Verified Course Citations Chips */}
                    {section.citations?.length > 0 && (
                      <div className="pt-4 border-t border-[#251e35] space-y-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-[#9f99b0] flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Grounded Source Citations in your Materials:</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {section.citations.map((cite, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => setActiveCitation(cite)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1c1729] hover:bg-[#251e35] border border-[#383050] hover:border-indigo-500 text-indigo-300 transition-all cursor-pointer shadow-sm"
                            >
                              <span className="font-mono text-indigo-400 font-bold">[{cite.citationId}]</span>
                              <span>{cite.materialName}</span>
                              {(cite.location?.page || cite.location?.slide) && (
                                <span className="text-[10px] text-[#9f99b0]">
                                  ({cite.location.page ? `p. ${cite.location.page}` : `slide ${cite.location.slide}`})
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>

              {/* Active Recall Flashcards Deck */}
              {flashcards.length > 0 && (
                <div className="p-6 sm:p-8 rounded-3xl bg-[#14111f] border border-[#383050] shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-purple-400" />
                      <span>Active Recall Flashcards ({flashcards.length})</span>
                    </h3>
                    <span className="font-mono text-xs text-[#9f99b0]">
                      Card {currentCardIdx + 1} of {flashcards.length}
                    </span>
                  </div>

                  {/* Card Surface */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="min-h-[180px] p-8 rounded-3xl bg-gradient-to-br from-[#1c1729] to-[#14111f] border border-purple-500/40 hover:border-purple-400 transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-lg space-y-3"
                  >
                    <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-bold">
                      {isFlipped ? 'Answer / Invariant:' : 'Question (Click to reveal):'}
                    </span>
                    <p className="text-base sm:text-lg font-bold text-white max-w-xl leading-relaxed">
                      {isFlipped ? flashcards[currentCardIdx].back : flashcards[currentCardIdx].front}
                    </p>
                    <span className="text-[11px] text-[#9f99b0] italic">
                      {isFlipped ? 'Click again to view question' : 'Click card to flip'}
                    </span>
                  </div>

                  {/* Flashcard Navigation Controls */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setCurrentCardIdx((prev) => Math.max(0, prev - 1));
                      }}
                      disabled={currentCardIdx === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1c1729] hover:bg-[#251e35] disabled:opacity-40 border border-[#383050] text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {flashcards.map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i === currentCardIdx ? 'w-5 bg-purple-400' : 'bg-[#2b243d]'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setCurrentCardIdx((prev) => Math.min(flashcards.length - 1, prev + 1));
                      }}
                      disabled={currentCardIdx === flashcards.length - 1}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1c1729] hover:bg-[#251e35] disabled:opacity-40 border border-[#383050] text-xs font-semibold text-white transition-colors cursor-pointer"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Actions: Mark Notes Read */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-[#14111f] border border-[#383050]">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Finished reading today's notes?</h4>
                  <p className="text-xs text-[#9f99b0]">
                    Marking notes as read updates your roadmap progress and unlocks review checkpoints.
                  </p>
                </div>

                <button
                  onClick={() => markReadMutation.mutate()}
                  disabled={markReadMutation.isPending || notesData.readStatus}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${
                    notesData.readStatus
                      ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{notesData.readStatus ? 'Notes Read ✓' : 'Mark Notes as Read'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: CURATED RESOURCES (Phase 6) */}
      {activeTab === 'resources' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#14111f] border border-[#383050]">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-400" />
                <span>Curated Educational Resources</span>
              </h2>
              <p className="text-xs text-[#9f99b0] mt-1">
                Authoritative video walkthroughs, encyclopedic references, web docs, and academic papers ranked for Day {dayData.dayNumber}.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => regenerateResourcesMutation.mutate()}
                disabled={regenerateResourcesMutation.isPending || activeJobId}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1c1729] hover:bg-[#251e35] disabled:opacity-50 border border-[#383050] text-xs font-semibold text-[#9f99b0] hover:text-white transition-all cursor-pointer shadow-sm"
              >
                {regenerateResourcesMutation.isPending || activeJobId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                )}
                <span>{regenerateResourcesMutation.isPending || activeJobId ? 'Curating...' : 'Refresh Resources'}</span>
              </button>
            </div>
          </div>

          {/* Progress Banner during Live Generation */}
          {(activeJobId || isResourcesLoading) && (
            <div className="p-8 rounded-3xl bg-purple-950/20 border border-purple-500/30 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {jobProgress?.stage || 'Curating & Ranking Multi-Source Resources...'}
                </h3>
                <p className="text-xs text-[#9f99b0]">
                  Querying YouTube, Wikipedia, Developer Guides, and arXiv with two-stage semantic ranking.
                </p>
              </div>

              {jobProgress && (
                <div className="w-full max-w-md mx-auto space-y-1">
                  <div className="w-full bg-[#1c1729] h-2 rounded-full overflow-hidden border border-[#383050]">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${jobProgress.progress || 20}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-[#9f99b0]">
                    <span>{jobProgress.stage}</span>
                    <span>{jobProgress.progress}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resources List grouped by Topic */}
          {!activeJobId && !isResourcesLoading && (
            <>
              {(!resourcesData || resourcesData.length === 0) ? (
                <div className="p-12 rounded-3xl bg-[#14111f] border border-[#383050] text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-400">
                    <Video className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">No Curated Resources Yet</h3>
                  <p className="text-xs text-[#9f99b0] max-w-sm mx-auto">
                    Click below to discover and rank top YouTube tutorials, documentation, and papers for Day {dayData.dayNumber}.
                  </p>
                  <button
                    onClick={() => regenerateResourcesMutation.mutate()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Curate Resources Now</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-10">
                  {Object.entries(
                    resourcesData.reduce((acc, curr) => {
                      const topic = curr.topicTitle || curr.topicKey || 'General Resources';
                      if (!acc[topic]) acc[topic] = [];
                      acc[topic].push(curr);
                      return acc;
                    }, {})
                  ).map(([topicTitle, items]) => (
                    <div key={topicTitle} className="space-y-4">
                      {/* Topic Section Header */}
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-1 bg-purple-400 rounded-full" />
                        <h3 className="text-base font-extrabold text-white">{topicTitle}</h3>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#1c1729] border border-[#383050] text-[#9f99b0]">
                          {items.length} {items.length === 1 ? 'Resource' : 'Resources'}
                        </span>
                      </div>

                      {/* Resource Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map((item) => {
                          const res = item.resourceId || item;
                          const feedback = item.feedback || {};

                          const sourceConfig = {
                            youtube: {
                              label: 'YouTube',
                              color: 'text-red-400 bg-red-500/10 border-red-500/30',
                              icon: PlayCircle
                            },
                            wikipedia: {
                              label: 'Wikipedia',
                              color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
                              icon: BookOpen
                            },
                            arxiv: {
                              label: 'arXiv Paper',
                              color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
                              icon: GraduationCap
                            },
                            web: {
                              label: 'Documentation',
                              color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                              icon: Globe
                            }
                          }[res.source] || {
                            label: 'External',
                            color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
                            icon: Globe
                          };

                          const SourceIcon = sourceConfig.icon;

                          return (
                            <div
                              key={item._id}
                              className={`p-5 rounded-3xl bg-[#14111f] border transition-all flex flex-col justify-between space-y-4 ${
                                feedback.watched
                                  ? 'border-emerald-500/30 bg-emerald-950/5'
                                  : 'border-[#383050] hover:border-purple-500/40'
                              }`}
                            >
                              <div className="space-y-3">
                                {/* Card Header: Source Badge + Score */}
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${sourceConfig.color}`}
                                  >
                                    <SourceIcon className="w-3.5 h-3.5" />
                                    <span>{sourceConfig.label}</span>
                                  </span>

                                  {item.finalScore ? (
                                    <span className="text-[11px] font-mono font-bold text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded-md border border-purple-800/40">
                                      Match {item.finalScore}%
                                    </span>
                                  ) : null}
                                </div>

                                {/* Thumbnail for YouTube if available */}
                                {res.thumbnail && (
                                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/40 border border-[#383050] group">
                                    <img
                                      src={res.thumbnail}
                                      alt={res.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                    {res.durationSec && (
                                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] font-mono text-white font-bold">
                                        {Math.floor(res.durationSec / 60)}:
                                        {String(res.durationSec % 60).padStart(2, '0')}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Title & Author */}
                                <div>
                                  <a
                                    href={res.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-bold text-white hover:text-purple-300 transition-colors line-clamp-2 inline-flex items-start gap-1 group"
                                  >
                                    <span>{res.title}</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-[#9f99b0] group-hover:text-purple-300 shrink-0 mt-0.5" />
                                  </a>
                                  {res.authorOrChannel && (
                                    <p className="text-[11px] text-[#9f99b0] mt-0.5">
                                      by <span className="text-slate-300 font-medium">{res.authorOrChannel}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Why Recommended Callout */}
                                {item.whyRecommended && (
                                  <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-900/40 flex items-start gap-2 text-xs text-purple-200/90 leading-relaxed">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                                    <span>{item.whyRecommended}</span>
                                  </div>
                                )}

                                {/* Description */}
                                {res.description && (
                                  <p className="text-xs text-[#9f99b0] line-clamp-3 leading-relaxed">
                                    {res.description}
                                  </p>
                                )}
                              </div>

                              {/* Card Footer: Watched Checkbox + Thumbs Feedback */}
                              <div className="pt-3 border-t border-[#252033] flex items-center justify-between text-xs">
                                <button
                                  onClick={() =>
                                    feedbackMutation.mutate({
                                      dayResourceId: item._id,
                                      watched: !feedback.watched
                                    })
                                  }
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                                    feedback.watched
                                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                                      : 'text-[#9f99b0] hover:text-white bg-[#1c1729] border border-[#383050]'
                                  }`}
                                >
                                  {feedback.watched ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-[#9f99b0]" />
                                  )}
                                  <span>{feedback.watched ? 'Watched' : 'Mark as Watched'}</span>
                                </button>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() =>
                                      feedbackMutation.mutate({
                                        dayResourceId: item._id,
                                        helpful: feedback.helpful === true ? null : true
                                      })
                                    }
                                    title="Helpful"
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      feedback.helpful === true
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                        : 'bg-[#1c1729] border-[#383050] text-[#9f99b0] hover:text-white'
                                    }`}
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      feedbackMutation.mutate({
                                        dayResourceId: item._id,
                                        helpful: feedback.helpful === false ? null : false
                                      })
                                    }
                                    title="Not Helpful"
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      feedback.helpful === false
                                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                        : 'bg-[#1c1729] border-[#383050] text-[#9f99b0] hover:text-white'
                                    }`}
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 3: DAILY CBT DIAGNOSTIC TEST (Phase 7) */}
      {activeTab === 'test' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#14111f] border border-[#383050]">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-400" />
                <span>Day {dayData.dayNumber} Concept Examination</span>
              </h2>
              <p className="text-xs text-[#9f99b0] mt-1">
                Grounded multiple-choice diagnostic test covering today's concepts with positive and negative marking.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => generateTestMutation.mutate()}
                disabled={generateTestMutation.isPending || activeJobId}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1c1729] hover:bg-[#251e35] disabled:opacity-50 border border-[#383050] text-xs font-semibold text-[#9f99b0] hover:text-white transition-all cursor-pointer shadow-sm"
              >
                {generateTestMutation.isPending || activeJobId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{generateTestMutation.isPending || activeJobId ? 'Preparing...' : 'Re-generate Test'}</span>
              </button>
            </div>
          </div>

          {/* Progress Banner during Live Generation */}
          {(activeJobId || isTestLoading) && (
            <div className="p-8 rounded-3xl bg-amber-950/20 border border-amber-500/30 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {jobProgress?.stage || 'Synthesizing Grounded CBT Questions...'}
                </h3>
                <p className="text-xs text-[#9f99b0]">
                  Formulating diagnostic questions grounded in your course materials with randomized distractors.
                </p>
              </div>

              {jobProgress && (
                <div className="w-full max-w-md mx-auto space-y-1">
                  <div className="w-full bg-[#1c1729] h-2 rounded-full overflow-hidden border border-[#383050]">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${jobProgress.progress || 25}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-[#9f99b0]">
                    <span>{jobProgress.stage}</span>
                    <span>{jobProgress.progress}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Available & Past Attempts */}
          {!activeJobId && !isTestLoading && dayTestData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Test Details & Start Action */}
              <div className="lg:col-span-7 space-y-6">
                <div className="p-6 rounded-3xl bg-[#14111f] border border-[#383050] space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-300">
                      <Award className="w-3.5 h-3.5" />
                      <span>{dayTestData.mode === 'practice' ? 'Practice Examination' : 'Exam Mode'}</span>
                    </span>

                    <span className="text-xs font-mono text-[#9f99b0]">
                      Format: Standard CBT
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-white leading-tight">
                      {dayTestData.title}
                    </h3>
                    <p className="text-xs text-[#9f99b0] mt-1 leading-relaxed">
                      {dayTestData.description}
                    </p>
                  </div>

                  {/* Test Specs Grid */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-[#1c1729] border border-[#2b243d] text-center">
                      <div className="text-[11px] text-[#9f99b0] uppercase font-mono">Questions</div>
                      <div className="text-lg font-mono font-extrabold text-white mt-0.5">
                        {dayTestData.totalQuestions}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#1c1729] border border-[#2b243d] text-center">
                      <div className="text-[11px] text-[#9f99b0] uppercase font-mono">Time Limit</div>
                      <div className="text-lg font-mono font-extrabold text-amber-300 mt-0.5">
                        {dayTestData.timeLimitMinutes}m
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#1c1729] border border-[#2b243d] text-center">
                      <div className="text-[11px] text-[#9f99b0] uppercase font-mono">Marking</div>
                      <div className="text-lg font-mono font-extrabold text-emerald-400 mt-0.5">
                        +{dayTestData.markingScheme?.correct || 4} / {dayTestData.markingScheme?.incorrect || -1}
                      </div>
                    </div>
                  </div>

                  {/* Topics Covered */}
                  {dayTestData.conceptKeys?.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Concepts Evaluated:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {dayTestData.conceptKeys.map((k) => (
                          <span
                            key={k}
                            className="text-xs px-2.5 py-1 rounded-xl bg-[#1c1729] border border-[#383050] text-purple-300 font-mono"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Primary CTA */}
                  <div className="pt-4 border-t border-[#251e35] flex flex-wrap items-center gap-3">
                    <Link
                      to={`/test/${dayTestData._id}`}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>{userAttempts.length > 0 ? 'Take Another Attempt' : 'Start Day Test'}</span>
                    </Link>

                    {userAttempts.length > 0 && (
                      <Link
                        to={`/test/${dayTestData._id}?retake=true`}
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#1c1729] hover:bg-[#251e35] text-purple-300 text-xs font-bold border border-[#383050] transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Fresh Retake</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Performance History / Attempts */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-6 rounded-3xl bg-[#14111f] border border-[#383050] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#251e35]">
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Attempt History ({userAttempts.length})</span>
                    </h4>
                  </div>

                  {userAttempts.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <HelpCircle className="w-8 h-8 text-[#9f99b0] mx-auto opacity-50" />
                      <p className="text-xs text-[#9f99b0]">No attempts recorded yet for Day {dayData.dayNumber}.</p>
                      <p className="text-[11px] text-slate-500">
                        Complete your study notes, then take this diagnostic quiz to evaluate your retention.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userAttempts.map((att, idx) => (
                        <div
                          key={att._id}
                          className="p-4 rounded-2xl bg-[#1c1729] border border-[#383050] hover:border-purple-500/40 transition-all flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-white">
                                Attempt #{userAttempts.length - idx}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold">
                                {att.accuracy || 0}% Accuracy
                              </span>
                            </div>
                            <div className="text-[11px] text-[#9f99b0] mt-1 font-mono">
                              Score: <span className="text-purple-300 font-bold">{att.score}</span> / {att.maxScore} pts · {Math.floor((att.timeSpentSeconds || 0) / 60)}m
                            </div>
                          </div>

                          <Link
                            to={`/results/${att._id}`}
                            className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all inline-flex items-center gap-1 shrink-0"
                          >
                            <span>Review</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* If no test generated yet */}
          {!activeJobId && !isTestLoading && !dayTestData && (
            <div className="p-12 rounded-3xl bg-[#14111f] border border-[#383050] text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Day {dayData.dayNumber} Test Ready to Generate</h3>
              <p className="text-xs text-[#9f99b0] max-w-sm mx-auto">
                Generate diagnostic CBT multiple-choice questions grounded in today's topics and verified study materials.
              </p>
              <button
                onClick={() => generateTestMutation.mutate()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Day Test</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Citation Inspection Drawer / Modal */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel max-w-lg w-full rounded-3xl p-6 border border-indigo-500/50 bg-[#14111f] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#251e35]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-600/30 text-indigo-300">
                  {activeCitation.citationId}
                </span>
                <span className="text-sm font-bold text-white">Grounded Reference Citation</span>
              </div>
              <button
                onClick={() => setActiveCitation(null)}
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[#1c1729] border border-[#2b243d] space-y-1.5">
                <div className="text-[11px] font-mono text-[#9f99b0] uppercase">Source Document:</div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>{activeCitation.materialName}</span>
                </div>
                {(activeCitation.location?.page || activeCitation.location?.slide || activeCitation.location?.heading) && (
                  <div className="text-xs text-indigo-300 font-mono">
                    Location:{' '}
                    {[
                      activeCitation.location?.page && `Page ${activeCitation.location.page}`,
                      activeCitation.location?.slide && `Slide ${activeCitation.location.slide}`,
                      activeCitation.location?.heading && activeCitation.location.heading
                    ].filter(Boolean).join(' • ')}
                  </div>
                )}
              </div>

              {activeCitation.snippet && (
                <div className="space-y-1">
                  <span className="text-[11px] font-mono text-[#9f99b0] uppercase">Material Excerpt:</span>
                  <div className="p-4 rounded-2xl bg-[#0a0a0f] border border-[#2b243d] text-xs text-slate-300 italic leading-relaxed font-serif">
                    "{activeCitation.snippet}..."
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveCitation(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                Close Citation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Tutor Drawer (Phase 9) */}
      <AITutorDrawer workspaceId={workspaceId} dayId={dayId} dayTitle={day?.title} />
    </div>
  );
};

export default DayView;
