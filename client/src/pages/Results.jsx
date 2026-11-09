import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Award,
  Clock,
  Sparkles,
  HelpCircle,
  Check,
  X,
  RotateCcw,
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Target,
  ArrowRight,
  Loader2,
  Compass
} from 'lucide-react';
import { RevisionPlanPanel } from '../components/revision/RevisionPlanPanel';

export const Results = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [attempt, setAttempt] = useState(null);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') === 'ai-plan'
      ? 'ai-plan'
      : searchParams.get('tab') === 'analysis'
      ? 'analysis'
      : 'review'
  ); // 'review' | 'analysis' | 'ai-plan'
  const [questionFilter, setQuestionFilter] = useState('all'); // 'all' | 'correct' | 'incorrect' | 'unattempted'

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'ai-plan' || tabParam === 'review' || tabParam === 'analysis') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const reviewRes = await api.getAttemptReview(id);
      setAttempt(reviewRes.attempt);
      setTest(reviewRes.test);
      setQuestions(reviewRes.questions || []);

      // Fetch attempt analysis asynchronously
      fetchAnalysis();
    } catch (err) {
      setError(err.message || 'Failed to load test attempt results');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysis = async () => {
    try {
      setAnalysisLoading(true);
      const res = await api.getAttemptAnalysis(id);
      if (res?.analysis) {
        setAnalysis(res.analysis);
      }
    } catch (err) {
      console.warn('Failed to fetch attempt analysis:', err.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleJumpToQuestion = (order) => {
    setActiveTab('review');
    setQuestionFilter('all');
    setTimeout(() => {
      const el = document.getElementById(`q-${order}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };



  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-white border-t-transparent animate-spin mx-auto" />
          <p className="text-zinc-400 font-mono text-sm">Evaluating Attempt...</p>
        </div>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-[#121215] rounded-2xl border border-zinc-700 text-center space-y-4">
        <p className="text-zinc-300 font-semibold">{error || 'Attempt result not found'}</p>
        <Link to="/dashboard" className="inline-block px-5 py-2 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const filteredQuestions = questions.filter(q => {
    if (questionFilter === 'correct') return q.status === 'correct';
    if (questionFilter === 'incorrect') return q.status === 'incorrect';
    if (questionFilter === 'unattempted') return q.status === 'unattempted';
    return true;
  });

  const correctCount = questions.filter(q => q.status === 'correct').length;
  const incorrectCount = questions.filter(q => q.status === 'incorrect').length;
  const unattemptedCount = questions.filter(q => q.status === 'unattempted').length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Main Scorecard Banner */}
      <div className="bg-[#121215] rounded-2xl p-6 sm:p-8 border border-zinc-700 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-700">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">{test?.title || 'CBT Assessment'}</h1>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              Submitted on {new Date(attempt.submittedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {test?.dayId && (
              <Link
                to={`/workspaces/${test.workspaceId || attempt?.workspaceId}/days/${test.dayId}`}
                className="px-4 py-2 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-all shadow-sm flex items-center gap-2 font-mono"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Session</span>
              </Link>
            )}
            <Link
              to={`/test/${test?._id}?retake=true`}
              className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-semibold transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-300" />
              <span>Retake Exam</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#18181b] rounded-xl p-3.5 border border-zinc-700 text-center">
            <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1">Final Score</div>
            <div className="text-xl font-mono font-bold text-amber-400">
              {attempt.score} <span className="text-xs text-zinc-400">/ {attempt.maxScore}</span>
            </div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-3.5 border border-zinc-700 text-center">
            <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1">Accuracy</div>
            <div className="text-xl font-mono font-bold text-emerald-400">
              {attempt.accuracy}%
            </div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-3.5 border border-zinc-700 text-center">
            <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1">Time Spent</div>
            <div className="text-xl font-mono font-bold text-white">
              {Math.floor(attempt.timeSpentSeconds / 60)}m {attempt.timeSpentSeconds % 60}s
            </div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-3.5 border border-zinc-700 text-center">
            <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1">Tab Warnings</div>
            <div className="text-xl font-mono font-bold text-white">
              {attempt.tabSwitches}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-700 pb-3">
        <button
          onClick={() => handleTabChange('review')}
          className={`px-4 py-2 rounded-full text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'review'
              ? 'bg-amber-500 text-black font-semibold shadow-[0_0_15px_rgba(245,158,11,0.25)]'
              : 'bg-[#18181b] border border-zinc-700 text-zinc-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Answer Key</span>
        </button>

        <button
          onClick={() => handleTabChange('analysis')}
          className={`px-4 py-2 rounded-full text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'analysis'
              ? 'bg-amber-500 text-black font-semibold shadow-[0_0_15px_rgba(245,158,11,0.25)]'
              : 'bg-[#18181b] border border-zinc-700 text-zinc-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Mastery &amp; Analysis</span>
        </button>

        <button
          onClick={() => handleTabChange('ai-plan')}
          className={`px-4 py-2 rounded-full text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'ai-plan'
              ? 'bg-amber-500 text-black font-semibold shadow-[0_0_15px_rgba(245,158,11,0.25)]'
              : 'bg-[#18181b] border border-zinc-700 text-zinc-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Revision Plan</span>
        </button>
      </div>

      {/* TAB 1: Question Review */}
      {activeTab === 'review' && (
        <div className="space-y-6">
          {/* Question Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#121215] rounded-2xl border border-zinc-700 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setQuestionFilter('all')}
                className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                  questionFilter === 'all' ? 'bg-white text-black' : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-700'
                }`}
              >
                All ({questions.length})
              </button>
              <button
                onClick={() => setQuestionFilter('correct')}
                className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                  questionFilter === 'correct' ? 'bg-white text-black' : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-700'
                }`}
              >
                Correct ({correctCount})
              </button>
              <button
                onClick={() => setQuestionFilter('incorrect')}
                className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                  questionFilter === 'incorrect' ? 'bg-white text-black' : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-700'
                }`}
              >
                Incorrect ({incorrectCount})
              </button>
              <button
                onClick={() => setQuestionFilter('unattempted')}
                className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                  questionFilter === 'unattempted' ? 'bg-white text-black' : 'bg-[#18181b] text-zinc-400 hover:text-white border border-zinc-700'
                }`}
              >
                Unattempted ({unattemptedCount})
              </button>
            </div>
          </div>

          {/* Question Review Cards List */}
          <div className="space-y-6">
            {filteredQuestions.map((q) => {
              return (
                <div
                  key={q._id}
                  id={`q-${q.order}`}
                  className="bg-[#121215] rounded-2xl p-6 border border-zinc-700 shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-zinc-700">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-medium text-zinc-400">
                        Question {q.order}
                      </span>
                      {q.conceptKey && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#18181b] text-zinc-400 border border-zinc-700">
                          {q.conceptKey}
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#18181b] text-zinc-300 border border-zinc-700">
                      {q.status === 'correct' && <Check className="w-3.5 h-3.5 text-white" />}
                      {q.status === 'incorrect' && <X className="w-3.5 h-3.5 text-zinc-400" />}
                      <span className="capitalize">{q.status}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-medium text-white mb-6 leading-relaxed">
                    {q.questionText}
                  </h3>

                  {/* Options List */}
                  <div className="space-y-2.5 mb-6">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = q.selectedOptionIndex === optIdx;
                      const isCorrectOption = q.correctOptionIndex === optIdx;

                      let style = 'bg-[#18181b] border-zinc-700 text-zinc-300';

                      if (isCorrectOption) {
                        style = 'bg-emerald-950/60 border-emerald-500/80 text-emerald-100 font-medium';
                      } else if (isSelected && !isCorrectOption) {
                        style = 'bg-rose-950/60 border-rose-500/80 text-rose-200 font-medium';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3.5 rounded-xl border text-sm flex items-start justify-between gap-3 ${style}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 font-mono text-xs flex items-center justify-center shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="mt-0.5">{opt}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">Your Answer</span>
                            )}
                            {isCorrectOption && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-black font-bold">Correct Key</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Box */}
                  <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-700 text-xs leading-relaxed space-y-1">
                    <span className="font-semibold text-white uppercase tracking-wider block mb-1">
                      Explanation
                    </span>
                    <p className="text-zinc-300">{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Mastery & Performance Analysis */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {analysisLoading && !analysis ? (
            <div className="p-12 text-center space-y-3 bg-[#121215] rounded-2xl border border-zinc-700">
              <Loader2 className="w-6 h-6 animate-spin text-white mx-auto" />
              <p className="text-xs text-zinc-400 font-mono">Analyzing concept mastery...</p>
            </div>
          ) : !analysis ? (
            <div className="p-8 text-center space-y-3 bg-[#121215] rounded-2xl border border-zinc-700">
              <p className="text-zinc-400 text-xs">No concept analysis recorded for this attempt.</p>
              <button
                onClick={fetchAnalysis}
                className="px-5 py-2 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-semibold cursor-pointer"
              >
                Generate Analysis
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-700 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Performance Diagnostic</h2>
                    </div>
                  </div>
                  {test?.workspaceId && (
                    <Link
                      to={`/workspaces/${test.workspaceId}`}
                      className="px-3.5 py-1.5 rounded-full bg-[#18181b] hover:bg-[#27272a] text-zinc-300 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors"
                    >
                      <span>Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed bg-[#18181b] p-4 rounded-xl border border-zinc-700">
                  {analysis.summary}
                </p>
              </div>

              {/* Concept Mastery Changes (Deltas) */}
              <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-700 space-y-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Concept Mastery Progression</h2>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(analysis.masteryDelta || []).map((m, idx) => {
                    const beforePct = Math.round(m.before * 100);
                    const afterPct = Math.round(m.after * 100);
                    const deltaPct = Math.round(m.delta * 100);
                    const isPositive = deltaPct >= 0;

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[#18181b] border border-zinc-700 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-white truncate">
                            {m.conceptTitle || m.conceptKey}
                          </span>
                          <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-[#121215] text-white border border-zinc-700"
                          >
                            {isPositive ? `+${deltaPct}%` : `${deltaPct}%`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                          <span>Before: {beforePct}%</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-white font-bold">Now: {afterPct}%</span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-[#121215] overflow-hidden">
                          <div
                            className="h-full transition-all duration-500 rounded-full bg-white"
                            style={{ width: `${afterPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weak Concepts Card */}
              {analysis.weakConcepts?.length > 0 && (
                <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-700 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Focus Areas</h2>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {analysis.weakConcepts.map((w, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[#18181b] border border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-semibold text-sm text-white">{w.conceptTitle || w.conceptKey}</span>
                          <p className="text-xs text-zinc-400 mt-0.5">{w.reason}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-[#121215] border border-zinc-700 text-zinc-300 shrink-0">
                          {Math.round(w.mastery * 100)}% Mastery
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths Card */}
              {analysis.strengths?.length > 0 && (
                <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-700 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Strengths</h2>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {analysis.strengths.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-3.5 py-1.5 rounded-full bg-[#18181b] border border-zinc-700 text-white text-xs font-semibold flex items-center gap-2"
                      >
                        <span>{s.conceptTitle || s.conceptKey}</span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          ({Math.round(s.mastery * 100)}%)
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Next Steps */}
              {analysis.nextSteps?.length > 0 && (
                <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-700 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Next Steps</h2>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {analysis.nextSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3.5 rounded-xl bg-[#18181b] border border-zinc-700 text-xs text-zinc-300"
                      >
                        <span className="w-5 h-5 rounded-md bg-white text-black font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AI Revision Plan */}
      {activeTab === 'ai-plan' && (
        <RevisionPlanPanel attemptId={id} onJumpToQuestion={handleJumpToQuestion} />
      )}
    </div>
  );
};
