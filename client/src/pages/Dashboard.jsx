import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Clock, HelpCircle, Award, Sparkles, Play, Shield, Cpu, Network, Database, Code, BookOpen, CheckCircle2, RotateCcw, Layers, UserCheck } from 'lucide-react';

const FILTERS = [
  { id: 'All', label: 'All Tests', icon: Layers },
  { id: 'Platform Tests', label: 'Platform Tests', icon: Shield },
  { id: 'Teacher Tests', label: 'Teacher Tests', icon: UserCheck },
  { id: 'AI Tests', label: 'AI Tests', icon: Sparkles }
];

export const Dashboard = () => {
  const [tests, setTests] = useState([]);
  const [attemptedTestIds, setAttemptedTestIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
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

  const filteredTests = tests.filter((t) => {
    if (selectedFilter === 'Platform Tests') return !t.isAIGenerated && !t.teacherId;
    if (selectedFilter === 'Teacher Tests') return !t.isAIGenerated && Boolean(t.teacherId);
    if (selectedFilter === 'AI Tests') return Boolean(t.isAIGenerated);
    return true;
  });

  const getFilterCount = (filterId) => {
    if (filterId === 'Platform Tests') return tests.filter((t) => !t.isAIGenerated && !t.teacherId).length;
    if (filterId === 'Teacher Tests') return tests.filter((t) => !t.isAIGenerated && Boolean(t.teacherId)).length;
    if (filterId === 'AI Tests') return tests.filter((t) => Boolean(t.isAIGenerated)).length;
    return tests.length;
  };

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

  const getTestTypeInfo = (test) => {
    if (test.isAIGenerated) {
      return {
        label: 'AI Test',
        icon: Sparkles,
        colorClass: 'bg-purple-950/80 border-purple-700 text-purple-300'
      };
    }
    if (test.teacherId) {
      return {
        label: 'Teacher Test',
        icon: UserCheck,
        colorClass: 'bg-indigo-950/80 border-indigo-700 text-indigo-300'
      };
    }
    return {
      label: 'Platform Test',
      icon: Shield,
      colorClass: 'bg-cyan-950/80 border-cyan-800 text-cyan-300'
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#383050] pb-4">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const count = getFilterCount(f.id);
          const isActive = selectedFilter === f.id;

          return (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-[#1c1729] border border-[#383050] text-[#9f99b0] hover:text-[#f0eef5] hover:bg-[#251e35]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-purple-400'}`} />
              <span>{f.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isActive ? 'bg-indigo-700 text-white' : 'bg-[#14111f] border border-[#383050] text-slate-300'
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
            <div key={i} className="h-64 rounded-2xl bg-[#14111f] border border-[#383050] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-[#14111f] rounded-2xl border border-rose-800/40 text-rose-300">
          {error}
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="p-12 text-center bg-[#14111f] rounded-2xl border border-[#383050] text-[#9f99b0]">
          No tests found for {selectedFilter === 'All' ? 'the selected filter' : selectedFilter}.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => {
            const isAttempted = attemptedTestIds.has(test._id);
            const typeInfo = getTestTypeInfo(test);
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={test._id}
                className="group bg-[#14111f] rounded-2xl p-6 border border-[#383050] hover:border-purple-500/30 transition-colors flex flex-col justify-between relative"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="p-2.5 rounded-xl bg-[#1c1729] border border-[#383050]">
                      {getTopicIcon(test.topic)}
                    </div>
                    <div className="flex items-center gap-2">
                      {isAttempted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-700 text-emerald-400 uppercase shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Attempted
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono border ${typeInfo.colorClass}`}>
                        <TypeIcon className="w-3 h-3" />
                        {typeInfo.label}
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
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#1c1729] border border-[#383050] mb-6 text-center text-xs">
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
                          ? 'bg-[#1c1729] border-[#383050] text-purple-400 hover:bg-[#251e35]'
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
                            ? 'bg-[#1c1729] border-[#383050] text-purple-400 hover:bg-[#251e35]'
                            : 'bg-indigo-600 hover:bg-indigo-500 border-transparent text-white shadow-sm'
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
                        className="py-3 rounded-xl font-bold border border-[#383050] bg-[#1c1729] text-purple-400 hover:bg-[#251e35] transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm"
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

