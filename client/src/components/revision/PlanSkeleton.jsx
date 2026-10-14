import React from 'react';

export const PlanSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="p-6 rounded-3xl bg-[#1c1729]/80 border border-[#383050] space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-48 bg-slate-800 rounded-lg" />
          <div className="h-7 w-28 bg-purple-950/60 rounded-full border border-purple-800/40" />
        </div>
        <div className="h-4 w-3/4 bg-slate-800 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-900/60 border border-slate-800" />
          ))}
        </div>
      </div>

      {/* Visual Charts Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 rounded-2xl bg-[#1c1729]/60 border border-[#383050] p-4 flex flex-col justify-between">
          <div className="h-5 w-36 bg-slate-800 rounded" />
          <div className="w-32 h-32 rounded-full border-4 border-slate-800 mx-auto" />
          <div className="h-4 w-48 bg-slate-800/60 rounded mx-auto" />
        </div>
        <div className="h-64 rounded-2xl bg-[#1c1729]/60 border border-[#383050] p-4 flex flex-col justify-between">
          <div className="h-5 w-40 bg-slate-800 rounded" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-6 bg-slate-800/50 rounded" />
            ))}
          </div>
          <div className="h-3 w-32 bg-slate-800/40 rounded" />
        </div>
      </div>

      {/* Weak Concept Cards Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-slate-800 rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-[#1c1729]/60 border border-[#383050] space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-52 bg-slate-800 rounded" />
              <div className="h-5 w-20 bg-slate-800 rounded-full" />
            </div>
            <div className="h-4 w-full bg-slate-900 rounded" />
            <div className="h-4 w-5/6 bg-slate-900 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};
