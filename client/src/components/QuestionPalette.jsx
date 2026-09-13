import React from 'react';
import { Check } from 'lucide-react';

export const QuestionPalette = ({
  questions,
  currentIndex,
  questionStates,
  onSelectQuestion
}) => {
  const getStatusColor = (qId, isSelected) => {
    const status = questionStates[qId] || 'unvisited';
    let base = '';

    switch (status) {
      case 'answered':
        base = 'bg-emerald-950/80 border-emerald-500 text-emerald-300 hover:bg-emerald-900';
        break;
      case 'not_answered':
        base = 'bg-rose-950/80 border-rose-600 text-rose-300 hover:bg-rose-900';
        break;
      case 'marked':
        base = 'bg-purple-950/80 border-purple-500 text-purple-300 hover:bg-purple-900';
        break;
      case 'answered_marked':
        base = 'bg-purple-950/90 border-purple-400 text-purple-200 hover:bg-purple-900';
        break;
      case 'unvisited':
      default:
        base = 'bg-[#251e35] border-[#383050] text-[#9f99b0] hover:bg-[#3a2f50]';
        break;
    }

    if (isSelected) {
      return `${base} ring-2 ring-purple-400 ring-offset-2 ring-offset-[#0a0a0f] font-extrabold z-10`;
    }
    return base;
  };

  const counts = questions.reduce(
    (acc, q) => {
      const st = questionStates[q._id] || 'unvisited';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    { unvisited: 0, not_answered: 0, answered: 0, marked: 0, answered_marked: 0 }
  );

  return (
    <div className="glass-card rounded-2xl p-5 border border-[#383050] bg-[#1c1729] flex flex-col h-full">
      <h3 className="text-sm font-semibold text-[#f0eef5] uppercase tracking-wider mb-4 pb-2 border-b border-[#383050] flex items-center justify-between">
        <span>Question Palette</span>
        <span className="text-xs font-mono text-purple-400">{questions.length} Questions</span>
      </h3>

      <div className="grid grid-cols-5 gap-2.5 mb-6 overflow-y-auto max-h-72 p-1">
        {questions.map((q, idx) => {
          const st = questionStates[q._id] || 'unvisited';
          const isSelected = idx === currentIndex;
          const isAnsweredAndMarked = st === 'answered_marked';

          return (
            <button
              key={q._id}
              onClick={() => onSelectQuestion(idx)}
              className={`relative h-11 w-full rounded-xl border text-sm font-medium transition-all flex items-center justify-center shadow-sm ${getStatusColor(
                q._id,
                isSelected
              )}`}
            >
              <span>{idx + 1}</span>
              {isAnsweredAndMarked && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center border border-[#0a0a0f]">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-[#383050] space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-400" />
            <span className="text-[#9f99b0]">Answered</span>
          </div>
          <span className="font-mono font-semibold text-emerald-400">{counts.answered}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-400" />
            <span className="text-[#9f99b0]">Not Answered</span>
          </div>
          <span className="font-mono font-semibold text-rose-400">{counts.not_answered}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500 border border-purple-400" />
            <span className="text-[#9f99b0]">Marked for Review</span>
          </div>
          <span className="font-mono font-semibold text-purple-400">{counts.marked}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500 border border-purple-400 flex items-center justify-center">
              <Check className="w-2 h-2 text-white stroke-[3]" />
            </span>
            <span className="text-[#9f99b0]">Answered & Marked</span>
          </div>
          <span className="font-mono font-semibold text-purple-300">{counts.answered_marked}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#251e35] border border-[#383050]" />
            <span className="text-[#6b6380]">Not Visited</span>
          </div>
          <span className="font-mono font-semibold text-[#6b6380]">{counts.unvisited}</span>
        </div>
      </div>
    </div>
  );
};
