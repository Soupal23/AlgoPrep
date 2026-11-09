import React from 'react';
import { Send, AlertCircle, CheckCircle2, Bookmark, HelpCircle } from 'lucide-react';

export const SubmitConfirmModal = ({
  isOpen,
  totalQuestions,
  questionStates,
  onConfirm,
  onCancel,
  isSubmitting,
  statusText
}) => {
  if (!isOpen) return null;

  const counts = Object.values(questionStates).reduce(
    (acc, st) => {
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    { unvisited: 0, not_answered: 0, answered: 0, marked: 0, answered_marked: 0 }
  );

  const answeredCount = (counts.answered || 0) + (counts.answered_marked || 0);
  const markedCount = (counts.marked || 0) + (counts.answered_marked || 0);
  const unattemptedCount = totalQuestions - answeredCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="max-w-md w-full rounded-2xl p-6 border border-zinc-700 shadow-2xl bg-[#121215]">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-zinc-700">
          <div className="w-10 h-10 rounded-full bg-amber-500 text-black flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Submit Exam</h3>
            <p className="text-xs text-zinc-400">Finish and record your official attempt</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <div className="bg-[#18181b] rounded-xl p-3 border border-zinc-700 text-center">
            <div className="text-[10px] font-mono uppercase text-zinc-400">Answered</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">{answeredCount}</div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-3 border border-zinc-700 text-center">
            <div className="text-[10px] font-mono uppercase text-zinc-400">Marked</div>
            <div className="text-lg font-mono font-bold text-amber-400 mt-0.5">{markedCount}</div>
          </div>

          <div className="bg-[#18181b] rounded-xl p-3 border border-zinc-700 text-center">
            <div className="text-[10px] font-mono uppercase text-zinc-400">Unanswered</div>
            <div className="text-lg font-mono font-bold text-zinc-400 mt-0.5">{unattemptedCount}</div>
          </div>
        </div>

        {unattemptedCount > 0 && (
          <div className="flex items-center gap-2.5 p-3 mb-5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{unattemptedCount} unanswered questions yield 0 points.</span>
          </div>
        )}

        {statusText && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-[#18181b] border border-zinc-700 text-zinc-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-zinc-400" />
            <span>{statusText}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-full text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Submitting...</span>
            ) : (
              <>
                <span>Confirm &amp; Submit</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
