"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, CheckCircle2, AlertCircle } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/databases", { cache: "no-store" });
        const data = await res.json();
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

  const hasItems = useMemo(() => items.length > 0, [items]);

  const selectDatabase = async (databaseId: string) => {
    setSelectingId(databaseId);
    setWarnings([]);
    setError(null);
    try {
      const res = await fetch("/api/databases/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "DB選択に失敗しました");
      setWarnings(data.warnings ?? []);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notion データベースを選択</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          OAuth で許可されたデータベースから、論文保存先を選択してください。
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <AlertCircle size={16} /> プロパティ警告
          </div>
          <ul className="list-inside list-disc space-y-1">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {loading && (
        <p className="text-sm text-[var(--color-text-muted)]">読み込み中…</p>
      )}

      {!loading && !hasItems && (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          共有済みデータベースが見つかりませんでした。Notion 側で Integration
          を対象DBに接続してください。
        </div>
      )}

      {hasItems && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-md bg-slate-100 p-2 text-sm">
                  {item.icon ?? <Database size={16} />}
                </div>
                <h2 className="font-semibold">{item.title}</h2>
              </div>
              <p className="mb-3 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                {item.description || "説明なし"}
              </p>
              <button
                type="button"
                onClick={() => void selectDatabase(item.id)}
                disabled={Boolean(selectingId)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                {selectingId === item.id ? "設定中…" : "このDBを使用"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
