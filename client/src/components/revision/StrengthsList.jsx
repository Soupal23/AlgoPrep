import React from 'react';
import { CheckCircle2, Trophy, Compass } from 'lucide-react';

export const StrengthsList = ({ strengths = [] }) => {
  const hasStrengths = Array.isArray(strengths) && strengths.length > 0;

  return (
    <div className="bg-[#121215] rounded-2xl p-6 border border-zinc-700 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-zinc-900 text-emerald-400 border border-zinc-700 flex items-center justify-center">
          <Trophy className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Demonstrated Strengths</h3>
        </div>
      </div>

      {hasStrengths ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {strengths.map((st, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#18181b] text-emerald-400 text-xs font-semibold border border-zinc-700 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{st}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-700 flex items-center gap-2.5 text-xs text-zinc-400 leading-relaxed">
          <Compass className="w-4 h-4 text-zinc-500 shrink-0" />
          <span>
            No 100% mastery concepts identified on this attempt yet. Target your remediation concepts below to turn them into demonstrated strengths!
          </span>
        </div>
      )}
    </div>
  );
};
