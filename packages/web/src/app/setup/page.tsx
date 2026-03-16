"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Database, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, LayoutGrid, Info } from "lucide-react";
import Image from "next/image";

type DatabaseItem = {
  id: string;
  title: string;
  icon: string | null;
  description: string;
};

export default function SetupPage() {
  const [items, setItems] = useState<DatabaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [manualDatabaseId, setManualDatabaseId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/databases", { cache: "no-store" });
        const data = await res.json();
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok)
          throw new Error(data.error ?? "データベース取得に失敗しました");
        if (!cancelled) setItems(data.databases ?? []);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectDatabase = async (databaseId: string) => {
    setSelectingId(databaseId);
    setWarnings([]);
    setError(null);
    setShowWarnings(false);
    try {
      const res = await fetch("/api/databases/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "DB選択に失敗しました");

      const newWarnings = data.warnings ?? [];
      setWarnings(newWarnings);

      if (newWarnings.length === 0) {
        window.location.href = "/";
      } else {
        setShowWarnings(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSelectingId(null);
    }
  };

  const extractDatabaseId = (input: string) => {
    const trimmed = input.trim();
    const match = trimmed.match(/[0-9a-fA-F]{32}/);
    if (match) return match[0];
    return trimmed;
  };

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const databaseId = extractDatabaseId(manualDatabaseId);
    if (!databaseId) {
      setError("Database ID を入力してください");
      return;
    }
    await selectDatabase(databaseId);
  };

  const handleContinue = () => {
    setShowWarnings(false);
    setWarnings([]);
    window.location.href = "/";
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-600">
            <Database size={12} />
            Setup
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Notion データベースを選択
          </h1>
          <p className="max-w-2xl text-base text-slate-500">
            一覧から選択するか、Database ID / URL を直接入力して保存先を設定してください。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <a
            href="https://www.notion.so/my-connections"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md"
          >
            <ExternalLink size={14} className="text-slate-400" />
            Notion設定
          </a>
          <button
             onClick={() => window.location.reload()}
             className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
          >
            <RefreshCw size={14} />
            ページを再読み込み
          </button>
        </div>
      </header>

      <section className="rounded-[2rem] border border-white/20 bg-white/60 p-8 shadow-xl backdrop-blur-xl">
        <h2 className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
          <LayoutGrid size={16} />
          データベースを直接指定
        </h2>
        <form
          onSubmit={(event) => void handleManualSubmit(event)}
          className="relative"
        >
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <input
                id="database-id"
                value={manualDatabaseId}
                onChange={(event) => setManualDatabaseId(event.target.value)}
                placeholder="Database ID または URL を入力…"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-5 text-sm shadow-inner transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={Boolean(selectingId)}
              className="h-14 rounded-2xl bg-blue-600 px-8 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95 disabled:bg-slate-300 sm:w-auto"
            >
              {selectingId ? "設定中…" : "IDで設定"}
            </button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Info size={12} />
            例: 38befc4ff83547e2a94e9332e4a81aa5
          </p>
        </form>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500" />
            <p className="font-bold">{error}</p>
          </div>
        </div>
      )}

      {warnings.length > 0 && showWarnings && (
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-8 shadow-sm">
          <div className="mb-4 flex items-center gap-3 text-amber-900">
            <AlertCircle size={24} className="text-amber-500" />
            <h2 className="text-lg font-bold">プロパティ警告</h2>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-amber-800">
            選択したデータベースに以下のプロパティが不足しています。続行できますが、一部の機能が正常に動作しない可能性があります。
          </p>
          <ul className="mb-8 grid gap-2 sm:grid-cols-2">
            {warnings.map((w) => (
              <li key={w} className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                <span className="h-1 w-1 rounded-full bg-amber-400" />
                {w}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-amber-700"
          >
            <CheckCircle2 size={18} />
            理解して続行
          </button>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
          <Database size={16} />
          利用可能なデータベース
        </h2>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[2.5rem] border border-dashed border-slate-200 bg-slate-50/50 p-16 text-center">
             <Database size={48} className="mx-auto mb-4 text-slate-200" />
             <p className="text-lg font-bold text-slate-400">利用可能なデータベースが見つかりませんでした</p>
             <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
               Notion 側で共有設定を確認するか、上の入力欄から ID を直接入力してください。
             </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5"
              >
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-xl shadow-inner transition-colors group-hover:bg-blue-50">
                    {item.icon &&
                    typeof item.icon === "string" &&
                    item.icon.startsWith("http") ? (
                      <Image src={item.icon} alt={item.title} width={24} height={24} className="h-6 w-6 rounded" />
                    ) : item.icon ? (
                      item.icon
                    ) : (
                      <Database size={20} className="text-slate-400 group-hover:text-blue-500" />
                    )}
                  </div>
                  <h3 className="line-clamp-2 font-bold text-slate-900 leading-tight">
                    {item.title}
                  </h3>
                </div>
                <p className="mb-6 line-clamp-2 text-sm text-slate-500 leading-relaxed">
                  {item.description || "説明なし"}
                </p>
                <div className="mt-auto">
                  <button
                    type="button"
                    onClick={() => void selectDatabase(item.id)}
                    disabled={Boolean(selectingId)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 py-3 text-xs font-bold text-slate-600 transition-all hover:bg-blue-600 hover:text-white disabled:opacity-50"
                  >
                    {selectingId === item.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    {selectingId === item.id ? "設定中…" : "このDBを使用"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
