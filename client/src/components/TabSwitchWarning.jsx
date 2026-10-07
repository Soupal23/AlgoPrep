import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const TabSwitchWarning = ({
  isOpen,
  switchCount,
  onClose,
  title = 'Warning: Tab Switch Detected!',
  message = 'You navigated away from the exam window or switched tabs. This activity has been recorded in your official attempt record.',
  penaltyMinutes = 10
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0f]/90 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-rose-800 shadow-xl bg-[#14111f]">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mb-4 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-extrabold text-center text-[#f0eef5] mb-2">
          {title}
        </h3>

        <p className="text-sm text-[#9f99b0] text-center mb-4 leading-relaxed">
          {message}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#1c1729] rounded-xl p-3 border border-rose-900/60 text-center">
            <span className="block text-[11px] text-[#9f99b0] mb-0.5">Time Penalty</span>
            <span className="text-sm font-mono font-extrabold text-rose-400">
              -{penaltyMinutes} Mins
            </span>
          </div>
          <div className="bg-[#1c1729] rounded-xl p-3 border border-[#383050] text-center">
            <span className="block text-[11px] text-[#9f99b0] mb-0.5">Total Warnings</span>
            <span className="text-sm font-mono font-bold text-amber-400">{switchCount}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors cursor-pointer"
        >
          I Understand & Return to Exam
        </button>
      </div>
    </div>
  );
};
