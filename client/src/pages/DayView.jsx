import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { api } from '../services/api';
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
  ClipboardList
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

  // 3. Mark Day Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ status }) => api.updateDayStatus(dayId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day', dayId] });
      queryClient.invalidateQueries({ queryKey: ['roadmap', workspaceId] });
    }
  });

  // 4. Mark Notes Read Mutation
  const markReadMutation = useMutation({
    mutationFn: () => api.markNotesRead(dayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dayNotes', dayId] });
      queryClient.invalidateQueries({ queryKey: ['day', dayId] });
      queryClient.invalidateQueries({ queryKey: ['roadmap', workspaceId] });
    }
  });

  // 5. Force Regenerate Notes Mutation
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

  // 6. SSE Listener for Live Note Generation Progress
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

      {/* TAB 2: CURATED RESOURCES PLACEHOLDER (Phase 6) */}
      {activeTab === 'resources' && (
        <div className="p-8 sm:p-12 rounded-3xl bg-[#14111f] border border-[#383050] shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-400">
            <Video className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-white">External Curated Resources</h3>
          <p className="text-xs sm:text-sm text-[#9f99b0] max-w-lg mx-auto leading-relaxed">
            Ranked YouTube video tutorials, interactive algorithm visualizers, Wikipedia summaries, and research papers curated specifically for Day {dayData.dayNumber} will be integrated in <strong>Phase 6</strong>.
          </p>
        </div>
      )}

      {/* TAB 3: DAILY CBT QUIZ PLACEHOLDER (Phase 7) */}
      {activeTab === 'test' && (
        <div className="p-8 sm:p-12 rounded-3xl bg-[#14111f] border border-[#383050] shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-white">Day {dayData.dayNumber} Concept Examination</h3>
          <p className="text-xs sm:text-sm text-[#9f99b0] max-w-lg mx-auto leading-relaxed">
            Timed CBT quiz with negative marking, question bookmarks, and AI remediation tailored to Day {dayData.dayNumber} concepts will be activated in <strong>Phase 7</strong>.
          </p>
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
    </div>
  );
};

export default DayView;
