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
        base = 'bg-white border-white text-black font-bold hover:bg-zinc-200';
        break;
      case 'not_answered':
        base = 'bg-zinc-900 border-zinc-600 text-zinc-200 hover:bg-zinc-800';
        break;
      case 'marked':
        base = 'bg-zinc-900 border-zinc-500 text-white hover:bg-zinc-800';
        break;
      case 'answered_marked':
        base = 'bg-white border-white text-black font-bold hover:bg-zinc-200';
        break;
      case 'unvisited':
      default:
        base = 'bg-[#18181b] border-[#27272a] text-zinc-600 hover:text-zinc-400 hover:border-zinc-700';
        break;
    }

    if (isSelected) {
      return `${base} ring-2 ring-white ring-offset-2 ring-offset-[#09090b] font-bold z-10`;
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
    <div className="rounded-2xl p-6 border border-[#27272a] bg-[#121215] flex flex-col h-full shadow-sm">
      <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-[#27272a] flex items-center justify-between">
        <span>Question Palette</span>
        <span className="text-xs font-mono text-zinc-400">{questions.length} Questions</span>
      </h3>

      <div className="grid grid-cols-5 gap-2 mb-6 overflow-y-auto max-h-72 p-1">
        {questions.map((q, idx) => {
          const st = questionStates[q._id] || 'unvisited';
          const isSelected = idx === currentIndex;
          const isAnsweredAndMarked = st === 'answered_marked';

          return (
            <button
              key={q._id}
              onClick={() => onSelectQuestion(idx)}
              className={`relative h-10 w-full rounded-xl border text-xs font-mono font-semibold transition-all flex items-center justify-center cursor-pointer ${getStatusColor(
                q._id,
                isSelected
              )}`}
            >
              <span>{idx + 1}</span>
              {isAnsweredAndMarked && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black rounded-full flex items-center justify-center border border-white">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-[#27272a] space-y-2 text-xs font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-white" />
            <span className="text-zinc-400">Answered</span>
          </div>
          <span className="font-mono font-semibold text-white">{counts.answered}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 border border-zinc-600" />
            <span className="text-zinc-400">Not Answered</span>
          </div>
          <span className="font-mono font-semibold text-zinc-300">{counts.not_answered}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-500" />
            <span className="text-zinc-400">Marked for Review</span>
          </div>
          <span className="font-mono font-semibold text-zinc-300">{counts.marked}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white border border-black flex items-center justify-center">
              <Check className="w-1.5 h-1.5 text-black stroke-[3]" />
            </span>
            <span className="text-zinc-400">Answered & Marked</span>
          </div>
          <span className="font-mono font-semibold text-white">{counts.answered_marked}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#18181b] border border-[#27272a]" />
            <span className="text-zinc-500">Not Visited</span>
          </div>
          <span className="font-mono font-semibold text-zinc-500">{counts.unvisited}</span>
        </div>
      </div>
    </div>
  );
};
