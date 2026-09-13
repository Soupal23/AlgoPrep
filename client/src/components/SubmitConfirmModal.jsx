import React from 'react';
import { Send, AlertCircle, CheckCircle2, Bookmark, HelpCircle } from 'lucide-react';

export const SubmitConfirmModal = ({
  isOpen,
  totalQuestions,
  questionStates,
  onConfirm,
  onCancel,
  isSubmitting
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0f]/90 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel max-w-lg w-full rounded-2xl p-6 border border-[#2a2240] shadow-xl bg-[#14111f]">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#2a2240]">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#f0eef5]">Confirm Test Submission</h3>
            <p className="text-xs text-[#9f99b0]">Are you sure you want to finish and submit your attempt?</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#1c1729] rounded-xl p-3 border border-[#2a2240] text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <div className="text-xs text-[#9f99b0]">Answered</div>
            <div className="text-lg font-mono font-bold text-emerald-400">{answeredCount}</div>
          </div>

          <div className="bg-[#1c1729] rounded-xl p-3 border border-[#2a2240] text-center">
            <Bookmark className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <div className="text-xs text-[#9f99b0]">Marked</div>
            <div className="text-lg font-mono font-bold text-purple-400">{markedCount}</div>
          </div>

          <div className="bg-[#1c1729] rounded-xl p-3 border border-[#2a2240] text-center">
            <HelpCircle className="w-5 h-5 text-rose-400 mx-auto mb-1" />
            <div className="text-xs text-[#9f99b0]">Unattempted</div>
            <div className="text-lg font-mono font-bold text-rose-400">{unattemptedCount}</div>
          </div>
        </div>

        {unattemptedCount > 0 && (
          <div className="flex items-center gap-2 p-3 mb-6 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>You still have {unattemptedCount} unattempted questions! Unattempted questions yield 0 points.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#9f99b0] hover:bg-[#1c1729] transition-colors"
          >
            Continue Exam
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>Submitting...</span>
            ) : (
              <>
                <span>Submit Final Exam</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
