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
      case 'Operating Systems': return <Cpu className="w-5 h-5 text-purple-400" />;
      case 'Computer Networks': return <Network className="w-5 h-5 text-purple-400" />;
      case 'DBMS': return <Database className="w-5 h-5 text-purple-400" />;
      case 'Data Structures & Algorithms': return <Code className="w-5 h-5 text-purple-400" />;
      case 'Object-Oriented Programming': return <BookOpen className="w-5 h-5 text-purple-400" />;
      default: return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#14111f] border border-[#2a2240] p-8 sm:p-10 shadow-xl">
        <div className="max-w-3xl space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#f0eef5]">
            Computer Science Assessments
          </h1>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/ai-generate"
              className="px-5 py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-sm shadow-sm transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Custom AI Test</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Topic Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#2a2240] pb-4">
        {topics.map(t => (
          <button
            key={t}
            onClick={() => setSelectedTopic(t)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              selectedTopic === t
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-[#1c1729] border border-[#2a2240] text-[#9f99b0] hover:text-[#f0eef5] hover:bg-[#251e35]'
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
            <div key={i} className="h-64 rounded-2xl bg-[#14111f] border border-[#2a2240] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-[#14111f] rounded-2xl border border-rose-800/40 text-rose-300">
          {error}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="p-12 text-center bg-[#14111f] rounded-2xl border border-[#2a2240] text-[#9f99b0]">
          No tests found for selected topic.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => {
            const isAttempted = attemptedTestIds.has(test._id);

            return (
              <div
                key={test._id}
                className="group bg-[#14111f] rounded-2xl p-6 border border-[#2a2240] hover:border-purple-500/30 transition-colors flex flex-col justify-between relative"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="p-2.5 rounded-xl bg-[#1c1729] border border-[#2a2240]">
                      {getTopicIcon(test.topic)}
                    </div>
                    <div className="flex items-center gap-2">
                      {isAttempted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-700 text-emerald-400 uppercase shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Attempted
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#1c1729] border border-[#2a2240] text-purple-400">
                        {test.topic}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-[#f0eef5] mb-2">
                    {test.title}
                  </h3>
                  <p className="text-[#9f99b0] text-xs line-clamp-3 leading-relaxed mb-6">
                    {test.description}
                  </p>
                </div>

                <div>
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#1c1729] border border-[#2a2240] mb-6 text-center text-xs">
                    <div>
                      <div className="text-[#6b6380] flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> Time
                      </div>
                      <div className="font-mono font-bold text-[#f0eef5] mt-0.5">
                        {test.timeLimitMinutes}m
                      </div>
                    </div>

                    <div>
                      <div className="text-[#6b6380] flex items-center justify-center gap-1">
                        <HelpCircle className="w-3 h-3" /> Questions
                      </div>
                      <div className="font-mono font-bold text-[#f0eef5] mt-0.5">
                        {test.totalQuestions}
                      </div>
                    </div>

                    <div>
                      <div className="text-[#6b6380] flex items-center justify-center gap-1">
                        <Award className="w-3 h-3" /> Scheme
                      </div>
                      <div className="font-mono font-bold text-emerald-400 mt-0.5">
                        +{test.markingScheme?.correct} / {test.markingScheme?.incorrect}
                      </div>
                    </div>
                  </div>

                  {test.isAIGenerated ? (
                    <button
                      onClick={() => navigate(`/test/${test._id}${isAttempted ? '?retake=true' : ''}`)}
                      className={`w-full py-3 rounded-xl font-bold border transition-colors flex items-center justify-center gap-2 ${
                        isAttempted
                          ? 'bg-[#1c1729] border-[#2a2240] text-purple-400 hover:bg-[#251e35]'
                          : 'bg-purple-600 hover:bg-purple-500 border-transparent text-white shadow-sm'
                      }`}
                    >
                      {isAttempted ? (
                        <>
                          <RotateCcw className="w-4 h-4 text-purple-400" />
                          <span>Retake AI CBT Test</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 text-white" />
                          <span>Start AI CBT Test</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => navigate(`/test/${test._id}${isAttempted ? '?retake=true' : ''}`)}
                        className={`py-3 rounded-xl font-bold border text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 ${
                          isAttempted
                            ? 'bg-[#1c1729] border-[#2a2240] text-purple-400 hover:bg-[#251e35]'
                            : 'bg-orange-500 hover:bg-orange-400 border-transparent text-white shadow-sm'
                        }`}
                      >
                        {isAttempted ? (
                          <>
                            <RotateCcw className="w-4 h-4 text-purple-400" />
                            <span>Retake</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 text-white" />
                            <span>Start Test</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => navigate(`/leaderboard?testId=${test._id}`)}
                        className="py-3 rounded-xl font-bold border border-[#2a2240] bg-[#1c1729] text-purple-400 hover:bg-[#251e35] transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm"
                      >
                        <Award className="w-4 h-4 text-purple-400" />
                        <span>Leaderboard</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
