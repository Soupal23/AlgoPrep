import React from 'react';
import { Award, Clock, TrendingUp, TrendingDown, Sparkles, CheckCircle2 } from 'lucide-react';

export const PlanSummaryCard = ({ summary, stats }) => {
  if (!summary || !stats) return null;

  const getLevelBadge = (level) => {
    switch (level) {
      case 'mastery':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mastery Level
          </span>
        );
      case 'intermediate':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Intermediate Competency
          </span>
        );
      case 'needs_revision':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60 shadow-sm">
            <Award className="w-3.5 h-3.5" />
            Needs Targeted Revision
          </span>
        );
    }
  };

  const prev = stats.previousAttempt;
  const scoreDiff = prev ? stats.score - prev.score : null;
  const accDiff = prev ? stats.accuracy - prev.accuracy : null;

  return (
    <div className="bg-[#14111f] rounded-3xl p-6 sm:p-7 border border-[#383050] shadow-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#383050]">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-bold block mb-1">
            Diagnostic Verdict
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
            {summary.verdict}
          </h2>
        </div>
        <div>{getLevelBadge(summary.performanceLevel)}</div>
      </div>

      <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
        "{summary.encouragement}"
      </p>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="bg-[#1c1729] rounded-2xl p-3.5 border border-[#383050] text-center">
          <div className="text-[11px] text-slate-400 mb-0.5">Est. Study Time</div>
          <div className="text-xl font-mono font-bold text-amber-400 flex items-center justify-center gap-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>
              {summary.estimatedStudyMinutes >= 60
                ? `${Math.floor(summary.estimatedStudyMinutes / 60)}h ${summary.estimatedStudyMinutes % 60}m`
                : `${summary.estimatedStudyMinutes}m`}
            </span>
          </div>
        </div>

        <div className="bg-[#1c1729] rounded-2xl p-3.5 border border-[#383050] text-center">
          <div className="text-[11px] text-slate-400 mb-0.5">Pace per Question</div>
          <div className="text-xl font-mono font-bold text-cyan-400">
            {stats.avgSecondsPerQuestion > 0 ? `${stats.avgSecondsPerQuestion}s` : 'N/A'}
          </div>
        </div>

        <div className="bg-[#1c1729] rounded-2xl p-3.5 border border-[#383050] text-center">
          <div className="text-[11px] text-slate-400 mb-0.5">Overall Accuracy</div>
          <div className="text-xl font-mono font-bold text-emerald-400">
            {stats.accuracy}%
          </div>
        </div>

        <div className="bg-[#1c1729] rounded-2xl p-3.5 border border-[#383050] text-center">
          <div className="text-[11px] text-slate-400 mb-0.5">Attempt Delta</div>
          {prev ? (
            <div
              className={`text-sm font-mono font-bold flex items-center justify-center gap-1 ${
                scoreDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {scoreDiff >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} pts ({accDiff > 0 ? `+${accDiff}` : accDiff}%)
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-mono pt-1">First Attempt</div>
          )}
        </div>
      </div>
    </div>
  );
};
