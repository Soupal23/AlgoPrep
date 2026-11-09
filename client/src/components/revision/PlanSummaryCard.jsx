import React from 'react';
import { Award, Clock, TrendingUp, TrendingDown, Sparkles, CheckCircle2 } from 'lucide-react';

export const PlanSummaryCard = ({ summary, stats }) => {
  if (!summary || !stats) return null;

  const getLevelBadge = (level) => {
    switch (level) {
      case 'mastery':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mastery Level
          </span>
        );
      case 'intermediate':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Intermediate
          </span>
        );
      case 'needs_revision':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#18181b] text-zinc-400 border border-zinc-700">
            <Award className="w-3.5 h-3.5 text-zinc-500" />
            Needs Revision
          </span>
        );
    }
  };

  const prev = stats.previousAttempt;
  const scoreDiff = prev ? stats.score - prev.score : null;
  const accDiff = prev ? stats.accuracy - prev.accuracy : null;

  return (
    <div className="bg-[#121215] rounded-2xl p-6 sm:p-7 border border-zinc-700 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-700">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
            {summary.verdict}
          </h2>
        </div>
        <div>{getLevelBadge(summary.performanceLevel)}</div>
      </div>

      <p className="text-xs sm:text-sm text-zinc-300 italic leading-relaxed">
        "{summary.encouragement}"
      </p>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="bg-[#18181b] rounded-xl p-3.5 border border-zinc-700 text-center">
          <div className="text-[10px] uppercase font-mono text-zinc-400 mb-0.5">Est. Study Time</div>
          <div className="text-xl font-mono font-bold text-white flex items-center justify-center gap-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>
              {summary.estimatedStudyMinutes >= 60
                ? `${Math.floor(summary.estimatedStudyMinutes / 60)}h ${summary.estimatedStudyMinutes % 60}m`
                : `${summary.estimatedStudyMinutes}m`}
            </span>
          </div>
        </div>

        <div className="bg-[#18181b] rounded-xl p-3.5 border border-zinc-700 text-center">
          <div className="text-[10px] uppercase font-mono text-zinc-400 mb-0.5">Pace / Question</div>
          <div className="text-xl font-mono font-bold text-white">
            {stats.avgSecondsPerQuestion > 0 ? `${stats.avgSecondsPerQuestion}s` : 'N/A'}
          </div>
        </div>

        <div className="bg-[#18181b] rounded-xl p-3.5 border border-zinc-700 text-center">
          <div className="text-[10px] uppercase font-mono text-zinc-400 mb-0.5">Accuracy</div>
          <div className={`text-xl font-mono font-bold ${
            stats.accuracy >= 70 ? 'text-emerald-400' : stats.accuracy >= 40 ? 'text-amber-400' : 'text-zinc-200'
          }`}>
            {stats.accuracy}%
          </div>
        </div>

        <div className="bg-[#18181b] rounded-xl p-3.5 border border-zinc-700 text-center">
          <div className="text-[10px] uppercase font-mono text-zinc-400 mb-0.5">Attempt Delta</div>
          {prev ? (
            <div className="text-sm font-mono font-bold text-white flex items-center justify-center gap-1">
              <span className={scoreDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} pts ({accDiff > 0 ? `+${accDiff}` : accDiff}%)
              </span>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 font-mono pt-1">First Attempt</div>
          )}
        </div>
      </div>
    </div>
  );
};
