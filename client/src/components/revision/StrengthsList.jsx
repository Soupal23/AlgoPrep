import React from 'react';
import { CheckCircle2, Trophy } from 'lucide-react';

export const StrengthsList = ({ strengths = [] }) => {
  if (!strengths || strengths.length === 0) return null;

  return (
    <div className="bg-[#14111f] rounded-3xl p-6 border border-emerald-900/40 shadow-xl space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Demonstrated Strengths</h3>
          <p className="text-xs text-slate-400">
            Concepts where you achieved 100% mastery on this assessment
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {strengths.map((st, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c1729] text-emerald-300 text-xs font-semibold border border-emerald-800/50 shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{st}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
