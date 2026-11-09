import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Zap,
  Bookmark,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { ResourceItem } from './ResourceItem';

export const WeakConceptCard = ({ weakConcept, resourcesMap = {}, onJumpToQuestion }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!weakConcept) return null;

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-950/70 text-rose-300 border border-rose-800">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-950/70 text-amber-300 border border-amber-800">
            Medium Priority
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
            Low Priority
          </span>
        );
    }
  };

  const getIssueTypeBadge = (type) => {
    switch (type) {
      case 'careless':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold font-mono">
            <Zap className="w-3 h-3" />
            Careless / Rushed
          </span>
        );
      case 'knowledge_gap':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-300 font-semibold font-mono">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Knowledge Gap
          </span>
        );
      case 'uncertain':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-semibold font-mono">
            <Bookmark className="w-3 h-3" />
            Uncertainty
          </span>
        );
      case 'misconception':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-semibold font-mono">
            <Lightbulb className="w-3 h-3" />
            Misconception Trap
          </span>
        );
    }
  };

  const assignedResources = (weakConcept.resourceIds || [])
    .map((id) => resourcesMap[id])
    .filter(Boolean);

  return (
    <div className="bg-[#121215] rounded-2xl border border-zinc-700 overflow-hidden shadow-sm transition-all hover:border-zinc-500">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 cursor-pointer flex items-center justify-between gap-4 select-none hover:bg-[#18181b]/50 transition-colors"
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-white truncate">
              {weakConcept.concept}
            </h3>
            {getPriorityBadge(weakConcept.priority)}
            {getIssueTypeBadge(weakConcept.issueType)}
          </div>

          {/* Behavioral Signal Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {weakConcept.signals?.includes('fast_wrong') && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-mono border border-zinc-700">
                ⚡ Fast Answer (Potential Guess)
              </span>
            )}
            {weakConcept.signals?.includes('marked_for_review') && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/60 text-amber-400 text-[10px] font-mono border border-amber-900/60">
                🔖 Marked during test
              </span>
            )}
            {weakConcept.recurringCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/60 text-rose-300 text-[10px] font-mono border border-rose-900/60">
                🔁 Recurring in {weakConcept.recurringCount} past tests
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="p-1 rounded-lg text-zinc-400 hover:text-white shrink-0"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 pt-0 space-y-4 border-t border-zinc-700/60">
          {/* Explanation Box */}
          <div className="space-y-2.5 mt-4 text-xs leading-relaxed">
            <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-700 space-y-1.5">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
                Core Theoretical Principle
              </span>
              <p className="text-zinc-300 leading-relaxed">{weakConcept.explanation}</p>
            </div>

            {weakConcept.specificMistake && (
              <div className="p-4 rounded-xl bg-[#18181b] border border-zinc-700 space-y-1.5">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                  Identified Pitfall / Trap
                </span>
                <p className="text-zinc-300 leading-relaxed">{weakConcept.specificMistake}</p>
              </div>
            )}
          </div>

          {/* Missed Questions Jump Buttons */}
          {weakConcept.questionOrders && weakConcept.questionOrders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-zinc-400 font-mono text-[11px]">Related Questions:</span>
              {weakConcept.questionOrders.map((ord) => (
                <button
                  key={ord}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onJumpToQuestion) onJumpToQuestion(ord);
                  }}
                  className="px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:border-amber-500 font-mono font-bold text-[11px] transition-all flex items-center gap-1 group cursor-pointer"
                >
                  <span>Q{ord}</span>
                  <ArrowRight className="w-3 h-3 text-zinc-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          )}

          {/* Curated Resources */}
          {assignedResources.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono block">
                Recommended Remediation Links
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {assignedResources.map((res) => (
                  <ResourceItem key={res.id} resource={res} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
