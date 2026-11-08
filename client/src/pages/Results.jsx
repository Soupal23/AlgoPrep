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
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-400 font-mono text-sm">Evaluating Attempt & Generating Scorecard...</p>
        </div>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 glass-panel rounded-2xl border border-rose-800 text-center space-y-4">
        <p className="text-rose-300 font-semibold">{error || 'Attempt result not found'}</p>
        <Link to="/dashboard" className="inline-block px-5 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold">
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Main Scorecard Banner */}
      <div className="bg-[#14111f] rounded-3xl p-8 border border-[#383050] shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#383050]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">{test?.title || 'CBT Assessment'}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Submitted on {new Date(attempt.submittedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {test?.dayId && (
              <Link
                to={`/workspaces/${test.workspaceId || attempt?.workspaceId}/days/${test.dayId}`}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Day Session</span>
              </Link>
            )}
            <Link
              to={`/test/${test?._id}?retake=true`}
              className="px-4 py-2.5 rounded-xl bg-[#1c1729] hover:bg-[#251e35] text-purple-300 text-xs font-semibold border border-[#383050] transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Exam</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#1c1729] rounded-2xl p-4 border border-[#383050] text-center">
            <div className="text-xs text-slate-400 mb-1">Final Score</div>
            <div className="text-2xl font-mono font-extrabold text-purple-400">
              {attempt.score} <span className="text-xs text-slate-500">/ {attempt.maxScore}</span>
            </div>
          </div>

          <div className="bg-[#1c1729] rounded-2xl p-4 border border-[#383050] text-center">
            <div className="text-xs text-slate-400 mb-1">Accuracy</div>
            <div className="text-2xl font-mono font-extrabold text-emerald-400">
              {attempt.accuracy}%
            </div>
          </div>

          <div className="bg-[#1c1729] rounded-2xl p-4 border border-[#383050] text-center">
            <div className="text-xs text-slate-400 mb-1">Time Spent</div>
            <div className="text-2xl font-mono font-extrabold text-amber-400">
              {Math.floor(attempt.timeSpentSeconds / 60)}m {attempt.timeSpentSeconds % 60}s
            </div>
          </div>

          <div className="bg-[#1c1729] rounded-2xl p-4 border border-[#383050] text-center">
            <div className="text-xs text-slate-400 mb-1">Tab Switches</div>
            <div className={`text-2xl font-mono font-extrabold ${attempt.tabSwitches > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {attempt.tabSwitches}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-[#383050] pb-2">
        <button
          onClick={() => handleTabChange('review')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'review'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-[#1c1729] text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Answer Key</span>
        </button>

        <button
          onClick={() => handleTabChange('analysis')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'analysis'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-[#1c1729] text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Mastery & Analysis</span>
        </button>

        <button
          onClick={() => handleTabChange('ai-plan')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'ai-plan'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-[#1c1729] text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-200" />
          <span>Revision Plan</span>
        </button>
      </div>

      {/* TAB 1: Question Review */}
      {activeTab === 'review' && (
        <div className="space-y-6">
          {/* Question Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-card border border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setQuestionFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  questionFilter === 'all' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All ({questions.length})
              </button>
              <button
                onClick={() => setQuestionFilter('correct')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  questionFilter === 'correct' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                }`}
              >
                Correct ({correctCount})
              </button>
              <button
                onClick={() => setQuestionFilter('incorrect')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  questionFilter === 'incorrect' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
                }`}
              >
                Incorrect ({incorrectCount})
              </button>
              <button
                onClick={() => setQuestionFilter('unattempted')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  questionFilter === 'unattempted' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
                  className={`glass-card rounded-2xl p-6 border transition-all ${
                    q.status === 'correct'
                      ? 'border-emerald-500/30'
                      : q.status === 'incorrect'
                      ? 'border-rose-500/30'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        Question {q.order}
                      </span>
                      {q.conceptKey && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/40">
                          {q.conceptKey}
                        </span>
                      )}
                      {q.bloomLevel && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
                          {q.bloomLevel}
                        </span>
                      )}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold ${
                        q.status === 'correct'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : q.status === 'incorrect'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {q.status === 'correct' && <Check className="w-3.5 h-3.5" />}
                      {q.status === 'incorrect' && <X className="w-3.5 h-3.5" />}
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

                      let style = 'bg-slate-900/80 border-slate-800 text-slate-300';

                      if (isCorrectOption) {
                        style = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-semibold ring-1 ring-emerald-500';
                      } else if (isSelected && !isCorrectOption) {
                        style = 'bg-rose-950/80 border-rose-500 text-rose-200 font-semibold';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3.5 rounded-xl border text-sm flex items-start justify-between gap-3 ${style}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="mt-0.5">{opt}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Your Answer</span>
                            )}
                            {isCorrectOption && (
                              <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-bold">Correct Key</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Box */}
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs leading-relaxed space-y-1">
                    <span className="font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                      Explanation:
                    </span>
                    <p className="text-slate-300">{q.explanation}</p>
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
            <div className="p-12 text-center space-y-3 glass-card rounded-3xl border border-slate-800">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
              <p className="text-sm text-slate-400 font-mono">Synthesizing concept mastery & dynamic signals...</p>
            </div>
          ) : !analysis ? (
            <div className="p-8 text-center space-y-3 glass-card rounded-3xl border border-slate-800">
              <p className="text-slate-400 text-sm">No concept analysis recorded for this attempt.</p>
              <button
                onClick={fetchAnalysis}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold cursor-pointer"
              >
                Generate Analysis
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="p-6 rounded-3xl bg-[#14111f] border border-[#383050] space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-300">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Performance Diagnostic</h2>
                      <span className="text-[11px] font-mono text-purple-400">
                        {analysis.source === 'ai' ? 'AI Diagnostic Synthesis' : 'Signal-Weighted Analysis'}
                      </span>
                    </div>
                  </div>
                  {test?.workspaceId && (
                    <Link
                      to={`/workspaces/${test.workspaceId}`}
                      className="px-3 py-1.5 rounded-xl bg-[#1c1729] hover:bg-[#251e35] text-purple-300 text-xs font-semibold border border-[#383050] flex items-center gap-1.5 transition-colors"
                    >
                      <span>Workspace Overview</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
                <p className="text-sm text-slate-200 leading-relaxed bg-[#1c1729]/60 p-4 rounded-2xl border border-[#383050]/50">
                  {analysis.summary}
                </p>
              </div>

              {/* Concept Mastery Changes (Deltas) */}
              <div className="p-6 rounded-3xl bg-[#14111f] border border-[#383050] space-y-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-300">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Concept Mastery Progression</h2>
                      <p className="text-xs text-[#9f99b0]">Running weighted score updated with SM-2 spaced repetition</p>
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
                        className="p-4 rounded-2xl bg-[#1c1729] border border-[#383050] space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-white truncate">
                            {m.conceptTitle || m.conceptKey}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                              isPositive
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {isPositive ? `+${deltaPct}%` : `${deltaPct}%`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono text-[#9f99b0]">
                          <span>Before: {beforePct}%</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-white font-bold">Now: {afterPct}%</span>
                        </div>

                        <div className="w-full h-2 rounded-full bg-[#14111f] overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              afterPct >= 75
                                ? 'bg-emerald-500'
                                : afterPct >= 60
                                ? 'bg-indigo-500'
                                : 'bg-rose-500'
                            }`}
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
                <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-900/60 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-rose-300">Weak Concepts Identified</h2>
                      <p className="text-xs text-rose-400/80">
                        Mastery is below 60%. These have been scheduled for automated revision.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {analysis.weakConcepts.map((w, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[#14111f]/80 border border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-sm text-white">{w.conceptTitle || w.conceptKey}</span>
                          <p className="text-xs text-rose-300/80 mt-0.5">{w.reason}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-rose-950 border border-rose-800 text-rose-400 shrink-0">
                          {Math.round(w.mastery * 100)}% Mastery
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths Card */}
              {analysis.strengths?.length > 0 && (
                <div className="p-6 rounded-3xl bg-emerald-950/20 border border-emerald-900/60 space-y-4 shadow-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-emerald-300">Demonstrated Strengths</h2>
                      <p className="text-xs text-emerald-400/80">Mastery is 75%+ with solid retention.</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {analysis.strengths.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-[#14111f] border border-emerald-900/50 text-emerald-300 text-xs font-bold flex items-center gap-2"
                      >
                        <span>{s.conceptTitle || s.conceptKey}</span>
                        <span className="text-[11px] font-mono text-emerald-400/70">
                          ({Math.round(s.mastery * 100)}%)
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Next Steps */}
              {analysis.nextSteps?.length > 0 && (
                <div className="p-6 rounded-3xl bg-[#14111f] border border-[#383050] space-y-4 shadow-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Recommended Next Steps</h2>
                      <p className="text-xs text-[#9f99b0]">Targeted recommendations for your next study block</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {analysis.nextSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#1c1729] border border-[#383050] text-xs text-slate-200"
                      >
                        <span className="w-5 h-5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
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
