"use client";

export function PaperSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-3/4 rounded bg-slate-200" />
      <div className="h-4 w-1/2 rounded bg-slate-200" />
      <div className="h-20 w-full rounded bg-slate-200" />
      <div className="h-32 w-full rounded bg-slate-200" />
    </div>
  );
}
