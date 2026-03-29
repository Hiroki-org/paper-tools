import { LibraryBig, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/70 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:shadow-blue-500/10">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white">
          <div className="mb-6 inline-flex rounded-2xl bg-white/20 p-3 backdrop-blur-md ring-1 ring-white/30">
            <LibraryBig size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Paper Tools</h1>
          <p className="mt-2 text-blue-100">
            Research faster with Notion & AI.
          </p>
        </div>

        <div className="p-10">
          <div className="mb-8 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <ShieldCheck className="mt-0.5 text-blue-500" size={18} />
              <div>
                <p className="text-sm font-bold text-slate-800">Secure connection</p>
                <p className="text-xs leading-relaxed text-slate-500">
                  Notion Official API (OAuth 2.0) を使用します。
                  認証情報は HttpOnly Cookie で安全に保護されます。
                </p>
              </div>
            </div>
          </div>

          <a
            href="/api/auth/notion"
            className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-slate-900 px-6 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95"
          >
            <div className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-1">
              Notion と接続して始める
              <ArrowRight size={18} />
            </div>
          </a>

          <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Powered by Semantic Scholar API
          </p>
        </div>
      </div>

      <div className="mt-8 flex gap-6 text-xs font-medium text-slate-400">
        <a href="/privacy" className="hover:text-slate-600">Privacy Policy</a>
        <a href="/terms" className="hover:text-slate-600">Terms of Service</a>
      </div>
    </div>
  );
}
