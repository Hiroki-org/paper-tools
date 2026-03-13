export function PaperSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="flex justify-between">
        <div className="h-10 w-24 rounded-xl bg-slate-200" />
        <div className="h-10 w-48 rounded-xl bg-slate-200" />
      </div>

      <div className="space-y-6">
        <div className="h-12 w-3/4 rounded-2xl bg-slate-200" />
        <div className="flex gap-4">
          <div className="h-5 w-32 rounded-lg bg-slate-100" />
          <div className="h-5 w-32 rounded-lg bg-slate-100" />
          <div className="h-5 w-32 rounded-lg bg-slate-100" />
        </div>
      </div>

      <div className="h-32 w-full rounded-2xl bg-blue-50/50" />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 h-7 w-24 rounded bg-slate-200" />
          <div className="h-64 w-full rounded-2xl bg-slate-100" />
        </div>
        <div className="space-y-6">
          <div className="h-48 w-full rounded-2xl bg-slate-100" />
          <div className="space-y-3">
            <div className="h-10 w-full rounded-xl bg-slate-200" />
            <div className="h-10 w-full rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
