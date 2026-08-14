import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const TabSwitchWarning = ({ isOpen, switchCount, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-rose-500/30 shadow-2xl shadow-rose-950/50">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mb-4 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-extrabold text-center text-white mb-2">
          Warning: Tab Switch Detected!
        </h3>

        <p className="text-sm text-slate-300 text-center mb-4">
          You navigated away from the exam window or switched tabs. This activity has been recorded in your official attempt record.
        </p>

        <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-center mb-6">
          <span className="text-xs text-slate-400">Total Tab Switch Warnings: </span>
          <span className="text-sm font-mono font-bold text-rose-400">{switchCount}</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-600/30 hover:opacity-90 transition-opacity"
        >
          I Understand & Return to Exam
        </button>
      </div>
    </div>
  );
};
