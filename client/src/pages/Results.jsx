import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Award, CheckCircle2, XCircle, Clock, ShieldAlert, ArrowLeft, Sparkles, HelpCircle, Check, X, RotateCcw, BookOpen, Target, Lightbulb, ExternalLink } from 'lucide-react';

export const Results = () => {
  const { id } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [revisionPlan, setRevisionPlan] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'ai-plan'
  const [questionFilter, setQuestionFilter] = useState('all'); // 'all' | 'correct' | 'incorrect' | 'unattempted'

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reviewRes, leaderboardRes] = await Promise.all([
        api.getAttemptReview(id),
        api.getLeaderboard('', 1, 1)
      ]);

      setAttempt(reviewRes.attempt);
      setTest(reviewRes.test);
      setQuestions(reviewRes.questions || []);

      if (leaderboardRes.myStats) {
        setMyStats(leaderboardRes.myStats);
      }
    } catch (err) {
      setError(err.message || 'Failed to load test attempt results');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIRevisionPlan = async () => {
    if (revisionPlan || loadingAI) return;
    try {
      setLoadingAI(true);
      const res = await api.getAIRevisionPlan(id);
      setRevisionPlan(res.revisionPlan);
    } catch (err) {
      setRevisionPlan('Failed to load AI revision plan.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'ai-plan' && !revisionPlan) {
      fetchAIRevisionPlan();
    }
  };

  const parseFormattedLine = (str) => {
    if (!str) return '';
    // Parse markdown links [text](url) -> <a href="url" target="_blank" rel="noopener noreferrer">text ↗</a>
    let parsed = str.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:underline font-semibold inline-flex items-center gap-0.5">$1 ↗</a>'
    );
    // Parse **bold** -> <strong class="text-cyan-300 font-bold">$1</strong>
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300 font-bold">$1</strong>');
    return parsed;
  };

  const renderFormattedMarkdown = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();

      if (!trimmed) return <div key={idx} className="h-2" />;

      if (trimmed === '---') {
        return <hr key={idx} className="border-slate-800 my-4" />;
      }

      // Main Section Header (###)
      if (trimmed.startsWith('###')) {
        const title = trimmed.replace(/^###\s*/, '');
        const isResourceHeader = title.includes('Resources');
        return (
          <div key={idx} className="pt-4 pb-2 border-b border-slate-800/80 mb-3 flex items-center gap-2">
            {isResourceHeader ? (
              <BookOpen className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
            )}
            <h3 className="text-lg font-extrabold text-white">{title}</h3>
          </div>
        );
      }

      // Sub Section Header (####)
      if (trimmed.startsWith('####')) {
        const title = trimmed.replace(/^####\s*/, '');
        return (
          <div key={idx} className="pt-3 pb-1 mt-2 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
            <h4 className="text-base font-bold text-slate-100">{title}</h4>
          </div>
        );
      }

      // Bullet points (- or *)
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const content = trimmed.replace(/^[-*]\s*/, '');
        return (
          <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-300 ml-2 mb-2 leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
            <div dangerouslySetInnerHTML={{ __html: parseFormattedLine(content) }} />
          </div>
        );
      }

      // Ordered list items (1. 2. 3.)
      if (/^\d+\.\s/.test(trimmed)) {
        const content = trimmed.replace(/^\d+\.\s*/, '');
        const numMatch = trimmed.match(/^\d+/);
        const num = numMatch ? numMatch[0] : '1';
        return (
          <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-300 ml-2 mb-2 leading-relaxed">
            <span className="w-5 h-5 rounded-lg bg-slate-800 text-cyan-400 font-mono text-xs flex items-center justify-center shrink-0 font-bold">
              {num}
            </span>
            <div dangerouslySetInnerHTML={{ __html: parseFormattedLine(content) }} />
          </div>
        );
      }

      return (
        <p key={idx} className="text-sm text-slate-300 leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: parseFormattedLine(trimmed) }} />
      );
    });
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
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:underline font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Main Scorecard Banner */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 uppercase">
              Official Assessment Scorecard
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{test?.title || 'CBT Assessment'}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Submitted on {new Date(attempt.submittedAt).toLocaleString()}
            </p>
          </div>

          <Link
            to={`/test/${test?._id}`}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retake Exam</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center">
            <div className="text-xs text-slate-400 mb-1">Final Score</div>
            <div className="text-2xl font-mono font-extrabold text-cyan-400">
              {attempt.score} <span className="text-xs text-slate-500">/ {attempt.maxScore}</span>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center">
            <div className="text-xs text-slate-400 mb-1">Accuracy</div>
            <div className="text-2xl font-mono font-extrabold text-emerald-400">
              {attempt.accuracy}%
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center">
            <div className="text-xs text-slate-400 mb-1">Percentile</div>
            <div className="text-2xl font-mono font-extrabold text-purple-400">
              {myStats ? `${myStats.percentile}%` : 'N/A'}
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center">
            <div className="text-xs text-slate-400 mb-1">Time Spent</div>
            <div className="text-2xl font-mono font-extrabold text-amber-400">
              {Math.floor(attempt.timeSpentSeconds / 60)}m {attempt.timeSpentSeconds % 60}s
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-center col-span-2 sm:col-span-1">
            <div className="text-xs text-slate-400 mb-1">Tab Switches</div>
            <div className={`text-2xl font-mono font-extrabold ${attempt.tabSwitches > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {attempt.tabSwitches}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
        <button
          onClick={() => handleTabChange('review')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'review'
              ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Question Answer Key & Explanations</span>
        </button>

        <button
          onClick={() => handleTabChange('ai-plan')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'ai-plan'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-300" />
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
                  className={`glass-card rounded-2xl p-6 border transition-all ${
                    q.status === 'correct'
                      ? 'border-emerald-500/30'
                      : q.status === 'incorrect'
                      ? 'border-rose-500/30'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800/80">
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      Question {q.order}
                    </span>

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

      {/* TAB 2: AI Revision Plan */}
      {activeTab === 'ai-plan' && (
        <div className="glass-card rounded-3xl p-8 border border-purple-500/30 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Personalized Revision Plan & Resources</h3>
              <p className="text-xs text-slate-400">Synthesized based on your performance, missed concepts, and curated learning materials</p>
            </div>
          </div>

          {loadingAI ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-slate-400">Generating AI Tutor recommendations and study links...</p>
            </div>
          ) : (
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80 space-y-2 shadow-inner">
              {renderFormattedMarkdown(revisionPlan)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
