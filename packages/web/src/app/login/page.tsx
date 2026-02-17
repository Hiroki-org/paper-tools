import { LibraryBig, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
      <div className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-[var(--color-primary)]/10 p-2">
            <LibraryBig className="text-[var(--color-primary)]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Paper Tools</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Notion と接続して論文管理を始める</p>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-slate-50 p-3 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-medium">
            <Lock size={16} /> OAuth 2.0 (Notion Public Integration)
          </div>
          <p className="mt-1 text-xs">アクセストークンは HttpOnly Cookie で管理されます。</p>
        </div>

        <a
          href="/api/auth/notion"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          Notion と接続
          <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
}
