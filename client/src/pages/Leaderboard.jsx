import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Award, Clock, CheckCircle2, User, Trophy, Shield, ChevronLeft, ChevronRight, Filter, ArrowLeft, Sparkles } from 'lucide-react';

export const Leaderboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTestId = searchParams.get('testId') || '';

  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState(initialTestId);
  const [activeTest, setActiveTest] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (selectedTestId) {
      fetchLeaderboard();
    }
  }, [selectedTestId, page]);

  const fetchTests = async () => {
    try {
      const res = await api.getTests();
      const availableTests = (res.tests || []).filter(t => !t.isAIGenerated);
      setTests(availableTests);

      // Auto-select testId from query param or first test in list
      const queryTestId = searchParams.get('testId');
      if (queryTestId && availableTests.some(t => t._id === queryTestId)) {
        setSelectedTestId(queryTestId);
      } else if (availableTests.length > 0) {
        setSelectedTestId(availableTests[0]._id);
        setSearchParams({ testId: availableTests[0]._id }, { replace: true });
      }
    } catch (err) {
      // ignore
    }
  };

  const fetchLeaderboard = async () => {
    if (!selectedTestId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.getLeaderboard(selectedTestId, page, 10);
      setActiveTest(res.test || null);
      setLeaderboard(res.leaderboard || []);
      setTotalParticipants(res.totalParticipants || 0);
      setTotalPages(res.totalPages || 1);
      setMyStats(res.myStats || null);
    } catch (err) {
      setError(err.message || 'Failed to load test leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleTestChange = (testId) => {
    setSelectedTestId(testId);
    setSearchParams({ testId });
    setPage(1);
  };

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 font-bold text-sm shadow-md shadow-amber-500/20">
          🥇 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/20 border border-slate-300/50 text-slate-200 font-bold text-sm shadow-md">
          🥈 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 border border-amber-700/50 text-amber-600 font-bold text-sm shadow-md">
          🥉 3
        </span>
      );
    }
    return (
      <span className="font-mono text-sm text-slate-400 font-semibold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
        #{rank}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:underline font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel border border-slate-800 p-8 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-indigo-950/40 shadow-2xl">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
            <Trophy className="w-3.5 h-3.5" />
            <span>Test-Specific Candidate Rankings</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span>{activeTest?.title || 'Assessment Leaderboard'}</span>
            {activeTest?.isAIGenerated && (
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-purple-950/80 border border-purple-700 text-purple-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" /> Private AI Test
              </span>
            )}
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Ranked candidates for <strong className="text-cyan-400">{activeTest?.topic || 'this test'}</strong>. Equal scores are broken by lower total time spent.
          </p>
        </div>
      </div>

      {/* Filter Bar & My Stats Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Test Filter Dropdown */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select Assessment</span>
          </label>
          <select
            value={selectedTestId}
            onChange={(e) => handleTestChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
          >
            {tests.map((t) => (
              <option key={t._id} value={t._id}>
                {t.title} ({t.topic})
              </option>
            ))}
          </select>
        </div>

        {/* My Performance Card */}
        <div className="lg:col-span-8 glass-card rounded-2xl p-5 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 font-mono uppercase">Your Current Position</span>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-2xl font-extrabold font-mono text-cyan-400">
                {myStats ? `#${myStats.rank}` : 'Not Ranked'}
              </span>
              {myStats && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-800 text-purple-300 font-mono">
                  {myStats.percentile}% Percentile
                </span>
              )}
            </div>
          </div>

          {myStats && (
            <div className="flex items-center gap-6 text-xs font-mono text-slate-300">
              <div>
                <span className="text-slate-500 block">Score</span>
                <span className="text-emerald-400 font-bold text-sm">{myStats.score} / {myStats.maxScore}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Accuracy</span>
                <span className="text-cyan-400 font-bold text-sm">{myStats.accuracy}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">Time</span>
                <span className="text-amber-400 font-bold text-sm">{Math.floor(myStats.timeSpentSeconds / 60)}m {myStats.timeSpentSeconds % 60}s</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Leaderboard Standings</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Total Participants: <span className="text-cyan-400 font-bold">{totalParticipants}</span>
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-slate-400">Calculating rankings via MongoDB aggregation...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-300 text-sm">{error}</div>
        ) : leaderboard.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No submitted test attempts found for selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs font-mono uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Test Title</th>
                  <th className="px-6 py-4 text-center">Score</th>
                  <th className="px-6 py-4 text-center">Accuracy</th>
                  <th className="px-6 py-4 text-center">Time Spent</th>
                  <th className="px-6 py-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaderboard.map((entry) => (
                  <tr key={entry._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{getRankBadge(entry.rank)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-white">{entry.user?.name || 'Candidate'}</div>
                      <div className="text-xs text-slate-500 font-mono">{entry.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-200 text-xs font-medium">{entry.test?.title}</div>
                      <div className="text-[10px] text-cyan-400 font-mono">{entry.test?.topic}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center font-mono font-bold text-emerald-400">
                      {entry.score} <span className="text-xs text-slate-500">/ {entry.maxScore}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center font-mono font-semibold text-cyan-400">
                      {entry.accuracy}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center font-mono text-amber-400">
                      {Math.floor(entry.timeSpentSeconds / 60)}m {entry.timeSpentSeconds % 60}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-slate-400 font-mono">
                      {new Date(entry.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono">
              Page {page} of {totalPages}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
