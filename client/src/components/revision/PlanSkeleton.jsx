import React from 'react';

export const PlanSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-700 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-48 bg-zinc-800 rounded-lg" />
          <div className="h-7 w-28 bg-zinc-800 rounded-full border border-zinc-700" />
        </div>
        <div className="h-4 w-3/4 bg-zinc-800 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[#18181b] border border-zinc-700" />
          ))}
        </div>
      </div>

      {/* Visual Charts Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 rounded-2xl bg-[#121215] border border-zinc-700 p-5 flex flex-col justify-between">
          <div className="h-5 w-36 bg-zinc-800 rounded" />
          <div className="w-32 h-32 rounded-full border-4 border-zinc-800 mx-auto" />
          <div className="h-4 w-48 bg-zinc-800/60 rounded mx-auto" />
        </div>
        <div className="h-64 rounded-2xl bg-[#121215] border border-zinc-700 p-5 flex flex-col justify-between">
          <div className="h-5 w-40 bg-zinc-800 rounded" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-6 bg-zinc-800/50 rounded" />
            ))}
          </div>
          <div className="h-3 w-32 bg-zinc-800/40 rounded" />
        </div>
      </div>

      {/* Weak Concept Cards Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-zinc-800 rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-[#121215] border border-zinc-700 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-52 bg-zinc-800 rounded" />
              <div className="h-5 w-20 bg-zinc-800 rounded-full" />
            </div>
            <div className="h-4 w-full bg-zinc-800/60 rounded" />
            <div className="h-4 w-5/6 bg-zinc-800/60 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};
