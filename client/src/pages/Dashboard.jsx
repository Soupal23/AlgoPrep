import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Clock, HelpCircle, Award, Sparkles, Play, Shield, Cpu, Network, Database, Code, BookOpen, CheckCircle2, RotateCcw } from 'lucide-react';

export const Dashboard = () => {
  const [tests, setTests] = useState([]);
  const [attemptedTestIds, setAttemptedTestIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [testsRes, attemptsRes] = await Promise.all([
        api.getTests(),
        api.getUserAttempts().catch(() => ({ attempts: [] }))
      ]);

      setTests(testsRes.tests || []);

      const attemptedIds = new Set((attemptsRes.attempts || []).map(a => a.testId?._id || a.testId));
      setAttemptedTestIds(attemptedIds);
    } catch (err) {
      setError(err.message || 'Failed to load available tests');
    } finally {
      setLoading(false);
    }
  };

  const topics = ['All', 'Operating Systems', 'Computer Networks', 'DBMS', 'Data Structures & Algorithms', 'Object-Oriented Programming'];

  const filteredTests = selectedTopic === 'All'
    ? tests
    : tests.filter(t => t.topic === selectedTopic);

  const getTopicIcon = (topic) => {
    switch (topic) {
      case 'Operating Systems': return <Cpu className="w-5 h-5 text-cyan-400" />;
      case 'Computer Networks': return <Network className="w-5 h-5 text-indigo-400" />;
      case 'DBMS': return <Database className="w-5 h-5 text-amber-400" />;
      case 'Data Structures & Algorithms': return <Code className="w-5 h-5 text-emerald-400" />;
      case 'Object-Oriented Programming': return <BookOpen className="w-5 h-5 text-purple-400" />;
      default: return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel border border-slate-800 p-8 sm:p-10 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-indigo-950/40 shadow-2xl">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
            <Shield className="w-3.5 h-3.5" />
            <span>Anti-Cheat Proctored CBT Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Computer Science Online Assessment Platform
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Test your core CS fundamentals with timed exam simulation, real-time monotonic state sync, and strict server-authoritative evaluation.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/ai-generate"
              className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm shadow-lg shadow-purple-600/25 hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Custom AI Test</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Topic Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-4">
        {topics.map(t => (
          <button
            key={t}
            onClick={() => setSelectedTopic(t)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedTopic === t
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Test Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl glass-card border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center glass-panel rounded-2xl border border-rose-800/40 text-rose-300">
          {error}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="p-12 text-center glass-panel rounded-2xl border border-slate-800 text-slate-400">
          No tests found for selected topic.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => {
            const isAttempted = attemptedTestIds.has(test._id);

            return (
              <div
                key={test._id}
                className="group glass-card rounded-2xl p-6 border border-slate-800 hover:border-cyan-500/40 transition-all hover:shadow-xl hover:shadow-cyan-950/20 flex flex-col justify-between relative"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      {getTopicIcon(test.topic)}
                    </div>
                    <div className="flex items-center gap-2">
                      {isAttempted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-700 text-emerald-400 uppercase shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Attempted
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full text-xs font-mono bg-slate-900 border border-slate-800 text-cyan-400">
                        {test.topic}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors mb-2">
                    {test.title}
                  </h3>
                  <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed mb-6">
                    {test.description}
                  </p>
                </div>

                <div>
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-6 text-center text-xs">
                    <div>
                      <div className="text-slate-500 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> Time
                      </div>
                      <div className="font-mono font-bold text-slate-200 mt-0.5">
                        {test.timeLimitMinutes}m
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500 flex items-center justify-center gap-1">
                        <HelpCircle className="w-3 h-3" /> Questions
                      </div>
                      <div className="font-mono font-bold text-slate-200 mt-0.5">
                        {test.totalQuestions}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-500 flex items-center justify-center gap-1">
                        <Award className="w-3 h-3" /> Scheme
                      </div>
                      <div className="font-mono font-bold text-emerald-400 mt-0.5">
                        +{test.markingScheme?.correct} / {test.markingScheme?.incorrect}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/test/${test._id}`)}
                    className={`w-full py-3 rounded-xl font-bold border transition-all flex items-center justify-center gap-2 ${
                      isAttempted
                        ? 'bg-slate-800/90 border-cyan-800/60 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-500'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-gradient-to-r hover:from-cyan-600 hover:to-indigo-600 hover:text-white hover:border-transparent group-hover:shadow-lg group-hover:shadow-cyan-600/20'
                    }`}
                  >
                    {isAttempted ? (
                      <>
                        <RotateCcw className="w-4 h-4 text-cyan-400" />
                        <span>Retake CBT Test</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 text-cyan-400 group-hover:text-white" />
                        <span>Start CBT Test</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
