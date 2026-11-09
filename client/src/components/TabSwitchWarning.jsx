import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const TabSwitchWarning = ({
  isOpen,
  switchCount,
  onClose,
  title = 'Tab Switch Detected',
  message = 'You navigated away from the exam window or switched tabs. This activity has been recorded in your attempt record.',
  penaltyMinutes = 10
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="max-w-md w-full rounded-2xl p-6 border border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.25)] bg-[#121215]">
        <div className="w-10 h-10 rounded-full bg-rose-500 text-black flex items-center justify-center mb-4 mx-auto shadow-md">
          <ShieldAlert className="w-5 h-5" />
        </div>

        <h3 className="text-base font-bold text-center text-white mb-2">
          {title}
        </h3>

        <p className="text-xs text-zinc-400 text-center mb-5 leading-relaxed">
          {message}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-rose-950/30 rounded-xl p-3 border border-rose-900/60 text-center">
            <span className="block text-[10px] font-mono uppercase text-rose-400/80 mb-0.5">Time Penalty</span>
            <span className="text-sm font-mono font-bold text-rose-300">
              -{penaltyMinutes} Mins
            </span>
          </div>
          <div className="bg-[#18181b] rounded-xl p-3 border border-zinc-700 text-center">
            <span className="block text-[10px] font-mono uppercase text-zinc-400 mb-0.5">Warnings</span>
            <span className="text-sm font-mono font-bold text-amber-400">{switchCount}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-black shadow-sm transition-colors cursor-pointer"
        >
          Return to Exam
        </button>
      </div>
    </div>
  );
};
