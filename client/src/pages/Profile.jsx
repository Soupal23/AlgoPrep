import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { User, Award, Clock, ShieldAlert, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';

export const Profile = () => {
  const [user, setUser] = useState(api.getStoredUser());
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyAttempts();
  }, []);

  const fetchMyAttempts = async () => {
    try {
      setLoading(true);
      const res = await api.getUserAttempts();
      setAttempts(res.attempts || []);
    } catch (err) {
      setError(err.message || 'Failed to load user attempts history');
    } finally {
      setLoading(false);
    }
  };

  const avgAccuracy = attempts.length > 0
    ? Math.round(attempts.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / attempts.length)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Header */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 flex flex-wrap items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-extrabold shadow-lg shadow-cyan-600/30">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">{user?.name || 'Candidate'}</h1>
            <p className="text-xs font-mono text-slate-400 mt-0.5">{user?.email}</p>
            <span className="inline-block mt-2 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase">
              Registered Candidate
            </span>
          </div>
        </div>

        {/* Stats Summary Pill Grid */}
        <div className="flex items-center gap-6 text-center text-xs font-mono">
          <div className="bg-slate-900/80 px-4 py-3 rounded-2xl border border-slate-800">
            <span className="text-slate-500 block">Total Attempted</span>
            <span className="text-lg font-extrabold text-white">{attempts.length}</span>
          </div>
          <div className="bg-slate-900/80 px-4 py-3 rounded-2xl border border-slate-800">
            <span className="text-slate-500 block">Average Accuracy</span>
            <span className="text-lg font-extrabold text-emerald-400">{avgAccuracy}%</span>
          </div>
        </div>
      </div>

      {/* Attempted Tests Section */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400" />
              <span>Attempted Tests History</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Your completed computer science CBT assessments and scorecards</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-slate-400">Loading attempt history...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-300 text-sm">{error}</div>
        ) : attempts.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <p className="text-slate-400 text-sm">You have not completed any test attempts yet.</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold text-sm shadow-md"
            >
              <span>Explore Available Tests</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attempts.map((att) => {
              const testTitle = att.testId?.title || 'CS Test Attempt';
              const testTopic = att.testId?.topic || 'Computer Science';

              return (
                <div
                  key={att._id}
                  className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
                        {testTopic}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(att.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mt-2">{testTitle}</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Score</span>
                      <span className="text-emerald-400 font-bold text-sm">{att.score} / {att.maxScore}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Accuracy</span>
                      <span className="text-cyan-400 font-bold text-sm">{att.accuracy}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Time</span>
                      <span className="text-amber-400 font-bold text-sm">{Math.floor(att.timeSpentSeconds / 60)}m</span>
                    </div>
                  </div>

                  <Link
                    to={`/results/${att._id}`}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>View Scorecard & Review</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
