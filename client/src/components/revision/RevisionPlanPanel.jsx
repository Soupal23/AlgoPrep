import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { PlanSkeleton } from './PlanSkeleton';
import { PlanSummaryCard } from './PlanSummaryCard';
import { PlanCharts } from './PlanCharts';
import { WeakConceptCard } from './WeakConceptCard';
import { StrengthsList } from './StrengthsList';
import { ResourceItem } from './ResourceItem';
import {
  Sparkles,
  Printer,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Info
} from 'lucide-react';

export const RevisionPlanPanel = ({ attemptId, onJumpToQuestion }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (!attemptId) return;
    loadPlan();
  }, [attemptId]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getAIRevisionPlan(attemptId);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to generate revision plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setShowConfirmModal(false);
    try {
      setRegenerating(true);
      setError('');
      const res = await api.regenerateAIRevisionPlan(attemptId);
      setData(res);
    } catch (err) {
      setError(err.message || 'Regeneration failed. Preserved your existing plan.');
    } finally {
      setRegenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-6">
        <PlanSkeleton />
      </div>
    );
  }

  if (error && !data?.plan) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-[#14111f] rounded-2xl border border-rose-800 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-base font-bold text-white">Revision Plan Unavailable</h3>
        <p className="text-xs text-rose-300">{error}</p>
        <button
          onClick={loadPlan}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Generation</span>
        </button>
      </div>
    );
  }

  const { plan, source, canRegenerate, regenerateCount } = data || {};
  const remainingRegens = Math.max(0, 3 - (regenerateCount || 0));

  // Build lookup map for resources
  const resourcesMap = {};
  (plan?.resources || []).forEach((r) => {
    resourcesMap[r.id] = r;
  });

  return (
    <div className="space-y-7">
      {/* Action Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#383050]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Personalized Revision Diagnostics</span>
              {source === 'ai' && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-950/90 text-purple-300 border border-purple-700/60">
                  AI Synthesized
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Targeted remediation plan, behavioral pattern diagnosis, and curated learning materials
            </p>
          </div>
        </div>

        {/* Buttons (hidden during print) */}
        <div className="flex items-center gap-2.5 no-print">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-[#1c1729] hover:bg-[#251e35] text-slate-300 hover:text-white text-xs font-semibold border border-[#383050] transition-colors flex items-center gap-1.5"
            title="Export or print this revision plan to PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={!canRegenerate || regenerating}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              canRegenerate && !regenerating
                ? 'bg-purple-600/90 hover:bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/20'
                : 'bg-slate-800/60 text-slate-500 border-slate-700 cursor-not-allowed'
            }`}
            title={canRegenerate ? `Regenerate plan with fresh AI reasoning (${remainingRegens} left)` : 'Maximum regenerations reached'}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            <span>{regenerating ? 'Regenerating...' : `Regenerate AI (${remainingRegens} left)`}</span>
          </button>
        </div>
      </div>

      {/* Fallback Notice Banner */}
      {source === 'fallback' && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-3 text-xs text-amber-200">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Deterministic Plan Displayed</span>
            <p className="text-amber-300/80 leading-relaxed">
              AI generation was temporarily unavailable or throttled when this plan was created.
              You can click <strong>Regenerate AI</strong> above whenever you are ready to query the AI tutor model.
            </p>
          </div>
        </div>
      )}

      {/* Regeneration Notice / Error Alert */}
      {error && data?.plan && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/70 flex items-start justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-rose-300">Regeneration Notice</span>
              <p className="text-rose-200/90 leading-relaxed">
                {error.includes('Preserving')
                  ? error
                  : `${error} Your existing plan has been preserved and your regeneration quota was not deducted.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setError('')}
            className="text-rose-400 hover:text-white px-2 py-1 text-xs rounded-lg hover:bg-rose-900/50 transition-colors shrink-0"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* Section 1: Summary Card */}
      <PlanSummaryCard summary={plan?.summary} stats={plan?.stats} />

      {/* Section 2: Visual Charts */}
      <PlanCharts stats={plan?.stats} conceptBreakdown={plan?.conceptBreakdown} />

      {/* Section 3: Weak Concepts Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Targeted Concepts for Remediation</span>
            </h3>
            <p className="text-xs text-slate-400">
              Categorized by misconception trap, prioritized by urgency and recurring frequency
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {plan?.weakConcepts?.length || 0} Areas Identified
          </span>
        </div>

        {plan?.weakConcepts?.length > 0 ? (
          <div className="space-y-3.5">
            {plan.weakConcepts.map((wc, idx) => (
              <WeakConceptCard
                key={idx}
                weakConcept={wc}
                resourcesMap={resourcesMap}
                onJumpToQuestion={onJumpToQuestion}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#14111f] border border-emerald-900/50 text-center space-y-2">
            <p className="text-emerald-300 font-bold text-sm">
              🎉 Zero Weak Concepts Detected!
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              You achieved full mastery across all concepts tested. Continue challenging yourself with advanced modules!
            </p>
          </div>
        )}
      </div>

      {/* Section 4: Demonstrated Strengths */}
      {plan?.strengths?.length > 0 && <StrengthsList strengths={plan.strengths} />}

      {/* Section 5: All Curated Resources */}
      {plan?.resources?.length > 0 && (
        <div className="bg-[#14111f] rounded-3xl p-6 border border-[#383050] space-y-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">All Recommended Study Links</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plan.resources.map((res) => (
              <ResourceItem key={res.id} resource={res} />
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Regeneration */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-md w-full bg-[#14111f] p-6 rounded-2xl border border-[#383050] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-purple-400">
              <Sparkles className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Regenerate Revision Plan?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will make a fresh AI query with the latest behavioral signals.
              You have <strong>{remainingRegens}</strong> regeneration{remainingRegens === 1 ? '' : 's'} remaining for this test attempt.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-[#1c1729] hover:bg-[#251e35] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg"
              >
                Confirm & Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
