import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
        <p className="text-xs font-mono text-zinc-400">Loading session...</p>
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
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-400" />
          <span>Back to Roadmap</span>
        </Link>

        {/* Status Actions */}
        <div className="flex items-center gap-2.5">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-white" /> Completed
            </span>
          ) : (
            <button
              onClick={() => updateStatusMutation.mutate({ status: 'completed' })}
              disabled={updateStatusMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Completed</span>
            </button>
          )}

          <button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending || !!activeJobId}
            title="Regenerate Grounded Notes"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-zinc-400 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Regenerate</span>
          </button>
        </div>
      </div>

      {/* Main Day Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl border border-[#27272a] bg-[#121215] space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-zinc-900 border border-zinc-800 text-white">
            DAY {dayData.dayNumber}
          </span>
          <span className="px-2.5 py-1 rounded text-xs font-mono uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-400">
            {dayData.type}
          </span>
          <div className="flex items-center gap-1 text-xs text-zinc-500 font-mono ml-auto">
            <Clock className="w-3.5 h-3.5" />
            <span>~{dayData.estMinutes}m</span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {dayData.title}
        </h1>

        {/* Objectives Checklist */}
        {dayData.objectives?.length > 0 && (
          <div className="pt-2 border-t border-[#27272a] space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Target Objectives
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-zinc-300">
              {dayData.objectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-2 bg-[#18181b] p-2.5 rounded-lg border border-[#27272a]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{obj}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Tabs Header (Notes | Resources | Test) */}
      <div className="flex items-center gap-1 p-1 rounded-full bg-[#121215] border border-[#27272a] max-w-md">
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'notes'
              ? 'bg-white text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Notes</span>
        </button>

        <button
          onClick={() => setActiveTab('resources')}
          className={`flex-1 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'resources'
              ? 'bg-white text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Resources</span>
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`flex-1 py-1.5 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'test'
              ? 'bg-white text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Quiz</span>
        </button>
      </div>

      {/* TAB 1: GROUNDED NOTES VIEW (Phase 5) */}
      {activeTab === 'notes' && (
        <div className="space-y-8">
          {/* Generation Progress Banner */}
          {isGenerating && (
            <div className="p-6 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating Study Notes...</span>
                </div>
                <span className="font-mono text-xs font-bold text-white">
                  {jobProgress?.progress || 35}%
                </span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300 rounded-full"
                  style={{ width: `${jobProgress?.progress || 35}%` }}
                />
              </div>
            </div>
          )}

          {/* Render Grounded Notes Content */}
          {notesData && (
            <>
              {/* Quick Summary / Key Takeaways Callout */}
              {notesData.keyPoints?.length > 0 && (
                <div className="p-6 rounded-2xl bg-[#121215] border border-[#27272a] space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-white" />
                    <span>Key Takeaways</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-300">
                    {notesData.keyPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2 bg-[#18181b] p-3 rounded-xl border border-[#27272a]">
                        <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
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
                    className="p-6 sm:p-8 rounded-2xl bg-[#121215] border border-[#27272a] space-y-5"
                  >
                    {/* Section Top Header & Beyond Materials Alert */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#27272a]">
                      <div className="space-y-1">
                        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                          Module {idx + 1}
                        </span>
                        <h2 className="text-lg font-bold text-white tracking-tight">
                          {section.heading}
                        </h2>
                      </div>

                      {section.isBeyondMaterials && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Supplemented Theory</span>
                        </span>
                      )}
                    </div>

                    {/* Markdown Body */}
                    <div className="prose prose-invert max-w-none text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-4">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold text-white mt-4 mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold text-zinc-200 mt-3 mb-1.5">{children}</h3>,
                          p: ({ children }) => <p className="leading-relaxed mb-3">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-3">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-3">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-5 rounded-xl border border-[#27272a] bg-[#09090b]">
                              <table className="w-full text-left text-xs border-collapse divide-y divide-[#27272a]">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-[#121215] text-zinc-300 font-mono text-[11px] uppercase tracking-wider">{children}</thead>,
                          tbody: ({ children }) => <tbody className="divide-y divide-[#27272a] bg-[#09090b]">{children}</tbody>,
                          tr: ({ children }) => <tr className="hover:bg-zinc-900/40 transition-colors">{children}</tr>,
                          th: ({ children }) => <th className="px-4 py-3 font-semibold border-b border-[#27272a] text-zinc-300">{children}</th>,
                          td: ({ children }) => <td className="px-4 py-3 text-zinc-300 leading-relaxed align-top">{children}</td>,
                          code: ({ inline, children }) =>
                            inline ? (
                              <code className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-zinc-200 text-[12px]">
                                {children}
                              </code>
                            ) : (
                              <pre className="p-4 rounded-xl bg-[#09090b] border border-zinc-800 overflow-x-auto text-[12px] font-mono text-zinc-200">
                                <code>{children}</code>
                              </pre>
                            ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-white pl-4 py-1 italic bg-zinc-900/30 text-zinc-300 my-3">
                              {children}
                            </blockquote>
                          )
                        }}
                      >
                        {section.markdown
                          ? section.markdown
                              .replace(/\|\s*\|\s*/g, '|\n| ')
                              .replace(/\n\s*\|/g, '\n|')
                              .replace(/\|\s*\n/g, '|\n')
                          : ''}
                      </ReactMarkdown>
                    </div>

                    {/* Verified Course Citations Chips */}
                    {section.citations?.length > 0 && (
                      <div className="pt-4 border-t border-[#27272a] space-y-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-white" />
                          <span>Grounded Source Citations:</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {section.citations.map((cite, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => setActiveCitation(cite)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                            >
                              <span className="text-white font-bold">[{cite.citationId}]</span>
                              <span>{cite.materialName}</span>
                              {(cite.location?.page || cite.location?.slide) && (
                                <span className="text-[10px] text-zinc-500">
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
                <div className="p-6 sm:p-8 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-zinc-400" />
                      <span>Active Recall Flashcards ({flashcards.length})</span>
                    </h3>
                    <span className="font-mono text-xs text-zinc-500">
                      {currentCardIdx + 1} / {flashcards.length}
                    </span>
                  </div>

                  {/* Card Surface */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="min-h-[160px] p-8 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-zinc-700 transition-colors flex flex-col items-center justify-center text-center cursor-pointer space-y-3"
                  >
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-medium">
                      {isFlipped ? 'Answer:' : 'Question (Click to reveal):'}
                    </span>
                    <p className="text-base font-bold text-white max-w-xl leading-relaxed">
                      {isFlipped ? (flashcards[currentCardIdx]?.back || '') : (flashcards[currentCardIdx]?.front || '')}
                    </p>
                  </div>

                  {/* Flashcard Navigation Controls */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setCurrentCardIdx((prev) => Math.max(0, prev - 1));
                      }}
                      disabled={currentCardIdx === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-xs font-medium text-white transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {flashcards.map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            i === currentCardIdx ? 'w-4 bg-white' : 'bg-zinc-800'
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
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-xs font-medium text-white transition-colors cursor-pointer"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Actions: Mark Notes Read */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-[#121215] border border-[#27272a]">
                <h4 className="text-sm font-bold text-white">Finished reading today's notes?</h4>

                <button
                  onClick={() => markReadMutation.mutate()}
                  disabled={markReadMutation.isPending || notesData.readStatus}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-xs transition-colors cursor-pointer ${
                    notesData.readStatus
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                      : 'bg-white hover:bg-zinc-200 text-black'
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
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#121215] border border-[#27272a]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-zinc-400" />
                <span>Curated Resources</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => regenerateResourcesMutation.mutate()}
                disabled={regenerateResourcesMutation.isPending || activeJobId}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                {regenerateResourcesMutation.isPending || activeJobId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>{regenerateResourcesMutation.isPending || activeJobId ? 'Curating...' : 'Refresh Resources'}</span>
              </button>
            </div>
          </div>

          {/* Progress Banner during Live Generation */}
          {(activeJobId || isResourcesLoading) && (
            <div className="p-8 rounded-2xl bg-[#121215] border border-[#27272a] text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-white">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  {jobProgress?.stage || 'Curating & Ranking Multi-Source Resources...'}
                </h3>
              </div>

              {jobProgress && (
                <div className="w-full max-w-md mx-auto space-y-1">
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-white h-full transition-all duration-300 rounded-full"
                      style={{ width: `${jobProgress.progress || 20}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-zinc-500">
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
                <div className="p-10 rounded-2xl bg-[#121215] border border-[#27272a] text-center space-y-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                    <Video className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">No Resources Curated Yet</h3>
                  <button
                    onClick={() => regenerateResourcesMutation.mutate()}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Curate Resources Now</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(
                    resourcesData.reduce((acc, curr) => {
                      const topic = curr.topicTitle || curr.topicKey || 'General Resources';
                      if (!acc[topic]) acc[topic] = [];
                      acc[topic].push(curr);
                      return acc;
                    }, {})
                  ).map(([topicTitle, items]) => (
                    <div key={topicTitle} className="space-y-3">
                      {/* Topic Section Header */}
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{topicTitle}</h3>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500">
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
                              color: 'text-zinc-200 bg-zinc-900 border-zinc-800',
                              icon: PlayCircle
                            },
                            wikipedia: {
                              label: 'Wikipedia',
                              color: 'text-zinc-200 bg-zinc-900 border-zinc-800',
                              icon: BookOpen
                            },
                            arxiv: {
                              label: 'arXiv Paper',
                              color: 'text-zinc-200 bg-zinc-900 border-zinc-800',
                              icon: GraduationCap
                            },
                            web: {
                              label: 'Documentation',
                              color: 'text-zinc-200 bg-zinc-900 border-zinc-800',
                              icon: Globe
                            }
                          }[res.source] || {
                            label: 'External',
                            color: 'text-zinc-400 bg-zinc-900 border-zinc-800',
                            icon: Globe
                          };

                          const SourceIcon = sourceConfig.icon;

                          return (
                            <div
                              key={item._id}
                              className={`p-5 rounded-2xl bg-[#121215] border transition-all flex flex-col justify-between space-y-4 ${
                                feedback.watched
                                  ? 'border-zinc-700 bg-[#151519]'
                                  : 'border-[#27272a] hover:border-zinc-700'
                              }`}
                            >
                              <div className="space-y-3">
                                {/* Card Header: Source Badge + Score */}
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono border ${sourceConfig.color}`}
                                  >
                                    <SourceIcon className="w-3.5 h-3.5" />
                                    <span>{sourceConfig.label}</span>
                                  </span>

                                  {item.finalScore ? (
                                    <span className="text-[11px] font-mono font-medium text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                      {item.finalScore}%
                                    </span>
                                  ) : null}
                                </div>

                                {/* Thumbnail for YouTube if available */}
                                {res.thumbnail && (
                                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-[#27272a] group">
                                    <img
                                      src={res.thumbnail}
                                      alt={res.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                    {res.durationSec && (
                                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
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
                                    className="text-sm font-bold text-white hover:underline transition-all line-clamp-2 inline-flex items-start gap-1 group"
                                  >
                                    <span>{res.title}</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                                  </a>
                                  {res.authorOrChannel && (
                                    <p className="text-[11px] text-zinc-500 mt-0.5">
                                      by <span className="text-zinc-400 font-medium">{res.authorOrChannel}</span>
                                    </p>
                                  )}
                                </div>

                                {/* Why Recommended Callout */}
                                {item.whyRecommended && (
                                  <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
                                    <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                                    <span>{item.whyRecommended}</span>
                                  </div>
                                )}

                                {/* Description */}
                                {res.description && (
                                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                                    {res.description}
                                  </p>
                                )}
                              </div>

                              {/* Card Footer: Watched Checkbox + Thumbs Feedback */}
                              <div className="pt-3 border-t border-[#27272a] flex items-center justify-between text-xs">
                                <button
                                  onClick={() =>
                                    feedbackMutation.mutate({
                                      dayResourceId: item._id,
                                      watched: !feedback.watched
                                    })
                                  }
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors cursor-pointer text-xs font-medium ${
                                    feedback.watched
                                      ? 'text-white bg-zinc-800 border border-zinc-700'
                                      : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
                                  }`}
                                >
                                  {feedback.watched ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-white" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-zinc-500" />
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
                                    className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                                      feedback.helpful === true
                                        ? 'bg-white text-black border-white'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
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
                                    className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                                      feedback.helpful === false
                                        ? 'bg-zinc-800 text-white border-zinc-700'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
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
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#121215] border border-[#27272a]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-zinc-400" />
                <span>Day {dayData.dayNumber} Test</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => generateTestMutation.mutate()}
                disabled={generateTestMutation.isPending || activeJobId}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                {generateTestMutation.isPending || activeJobId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>{generateTestMutation.isPending || activeJobId ? 'Preparing...' : 'Re-generate'}</span>
              </button>
            </div>
          </div>

          {/* Progress Banner during Live Generation */}
          {(activeJobId || isTestLoading) && (
            <div className="p-8 rounded-2xl bg-[#121215] border border-[#27272a] text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-white">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <h3 className="text-sm font-bold text-white">
                {jobProgress?.stage || 'Synthesizing CBT Questions...'}
              </h3>

              {jobProgress && (
                <div className="w-full max-w-md mx-auto space-y-1">
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-white h-full transition-all duration-300 rounded-full"
                      style={{ width: `${jobProgress.progress || 25}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-zinc-500">
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
                <div className="p-6 rounded-2xl bg-[#121215] border border-[#27272a] space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium border border-zinc-800 bg-zinc-900 text-zinc-300">
                      <Award className="w-3.5 h-3.5" />
                      <span>{dayTestData.mode === 'practice' ? 'Practice' : 'Exam'}</span>
                    </span>

                    <span className="text-xs font-mono text-zinc-500">
                      CBT Engine
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {dayTestData.title}
                    </h3>
                  </div>

                  {/* Test Specs Grid */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] text-center">
                      <div className="text-[11px] text-zinc-500 uppercase font-mono">Questions</div>
                      <div className="text-base font-mono font-bold text-white mt-0.5">
                        {dayTestData.totalQuestions}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] text-center">
                      <div className="text-[11px] text-zinc-500 uppercase font-mono">Time Limit</div>
                      <div className="text-base font-mono font-bold text-white mt-0.5">
                        {dayTestData.timeLimitMinutes}m
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] text-center">
                      <div className="text-[11px] text-zinc-500 uppercase font-mono">Marking</div>
                      <div className="text-base font-mono font-bold text-white mt-0.5">
                        +{dayTestData.markingScheme?.correct || 4} / {dayTestData.markingScheme?.incorrect || -1}
                      </div>
                    </div>
                  </div>

                  {/* Topics Covered */}
                  {dayTestData.conceptKeys?.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider block">
                        Concepts Evaluated
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {dayTestData.conceptKeys.map((k) => (
                          <span
                            key={k}
                            className="text-xs px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Primary CTA */}
                  <div className="pt-4 border-t border-[#27272a] flex flex-wrap items-center gap-3">
                    <Link
                      to={`/test/${dayTestData._id}`}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{userAttempts.length > 0 ? 'Take Another Attempt' : 'Start Test'}</span>
                    </Link>

                    {userAttempts.length > 0 && (
                      <Link
                        to={`/test/${dayTestData._id}?retake=true`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retake</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Performance History / Attempts */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-6 rounded-2xl bg-[#121215] border border-[#27272a] space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-zinc-400" />
                      <span>Attempt History ({userAttempts.length})</span>
                    </h4>
                  </div>

                  {userAttempts.length === 0 ? (
                    <div className="py-6 text-center space-y-2">
                      <HelpCircle className="w-6 h-6 text-zinc-600 mx-auto" />
                      <p className="text-xs text-zinc-500">No attempts recorded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {userAttempts.map((att, idx) => (
                        <div
                          key={att._id}
                          className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-zinc-700 transition-colors flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-white">
                                #{userAttempts.length - idx}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono">
                                {att.accuracy || 0}% Accuracy
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
                              Score: <span className="text-white font-bold">{att.score}</span> / {att.maxScore} · {Math.floor((att.timeSpentSeconds || 0) / 60)}m
                            </div>
                          </div>

                          <Link
                            to={`/results/${att._id}`}
                            className="px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium transition-colors inline-flex items-center gap-1 shrink-0"
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
            <div className="p-10 rounded-2xl bg-[#121215] border border-[#27272a] text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <ClipboardList className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Day {dayData.dayNumber} Test Ready</h3>
              <button
                onClick={() => generateTestMutation.mutate()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Test</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Citation Inspection Drawer / Modal */}
      {activeCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-lg w-full rounded-2xl p-6 border border-[#27272a] bg-[#121215] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-zinc-900 border border-zinc-800 text-white">
                  {activeCitation.citationId}
                </span>
                <span className="text-sm font-bold text-white">Reference Citation</span>
              </div>
              <button
                onClick={() => setActiveCitation(null)}
                className="text-zinc-400 hover:text-white text-xs font-mono px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] space-y-1.5">
                <div className="text-[11px] font-mono text-zinc-500 uppercase">Document:</div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span>{activeCitation.materialName}</span>
                </div>
                {(activeCitation.location?.page || activeCitation.location?.slide || activeCitation.location?.heading) && (
                  <div className="text-xs text-zinc-400 font-mono">
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
                  <span className="text-[11px] font-mono text-zinc-500 uppercase">Excerpt:</span>
                  <div className="p-4 rounded-xl bg-[#09090b] border border-zinc-800 text-xs text-zinc-300 italic leading-relaxed">
                    "{activeCitation.snippet}..."
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveCitation(null)}
                className="px-4 py-2 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Tutor Drawer (Phase 9) */}
      <AITutorDrawer workspaceId={workspaceId} dayId={dayId} dayTitle={dayData?.title} />
    </div>
  );
};

export default DayView;
