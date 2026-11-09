import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Clock, HelpCircle, Award, Sparkles, Play, Shield, Cpu, Network, Database, Code, BookOpen, CheckCircle2, RotateCcw, Layers, UserCheck } from 'lucide-react';

const FILTERS = [
  { id: 'All', label: 'All Tests', icon: Layers },
  { id: 'Platform Tests', label: 'Platform Tests', icon: Shield },
  { id: 'AI Tests', label: 'Quick Quiz (AI)', icon: Sparkles },
  { id: 'Attempted Tests', label: 'Attempted Tests', icon: Award }
];

export const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialFilterParam = searchParams.get('filter');
  const getInitialFilter = () => {
    if (initialFilterParam === 'attempted' || initialFilterParam === 'Attempted Tests') {
      return 'Attempted Tests';
    }
    return 'All';
  };

  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [attemptedTestIds, setAttemptedTestIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState(getInitialFilter);
  const [error, setError] = useState('');

  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'attempted' || filterParam === 'Attempted Tests') {
      setSelectedFilter('Attempted Tests');
    }
  }, [searchParams]);

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
      const userAttempts = attemptsRes.attempts || [];
      setAttempts(userAttempts);

      const attemptedIds = new Set(userAttempts.map(a => a.testId?._id || a.testId));
      setAttemptedTestIds(attemptedIds);
    } catch (err) {
      setError(err.message || 'Failed to load available tests');
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter((t) => {
    if (selectedFilter === 'Platform Tests') return t.kind === 'platform' || (!t.isAIGenerated && !t.ownerId);
    if (selectedFilter === 'AI Tests') return t.kind === 'quick' || Boolean(t.isAIGenerated);
    return true;
  });

  const getFilterCount = (filterId) => {
    if (filterId === 'Platform Tests') return tests.filter((t) => t.kind === 'platform' || (!t.isAIGenerated && !t.ownerId)).length;
    if (filterId === 'AI Tests') return tests.filter((t) => t.kind === 'quick' || Boolean(t.isAIGenerated)).length;
    if (filterId === 'Attempted Tests') return attempts.length;
    return tests.length;
  };

  const getTopicIcon = (topic) => {
    switch (topic) {
      case 'Operating Systems': return <Cpu className="w-5 h-5 text-zinc-400" />;
      case 'Computer Networks': return <Network className="w-5 h-5 text-zinc-400" />;
      case 'DBMS': return <Database className="w-5 h-5 text-zinc-400" />;
      case 'Data Structures & Algorithms': return <Code className="w-5 h-5 text-zinc-400" />;
      case 'Object-Oriented Programming': return <BookOpen className="w-5 h-5 text-zinc-400" />;
      default: return <Sparkles className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getTestTypeInfo = (test) => {
    if (test.isAIGenerated) {
      return {
        label: 'AI Test',
        icon: Sparkles,
        colorClass: 'bg-[#18181b] border-[#27272a] text-zinc-300'
      };
    }
    if (test.teacherId) {
      return {
        label: 'Teacher Test',
        icon: UserCheck,
        colorClass: 'bg-[#18181b] border-[#27272a] text-zinc-300'
      };
    }
    return {
      label: 'Platform Test',
      icon: Shield,
      colorClass: 'bg-[#18181b] border-[#27272a] text-zinc-300'
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#27272a] pb-4">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const count = getFilterCount(f.id);
          const isActive = selectedFilter === f.id;

          return (
            <button
              key={f.id}
              onClick={() => {
                setSelectedFilter(f.id);
                if (f.id === 'Attempted Tests') {
                  setSearchParams({ filter: 'attempted' });
                } else {
                  setSearchParams({});
                }
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${
                  isActive ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Test Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-[#121215] border border-[#27272a] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-[#121215] rounded-2xl border border-rose-900/40 text-rose-300 space-y-4">
          <p>{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-5 py-2 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-black transition-colors cursor-pointer"
          >
            Retry Now
          </button>
        </div>
      ) : selectedFilter === 'Attempted Tests' ? (
        attempts.length === 0 ? (
          <div className="p-12 text-center bg-[#121215] rounded-2xl border border-[#27272a] text-zinc-500 space-y-3">
            <Award className="w-10 h-10 text-zinc-400 mx-auto" />
            <h3 className="text-base font-bold text-white">No Attempted Tests Yet</h3>
            <button
              onClick={() => setSelectedFilter('All')}
              className="mt-2 px-5 py-2 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-black transition-colors cursor-pointer"
            >
              Browse Tests
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {attempts.map((att) => {
              const testObj =
                typeof att.testId === 'object' && att.testId !== null
                  ? att.testId
                  : tests.find((t) => t._id === att.testId) || {};
              const testTitle = testObj.title || 'Assessment Test';
              const testId = testObj._id || att.testId;

              return (
                <div
                  key={att._id}
                  className="bg-[#121215] rounded-2xl p-6 border border-[#27272a] hover:border-zinc-700 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-base font-bold text-white mb-4 line-clamp-2" title={testTitle}>
                      {testTitle}
                    </h3>

                    {/* Test Details */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#18181b] border border-[#27272a] mb-5 text-center text-xs">
                      <div>
                        <div className="text-zinc-500 text-[10px] uppercase font-mono">Score</div>
                        <div className="font-mono font-bold text-white mt-0.5">
                          {att.score} <span className="text-[10px] text-zinc-500">/{att.maxScore}</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-zinc-500 text-[10px] uppercase font-mono">Time</div>
                        <div className="font-mono font-bold text-white mt-0.5">
                          {Math.floor((att.totalTimeSpentSeconds || att.timeSpentSeconds || 0) / 60)}m
                        </div>
                      </div>

                      <div>
                        <div className="text-zinc-500 text-[10px] uppercase font-mono">Accuracy</div>
                        <div className="font-mono font-bold text-white mt-0.5">
                          {att.accuracy}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Retake / Review Button */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/test/${testId}?retake=true`)}
                      className="py-2 rounded-full font-semibold border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake</span>
                    </button>

                    <button
                      onClick={() => navigate(`/results/${att._id}`)}
                      className="py-2 rounded-full font-semibold bg-white hover:bg-zinc-200 text-black transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : filteredTests.length === 0 ? (
        <div className="p-12 text-center bg-[#121215] rounded-2xl border border-[#27272a] text-zinc-500">
          No tests found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTests.map((test) => {
            const isAttempted = attemptedTestIds.has(test._id);

            return (
              <div
                key={test._id}
                className="bg-[#121215] rounded-2xl p-6 border border-[#27272a] hover:border-zinc-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-base font-bold text-white mb-4 line-clamp-2" title={test.title}>
                    {test.title}
                  </h3>

                  {/* Test Details (Marks, Time, No. of questions) */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#18181b] border border-[#27272a] mb-5 text-center text-xs">
                    <div>
                      <div className="text-zinc-500 text-[10px] uppercase font-mono">Marks</div>
                      <div className="font-mono font-bold text-white mt-0.5">
                        +{test.markingScheme?.correct} / {test.markingScheme?.incorrect}
                      </div>
                    </div>

                    <div>
                      <div className="text-zinc-500 text-[10px] uppercase font-mono">Time</div>
                      <div className="font-mono font-bold text-white mt-0.5">
                        {test.timeLimitMinutes}m
                      </div>
                    </div>

                    <div>
                      <div className="text-zinc-500 text-[10px] uppercase font-mono">Questions</div>
                      <div className="font-mono font-bold text-white mt-0.5">
                        {test.totalQuestions}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Start / Retake Button */}
                <button
                  onClick={() => navigate(`/test/${test._id}${isAttempted ? '?retake=true' : ''}`)}
                  className={`w-full py-2.5 rounded-full font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                    isAttempted
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                      : 'bg-white hover:bg-zinc-200 text-black'
                  }`}
                >
                  {isAttempted ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake Test</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Test</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

